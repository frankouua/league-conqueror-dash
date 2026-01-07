import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calendar, Target, Gift, Users, TrendingUp, Send,
  Loader2, CheckCircle, Clock, ArrowRight, Megaphone,
  Sparkles, AlertCircle, DollarSign, BarChart3
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { format, differenceInDays, isAfter, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  campaign_type: string;
  start_date: string;
  end_date: string;
  goal_description: string | null;
  goal_value: number | null;
  goal_metric: string | null;
  is_active: boolean;
  prize_description: string | null;
  prize_value: number | null;
}

interface CRMLead {
  id: string;
  name: string;
  stage_id: string;
  pipeline_id: string;
  estimated_value: number | null;
  tags: string[] | null;
  created_at: string;
}

export function CRMCampaignIntegration() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  // Fetch active campaigns
  const { data: campaigns = [], isLoading: loadingCampaigns } = useQuery({
    queryKey: ['crm-active-campaigns'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('is_active', true)
        .eq('is_template', false)
        .gte('end_date', today)
        .order('start_date', { ascending: true });
      if (error) throw error;
      return data as Campaign[];
    },
  });

  // Fetch leads for selected campaign
  const { data: eligibleLeads = [], isLoading: loadingLeads } = useQuery({
    queryKey: ['crm-leads-for-campaign', selectedCampaign?.id],
    queryFn: async () => {
      if (!selectedCampaign) return [];
      
      // Get all active leads
      const { data, error } = await supabase
        .from('crm_leads')
        .select('id, name, stage_id, pipeline_id, estimated_value, tags, created_at')
        .is('won_at', null)
        .is('lost_at', null)
        .order('estimated_value', { ascending: false });
      
      if (error) throw error;
      return data as CRMLead[];
    },
    enabled: !!selectedCampaign,
  });

  // Fetch campaign stats from CRM
  const { data: campaignStats = {} } = useQuery({
    queryKey: ['crm-campaign-stats'],
    queryFn: async () => {
      const { data: leads } = await supabase
        .from('crm_leads')
        .select('tags, contract_value, won_at')
        .not('tags', 'is', null);
      
      const stats: Record<string, { leads: number; value: number; won: number }> = {};
      
      leads?.forEach(lead => {
        const tags = lead.tags as string[];
        tags?.forEach(tag => {
          if (tag.startsWith('campanha:')) {
            const campaignId = tag.replace('campanha:', '');
            if (!stats[campaignId]) {
              stats[campaignId] = { leads: 0, value: 0, won: 0 };
            }
            stats[campaignId].leads++;
            if (lead.won_at) {
              stats[campaignId].won++;
              stats[campaignId].value += lead.contract_value || 0;
            }
          }
        });
      });
      
      return stats;
    },
  });

  // Associate leads with campaign
  const associateLeads = useMutation({
    mutationFn: async ({ campaignId, leadIds }: { campaignId: string; leadIds: string[] }) => {
      const campaignTag = `campanha:${campaignId}`;
      
      for (const leadId of leadIds) {
        const { data: lead } = await supabase
          .from('crm_leads')
          .select('tags')
          .eq('id', leadId)
          .single();
        
        const currentTags = (lead?.tags as string[]) || [];
        if (!currentTags.includes(campaignTag)) {
          await supabase
            .from('crm_leads')
            .update({ tags: [...currentTags, campaignTag] })
            .eq('id', leadId);
          
          // Add history entry
          await supabase
            .from('crm_lead_history')
            .insert({
              lead_id: leadId,
              action_type: 'campaign_associated',
              title: 'Associado à campanha',
              description: `Lead associado à campanha: ${selectedCampaign?.name}`,
              performed_by: user?.id || '',
            });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm-campaign-stats'] });
      toast.success(`${selectedLeads.length} leads associados à campanha!`);
      setSelectedLeads([]);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const getCampaignStatus = (campaign: Campaign) => {
    const today = new Date();
    const start = new Date(campaign.start_date);
    const end = new Date(campaign.end_date);
    
    if (isBefore(today, start)) {
      return { label: 'Agendada', color: 'bg-blue-500' };
    } else if (isAfter(today, end)) {
      return { label: 'Encerrada', color: 'bg-gray-500' };
    } else {
      const daysLeft = differenceInDays(end, today);
      if (daysLeft <= 3) {
        return { label: `${daysLeft}d restantes`, color: 'bg-orange-500' };
      }
      return { label: 'Ativa', color: 'bg-emerald-500' };
    }
  };

  const getCampaignProgress = (campaign: Campaign) => {
    const stats = campaignStats[campaign.id];
    if (!stats || !campaign.goal_value) return 0;
    
    if (campaign.goal_metric === 'currency') {
      return Math.min(100, (stats.value / campaign.goal_value) * 100);
    }
    return Math.min(100, (stats.won / campaign.goal_value) * 100);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const toggleLead = (leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const isLeadInCampaign = (lead: CRMLead, campaignId: string) => {
    return lead.tags?.includes(`campanha:${campaignId}`);
  };

  return (
    <div className="space-y-6">
      {/* Active Campaigns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loadingCampaigns ? (
          <div className="col-span-full flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : campaigns.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Nenhuma campanha ativa</h3>
              <p className="text-muted-foreground text-center text-sm">
                Crie campanhas no painel Admin para associar leads
              </p>
            </CardContent>
          </Card>
        ) : (
          campaigns.map((campaign) => {
            const status = getCampaignStatus(campaign);
            const progress = getCampaignProgress(campaign);
            const stats = campaignStats[campaign.id] || { leads: 0, value: 0, won: 0 };
            const isSelected = selectedCampaign?.id === campaign.id;

            return (
              <Card 
                key={campaign.id}
                className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedCampaign(isSelected ? null : campaign)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base line-clamp-1">{campaign.name}</CardTitle>
                    </div>
                    <Badge className={`${status.color} text-white text-xs`}>
                      {status.label}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {campaign.description || campaign.goal_description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-accent/50">
                      <p className="text-xs text-muted-foreground">Leads</p>
                      <p className="text-lg font-bold">{stats.leads}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-accent/50">
                      <p className="text-xs text-muted-foreground">Fechados</p>
                      <p className="text-lg font-bold text-emerald-600">{stats.won}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-accent/50">
                      <p className="text-xs text-muted-foreground">Valor</p>
                      <p className="text-sm font-bold">{formatCurrency(stats.value)}</p>
                    </div>
                  </div>

                  {/* Progress */}
                  {campaign.goal_value && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Meta: {campaign.goal_value} {campaign.goal_metric === 'currency' ? 'R$' : 'un'}</span>
                        <span className="font-medium">{progress.toFixed(0)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}

                  {/* Prize */}
                  {campaign.prize_description && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 text-amber-700 text-xs">
                      <Gift className="h-4 w-4" />
                      <span className="truncate">{campaign.prize_description}</span>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{format(new Date(campaign.start_date), "dd/MM", { locale: ptBR })}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span>{format(new Date(campaign.end_date), "dd/MM/yy", { locale: ptBR })}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Lead Association Panel */}
      {selectedCampaign && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Associar Leads à Campanha
                </CardTitle>
                <CardDescription>
                  Selecione os leads que fazem parte da campanha "{selectedCampaign.name}"
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedLeads.length} selecionados
                </span>
                <Button
                  onClick={() => associateLeads.mutate({ 
                    campaignId: selectedCampaign.id, 
                    leadIds: selectedLeads 
                  })}
                  disabled={selectedLeads.length === 0 || associateLeads.isPending}
                  className="gap-2"
                >
                  {associateLeads.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Associar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingLeads ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : eligibleLeads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum lead ativo encontrado
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {eligibleLeads.map((lead) => {
                    const inCampaign = isLeadInCampaign(lead, selectedCampaign.id);
                    const isSelected = selectedLeads.includes(lead.id);

                    return (
                      <div 
                        key={lead.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${inCampaign ? 'bg-emerald-50 border-emerald-200' : 'hover:bg-accent/50'}`}
                      >
                        {!inCampaign && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleLead(lead.id)}
                          />
                        )}
                        {inCampaign && (
                          <CheckCircle className="h-5 w-5 text-emerald-600" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{lead.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Valor estimado: {formatCurrency(lead.estimated_value || 0)}
                          </p>
                        </div>
                        {inCampaign && (
                          <Badge variant="secondary" className="text-xs">
                            Na campanha
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default CRMCampaignIntegration;
