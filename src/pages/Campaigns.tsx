import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Calendar, Target, Trophy, Clock, CheckCircle2, 
  Gift, TrendingUp, Megaphone, Star, Zap,
  ChevronRight, Award, Flame
} from "lucide-react";
import { format, differenceInDays, isPast, isFuture, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  campaign_type: string;
  start_date: string;
  end_date: string;
  goal_value: number | null;
  goal_metric: string | null;
  goal_description: string | null;
  prize_value: number | null;
  prize_description: string | null;
  is_active: boolean;
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

const CAMPAIGN_TYPE_CONFIG: Record<string, { label: string; color: string; icon: typeof Trophy }> = {
  mensal: { label: "Mensal", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Calendar },
  relampago: { label: "Relâmpago", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Zap },
  trimestral: { label: "Trimestral", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: Target },
  semestral: { label: "Semestral", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: Trophy },
  especial: { label: "Especial", color: "bg-pink-500/20 text-pink-400 border-pink-500/30", icon: Star },
};

const Campaigns = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("ativas");

  // Fetch campaigns
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns-page"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("is_template", false)
        .order("start_date", { ascending: false });
      
      if (error) throw error;
      return data as Campaign[];
    },
  });

  // Fetch campaign actions
  const { data: allActions = [] } = useQuery({
    queryKey: ["campaign-actions-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_actions")
        .select("*")
        .order("order_index");
      
      if (error) throw error;
      return data as CampaignAction[];
    },
  });

  // Fetch user's checklist progress
  const { data: checklistProgress = [], refetch: refetchProgress } = useQuery({
    queryKey: ["checklist-progress", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("campaign_checklist_progress")
        .select("action_id, completed")
        .eq("user_id", user.id);
      
      if (error) throw error;
      return data as ChecklistProgress[];
    },
    enabled: !!user?.id,
  });

  const now = new Date();
  
  const activeCampaigns = campaigns.filter(c => {
    const start = new Date(c.start_date);
    const end = new Date(c.end_date);
    return c.is_active && start <= now && end >= now;
  });

  const upcomingCampaigns = campaigns.filter(c => {
    const start = new Date(c.start_date);
    return c.is_active && start > now;
  });

  const pastCampaigns = campaigns.filter(c => {
    const end = new Date(c.end_date);
    return end < now;
  });

  const toggleAction = async (actionId: string, campaignId: string, currentlyCompleted: boolean) => {
    if (!user?.id) return;

    try {
      if (currentlyCompleted) {
        // Remove progress
        await supabase
          .from("campaign_checklist_progress")
          .delete()
          .eq("user_id", user.id)
          .eq("action_id", actionId);
      } else {
        // Add progress
        await supabase
          .from("campaign_checklist_progress")
          .upsert({
            user_id: user.id,
            campaign_id: campaignId,
            action_id: actionId,
            completed: true,
            completed_at: new Date().toISOString(),
          });
      }
      
      refetchProgress();
      toast.success(currentlyCompleted ? "Ação desmarcada" : "Ação concluída! 🎉");
    } catch (error) {
      toast.error("Erro ao atualizar progresso");
    }
  };

  const getCampaignProgress = (campaignId: string) => {
    const actions = allActions.filter(a => a.campaign_id === campaignId);
    if (actions.length === 0) return 0;
    
    const completed = actions.filter(a => 
      checklistProgress.some(p => p.action_id === a.id && p.completed)
    ).length;
    
    return Math.round((completed / actions.length) * 100);
  };

  const CampaignCard = ({ campaign, showActions = true }: { campaign: Campaign; showActions?: boolean }) => {
    const config = CAMPAIGN_TYPE_CONFIG[campaign.campaign_type] || CAMPAIGN_TYPE_CONFIG.mensal;
    const Icon = config.icon;
    const actions = allActions.filter(a => a.campaign_id === campaign.id);
    const progress = getCampaignProgress(campaign.id);
    const daysLeft = differenceInDays(new Date(campaign.end_date), now);
    const isActive = new Date(campaign.start_date) <= now && new Date(campaign.end_date) >= now;
    const isUpcoming = new Date(campaign.start_date) > now;

    return (
      <Card className="bg-card/50 border-border hover:border-primary/30 transition-all duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${config.color.split(' ')[0]}`}>
                <Icon className={`w-5 h-5 ${config.color.split(' ')[1]}`} />
              </div>
              <div>
                <CardTitle className="text-lg">{campaign.name}</CardTitle>
                {campaign.description && (
                  <CardDescription className="mt-1">{campaign.description}</CardDescription>
                )}
              </div>
            </div>
            <Badge className={config.color}>{config.label}</Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Dates and Status */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                {format(new Date(campaign.start_date), "dd/MM", { locale: ptBR })} - {format(new Date(campaign.end_date), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
            {isActive && daysLeft >= 0 && (
              <Badge variant="outline" className={daysLeft <= 3 ? "border-red-500/50 text-red-400" : "border-green-500/50 text-green-400"}>
                <Clock className="w-3 h-3 mr-1" />
                {daysLeft === 0 ? "Último dia!" : `${daysLeft} dias restantes`}
              </Badge>
            )}
            {isUpcoming && (
              <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                Começa em {differenceInDays(new Date(campaign.start_date), now)} dias
              </Badge>
            )}
          </div>

          {/* Goal */}
          {campaign.goal_description && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 text-primary mb-1">
                <Target className="w-4 h-4" />
                <span className="font-medium text-sm">Meta da Campanha</span>
              </div>
              <p className="text-sm text-foreground">{campaign.goal_description}</p>
              {campaign.goal_value && (
                <p className="text-lg font-bold text-primary mt-1">
                  {campaign.goal_metric === "revenue" ? `R$ ${campaign.goal_value.toLocaleString("pt-BR")}` : campaign.goal_value}
                </p>
              )}
            </div>
          )}

          {/* Prize */}
          {campaign.prize_description && (
            <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
              <div className="flex items-center gap-2 text-yellow-400 mb-1">
                <Gift className="w-4 h-4" />
                <span className="font-medium text-sm">Premiação</span>
              </div>
              <p className="text-sm text-foreground">{campaign.prize_description}</p>
              {campaign.prize_value && (
                <p className="text-lg font-bold text-yellow-400 mt-1">
                  R$ {campaign.prize_value.toLocaleString("pt-BR")}
                </p>
              )}
            </div>
          )}

          {/* Progress */}
          {showActions && actions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Seu progresso</span>
                <span className="text-sm font-bold text-primary">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              
              {/* Checklist */}
              <div className="space-y-2 mt-3">
                {actions.map((action) => {
                  const isCompleted = checklistProgress.some(p => p.action_id === action.id && p.completed);
                  return (
                    <div 
                      key={action.id}
                      className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                        isCompleted ? "bg-green-500/10" : "bg-muted/30 hover:bg-muted/50"
                      }`}
                      onClick={() => toggleAction(action.id, campaign.id, isCompleted)}
                    >
                      <Checkbox 
                        checked={isCompleted}
                        className={isCompleted ? "border-green-500 bg-green-500" : ""}
                      />
                      <div className="flex-1">
                        <p className={`text-sm ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {action.title}
                        </p>
                        {action.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                        )}
                      </div>
                      {action.is_required && (
                        <Badge variant="outline" className="text-xs border-red-500/30 text-red-400">
                          Obrigatório
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/20">
              <Megaphone className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Campanhas</h1>
          </div>
          <p className="text-muted-foreground">
            Participe das campanhas ativas, acompanhe seu progresso e conquiste premiações!
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Flame className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">{activeCampaigns.length}</p>
                  <p className="text-xs text-muted-foreground">Campanhas Ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-400">{upcomingCampaigns.length}</p>
                  <p className="text-xs text-muted-foreground">Em Breve</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <CheckCircle2 className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-400">{pastCampaigns.length}</p>
                  <p className="text-xs text-muted-foreground">Encerradas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/20">
                  <Award className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-400">
                    {activeCampaigns.filter(c => getCampaignProgress(c.id) === 100).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Completadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="ativas" className="gap-2">
              <Flame className="w-4 h-4" />
              Ativas ({activeCampaigns.length})
            </TabsTrigger>
            <TabsTrigger value="proximas" className="gap-2">
              <Clock className="w-4 h-4" />
              Em Breve ({upcomingCampaigns.length})
            </TabsTrigger>
            <TabsTrigger value="encerradas" className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Encerradas ({pastCampaigns.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ativas">
            {activeCampaigns.length === 0 ? (
              <Card className="bg-card/50">
                <CardContent className="p-8 text-center">
                  <Megaphone className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma campanha ativa</h3>
                  <p className="text-muted-foreground">
                    Fique de olho! Novas campanhas serão lançadas em breve.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {activeCampaigns.map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="proximas">
            {upcomingCampaigns.length === 0 ? (
              <Card className="bg-card/50">
                <CardContent className="p-8 text-center">
                  <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma campanha programada</h3>
                  <p className="text-muted-foreground">
                    Novas campanhas serão anunciadas em breve.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {upcomingCampaigns.map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} showActions={false} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="encerradas">
            {pastCampaigns.length === 0 ? (
              <Card className="bg-card/50">
                <CardContent className="p-8 text-center">
                  <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Histórico vazio</h3>
                  <p className="text-muted-foreground">
                    As campanhas encerradas aparecerão aqui.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {pastCampaigns.map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} showActions={false} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Campaigns;
