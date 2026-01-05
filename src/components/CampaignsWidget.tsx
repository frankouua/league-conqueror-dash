import { useState } from "react";
import { Calendar, Target, ChevronRight, CheckCircle2, Circle, Clock, Flame, Trophy, Star, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, differenceInDays, isAfter, isBefore, isToday } from "date-fns";
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

interface CampaignAction {
  id: string;
  campaign_id: string;
  title: string;
  description: string | null;
  is_required: boolean;
  order_index: number;
}

interface ChecklistProgress {
  action_id: string;
  completed: boolean;
}

const CAMPAIGN_TYPE_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  mensal: { label: "Mensal", color: "bg-blue-500", icon: Calendar },
  semestral: { label: "Semestral", color: "bg-purple-500", icon: Trophy },
  anual: { label: "Anual", color: "bg-amber-500", icon: Star },
  oportuna: { label: "Oportuna", color: "bg-emerald-500", icon: Flame },
  estrategica: { label: "Estratégica", color: "bg-rose-500", icon: Target },
};

const CampaignsWidget = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch active campaigns
  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns-active"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("is_active", true)
        .lte("start_date", today)
        .gte("end_date", today)
        .order("end_date", { ascending: true });
      if (error) throw error;
      return data as Campaign[];
    },
    enabled: !!user,
  });

  // Fetch upcoming campaigns
  const { data: upcomingCampaigns = [] } = useQuery({
    queryKey: ["campaigns-upcoming"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("is_active", true)
        .gt("start_date", today)
        .order("start_date", { ascending: true })
        .limit(3);
      if (error) throw error;
      return data as Campaign[];
    },
    enabled: !!user,
  });

  // Fetch actions for selected campaign
  const { data: campaignActions = [] } = useQuery({
    queryKey: ["campaign-actions", selectedCampaign?.id],
    queryFn: async () => {
      if (!selectedCampaign) return [];
      const { data, error } = await supabase
        .from("campaign_actions")
        .select("*")
        .eq("campaign_id", selectedCampaign.id)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as CampaignAction[];
    },
    enabled: !!selectedCampaign,
  });

  // Fetch materials for selected campaign
  const { data: campaignMaterials = [] } = useQuery({
    queryKey: ["campaign-materials-widget", selectedCampaign?.id],
    queryFn: async () => {
      if (!selectedCampaign) return [];
      const { data, error } = await supabase
        .from("campaign_materials")
        .select("*")
        .eq("campaign_id", selectedCampaign.id)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCampaign,
  });

  // Fetch user's checklist progress
  const { data: checklistProgress = [] } = useQuery({
    queryKey: ["campaign-checklist", selectedCampaign?.id, user?.id],
    queryFn: async () => {
      if (!selectedCampaign || !user?.id) return [];
      const { data, error } = await supabase
        .from("campaign_checklist_progress")
        .select("action_id, completed")
        .eq("campaign_id", selectedCampaign.id)
        .eq("user_id", user.id);
      if (error) throw error;
      return data as ChecklistProgress[];
    },
    enabled: !!selectedCampaign && !!user?.id,
  });

  const progressMap = new Map(checklistProgress.map((p) => [p.action_id, p.completed]));

  // Toggle action completion
  const toggleActionMutation = useMutation({
    mutationFn: async ({ actionId, completed }: { actionId: string; completed: boolean }) => {
      if (!user?.id || !selectedCampaign) return;
      
      const { error } = await supabase.from("campaign_checklist_progress").upsert({
        campaign_id: selectedCampaign.id,
        action_id: actionId,
        user_id: user.id,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-checklist"] });
    },
  });

  const getProgress = (campaign: Campaign) => {
    const start = new Date(campaign.start_date);
    const end = new Date(campaign.end_date);
    const today = new Date();
    const total = differenceInDays(end, start);
    const elapsed = differenceInDays(today, start);
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const getDaysRemaining = (endDate: string) => {
    const days = differenceInDays(new Date(endDate), new Date());
    return days;
  };

  const activeCampaignsCount = campaigns.length;

  if (!user) return null;

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
            <Calendar className="w-5 h-5" />
            {activeCampaignsCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 flex items-center justify-center bg-primary text-primary-foreground text-[10px] font-bold"
              >
                {activeCampaignsCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 sm:w-96 bg-card border-border p-0">
          <div className="p-3 border-b border-border">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Campanhas
            </h4>
          </div>

          <ScrollArea className="max-h-[400px]">
            {/* Active Campaigns */}
            {campaigns.length > 0 && (
              <div className="p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Em Andamento</p>
                {campaigns.map((campaign) => {
                  const typeInfo = CAMPAIGN_TYPE_LABELS[campaign.campaign_type] || CAMPAIGN_TYPE_LABELS.mensal;
                  const daysRemaining = getDaysRemaining(campaign.end_date);
                  const progress = getProgress(campaign);
                  
                  return (
                    <div
                      key={campaign.id}
                      className="p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedCampaign(campaign);
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg ${typeInfo.color} flex items-center justify-center`}>
                            <typeInfo.icon className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <h5 className="text-sm font-medium text-foreground">{campaign.name}</h5>
                            <Badge variant="outline" className="text-[10px]">{typeInfo.label}</Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant={daysRemaining <= 3 ? "destructive" : daysRemaining <= 7 ? "secondary" : "outline"}
                            className="text-[10px]"
                          >
                            {daysRemaining}d restantes
                          </Badge>
                        </div>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Upcoming Campaigns */}
            {upcomingCampaigns.length > 0 && (
              <div className="p-3 border-t border-border space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Em Breve</p>
                {upcomingCampaigns.map((campaign) => {
                  const typeInfo = CAMPAIGN_TYPE_LABELS[campaign.campaign_type] || CAMPAIGN_TYPE_LABELS.mensal;
                  const daysUntil = differenceInDays(new Date(campaign.start_date), new Date());
                  
                  return (
                    <div
                      key={campaign.id}
                      className="p-2 rounded-lg border border-dashed border-border hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedCampaign(campaign);
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded ${typeInfo.color}/20 flex items-center justify-center`}>
                            <typeInfo.icon className={`w-3 h-3 ${typeInfo.color.replace('bg-', 'text-')}`} />
                          </div>
                          <span className="text-sm text-muted-foreground">{campaign.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">em {daysUntil}d</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {campaigns.length === 0 && upcomingCampaigns.length === 0 && (
              <div className="p-6 text-center text-muted-foreground">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma campanha ativa</p>
              </div>
            )}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Campaign Detail Dialog */}
      <Dialog open={!!selectedCampaign} onOpenChange={(open) => !open && setSelectedCampaign(null)}>
        <DialogContent className="max-w-lg bg-card border-border">
          {selectedCampaign && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  {(() => {
                    const typeInfo = CAMPAIGN_TYPE_LABELS[selectedCampaign.campaign_type] || CAMPAIGN_TYPE_LABELS.mensal;
                    return (
                      <div className={`w-12 h-12 rounded-xl ${typeInfo.color} flex items-center justify-center`}>
                        <typeInfo.icon className="w-6 h-6 text-white" />
                      </div>
                    );
                  })()}
                  <div>
                    <DialogTitle className="text-xl">{selectedCampaign.name}</DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {CAMPAIGN_TYPE_LABELS[selectedCampaign.campaign_type]?.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(selectedCampaign.start_date), "dd MMM", { locale: ptBR })} - {format(new Date(selectedCampaign.end_date), "dd MMM yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {selectedCampaign.description && (
                  <p className="text-sm text-muted-foreground">{selectedCampaign.description}</p>
                )}

                {selectedCampaign.goal_description && (
                  <Card className="bg-muted/50 border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Meta da Campanha</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{selectedCampaign.goal_description}</p>
                      {selectedCampaign.goal_value && (
                        <p className="text-lg font-bold text-primary mt-2">
                          {selectedCampaign.goal_metric === 'currency' 
                            ? `R$ ${selectedCampaign.goal_value.toLocaleString('pt-BR')}`
                            : `${selectedCampaign.goal_value} ${selectedCampaign.goal_metric || ''}`
                          }
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Prize Display */}
                {(selectedCampaign.prize_description || selectedCampaign.prize_value) && (
                  <Card className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/30">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Trophy className="w-6 h-6 text-amber-500" />
                      <div>
                        <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Premiação</p>
                        <p className="font-bold">
                          {selectedCampaign.prize_value 
                            ? `R$ ${selectedCampaign.prize_value.toLocaleString('pt-BR')}`
                            : selectedCampaign.prize_description
                          }
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Materials */}
                {campaignMaterials.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Materiais da Campanha
                    </h4>
                    <div className="grid gap-2">
                      {campaignMaterials.map((material: any) => (
                        <div
                          key={material.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => material.url && window.open(material.url, "_blank")}
                        >
                          <span className="text-sm">{material.title}</span>
                          {material.url && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Checklist */}
                {campaignActions.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        Sua Lista de Ações
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        {checklistProgress.filter(p => p.completed).length}/{campaignActions.length} concluídas
                      </span>
                    </div>
                    <div className="space-y-2">
                      {campaignActions.map((action) => {
                        const isCompleted = progressMap.get(action.id) || false;
                        return (
                          <div
                            key={action.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                              isCompleted 
                                ? "bg-success/10 border-success/30" 
                                : "bg-muted/30 border-border hover:bg-muted/50"
                            }`}
                          >
                            <Checkbox
                              checked={isCompleted}
                              onCheckedChange={(checked) => {
                                toggleActionMutation.mutate({
                                  actionId: action.id,
                                  completed: checked as boolean,
                                });
                              }}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                                {action.title}
                                {action.is_required && (
                                  <span className="text-destructive ml-1">*</span>
                                )}
                              </p>
                              {action.description && (
                                <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                              )}
                            </div>
                            {isCompleted && (
                              <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CampaignsWidget;
