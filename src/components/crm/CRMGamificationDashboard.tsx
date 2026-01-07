import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Trophy, Medal, Crown, Star, Zap, Target, TrendingUp,
  Flame, Award, Users, DollarSign, CheckCircle2, Clock,
  Sparkles, Gift, Shield, Swords, Heart
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import brasaoLioness from '@/assets/brasao-lioness-team.png';
import brasaoTroia from '@/assets/brasao-troia-team.png';
import copaLogo from '@/assets/logo-copa-unique-league.png';

// CRM Points Configuration - Aligned with Copa Unique League
const CRM_SCORING = {
  leadCreated: 2,
  leadQualified: 5,
  leadWon: 50,
  firstContactMade: 3,
  meetingScheduled: 10,
  proposalSent: 15,
  quickResponse: 5, // Response under 5 minutes
  aiAnalysisUsed: 2,
  noStaleLeads: 20, // Bonus for having no stale leads
  perfectWeek: 50, // All tasks completed in a week
  streakDay: 5, // Per day of consecutive activity
};

interface CRMTeamStats {
  teamId: string;
  teamName: string;
  teamLogo: string;
  crmPoints: number;
  leadsWon: number;
  totalRevenue: number;
  avgResponseTime: number;
  conversionRate: number;
  activeMembers: number;
}

interface SellerAchievement {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  points: number;
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
}

export function CRMGamificationDashboard() {
  const { user, profile } = useAuth();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Fetch team CRM performance
  const { data: teamStats, isLoading } = useQuery({
    queryKey: ['crm-team-gamification', profile?.team_id],
    queryFn: async () => {
      // Get all teams
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name');

      if (!teams) return [];

      const stats: CRMTeamStats[] = await Promise.all(
        teams.map(async (team) => {
          // Get team members
          const { data: members } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('team_id', team.id);

          const memberIds = members?.map(m => m.user_id) || [];

          // Get won leads this month
          const { data: wonLeads } = await supabase
            .from('crm_leads')
            .select('*')
            .in('assigned_to', memberIds)
            .not('won_at', 'is', null)
            .gte('won_at', monthStart.toISOString())
            .lte('won_at', monthEnd.toISOString());

          // Get all leads this month
          const { data: allLeads } = await supabase
            .from('crm_leads')
            .select('*')
            .in('assigned_to', memberIds)
            .gte('created_at', monthStart.toISOString());

          // Calculate CRM points
          let crmPoints = 0;
          const wonCount = wonLeads?.length || 0;
          const totalRevenue = wonLeads?.reduce((acc, l) => 
            acc + (l.contract_value || l.estimated_value || 0), 0) || 0;
          
          // Points for wins
          crmPoints += wonCount * CRM_SCORING.leadWon;
          
          // Points for qualified leads
          const qualifiedLeads = allLeads?.filter(l => (l.lead_score || 0) >= 25).length || 0;
          crmPoints += qualifiedLeads * CRM_SCORING.leadQualified;
          
          // Points for AI analysis usage
          const aiAnalyzed = allLeads?.filter(l => l.ai_analyzed_at).length || 0;
          crmPoints += aiAnalyzed * CRM_SCORING.aiAnalysisUsed;

          // Points for no stale leads
          const staleLeads = allLeads?.filter(l => l.is_stale && !l.won_at && !l.lost_at).length || 0;
          if (staleLeads === 0 && (allLeads?.length || 0) > 0) {
            crmPoints += CRM_SCORING.noStaleLeads;
          }

          // Determine team logo
          const teamLogo = team.name.toLowerCase().includes('lioness') 
            ? brasaoLioness 
            : brasaoTroia;

          return {
            teamId: team.id,
            teamName: team.name,
            teamLogo,
            crmPoints,
            leadsWon: wonCount,
            totalRevenue,
            avgResponseTime: Math.random() * 30 + 5, // Placeholder
            conversionRate: (allLeads?.length || 0) > 0 
              ? (wonCount / allLeads!.length) * 100 
              : 0,
            activeMembers: memberIds.length,
          };
        })
      );

      // Sort by CRM points
      stats.sort((a, b) => b.crmPoints - a.crmPoints);
      return stats;
    },
    enabled: !!profile?.team_id,
  });

  // Fetch individual achievements
  const { data: achievements } = useQuery({
    queryKey: ['crm-achievements', user?.id],
    queryFn: async () => {
      // Get user's CRM activity
      const { data: myLeads } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('assigned_to', user?.id);

      const wonLeads = myLeads?.filter(l => l.won_at) || [];
      const qualifiedLeads = myLeads?.filter(l => (l.lead_score || 0) >= 25) || [];
      const aiAnalyzed = myLeads?.filter(l => l.ai_analyzed_at) || [];

      const achievements: SellerAchievement[] = [
        {
          id: 'first_sale',
          name: 'Primeira Venda',
          description: 'Feche sua primeira venda no CRM',
          icon: Trophy,
          points: 50,
          unlockedAt: wonLeads.length > 0 ? wonLeads[0].won_at : undefined,
          progress: Math.min(wonLeads.length, 1),
          maxProgress: 1,
        },
        {
          id: 'sales_10',
          name: 'Vendedor Bronze',
          description: 'Feche 10 vendas',
          icon: Medal,
          points: 100,
          unlockedAt: wonLeads.length >= 10 ? 'unlocked' : undefined,
          progress: wonLeads.length,
          maxProgress: 10,
        },
        {
          id: 'sales_25',
          name: 'Vendedor Prata',
          description: 'Feche 25 vendas',
          icon: Medal,
          points: 250,
          unlockedAt: wonLeads.length >= 25 ? 'unlocked' : undefined,
          progress: wonLeads.length,
          maxProgress: 25,
        },
        {
          id: 'sales_50',
          name: 'Vendedor Ouro',
          description: 'Feche 50 vendas',
          icon: Crown,
          points: 500,
          unlockedAt: wonLeads.length >= 50 ? 'unlocked' : undefined,
          progress: wonLeads.length,
          maxProgress: 50,
        },
        {
          id: 'ai_master',
          name: 'Mestre da IA',
          description: 'Use análise IA em 20 leads',
          icon: Sparkles,
          points: 100,
          unlockedAt: aiAnalyzed.length >= 20 ? 'unlocked' : undefined,
          progress: aiAnalyzed.length,
          maxProgress: 20,
        },
        {
          id: 'qualifier',
          name: 'Qualificador',
          description: 'Qualifique 15 leads (score ≥ 25)',
          icon: Target,
          points: 75,
          unlockedAt: qualifiedLeads.length >= 15 ? 'unlocked' : undefined,
          progress: qualifiedLeads.length,
          maxProgress: 15,
        },
        {
          id: 'revenue_100k',
          name: 'Clube 100K',
          description: 'Gere R$ 100.000 em vendas',
          icon: DollarSign,
          points: 200,
          progress: wonLeads.reduce((acc, l) => acc + (l.contract_value || 0), 0),
          maxProgress: 100000,
        },
        {
          id: 'no_stale',
          name: 'Sempre Ativo',
          description: 'Mantenha 0 leads parados por 1 mês',
          icon: Zap,
          points: 150,
        },
      ];

      return achievements;
    },
    enabled: !!user,
  });

  const myTeam = teamStats?.find(t => t.teamId === profile?.team_id);
  const rivalTeam = teamStats?.find(t => t.teamId !== profile?.team_id);
  const isLeading = myTeam && rivalTeam ? myTeam.crmPoints > rivalTeam.crmPoints : false;
  const pointsDiff = myTeam && rivalTeam ? myTeam.crmPoints - rivalTeam.crmPoints : 0;

  const unlockedAchievements = achievements?.filter(a => a.unlockedAt) || [];
  const lockedAchievements = achievements?.filter(a => !a.unlockedAt) || [];
  const totalPoints = unlockedAchievements.reduce((acc, a) => acc + a.points, 0);

  return (
    <div className="space-y-6">
      {/* Copa Unique League CRM Header */}
      <Card className="bg-gradient-to-r from-primary/20 via-amber-500/10 to-primary/20 border-primary/30 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 flex-wrap">
            <img 
              src={copaLogo} 
              alt="Copa Unique League" 
              className="w-16 h-16 drop-shadow-lg"
            />
            <div className="flex-1">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Trophy className="w-6 h-6 text-primary" />
                Copa Unique League - CRM
              </h2>
              <p className="text-muted-foreground">
                Pontuação extra baseada no desempenho comercial no CRM
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                {format(now, "MMMM 'de' yyyy", { locale: ptBR })}
              </div>
              <Badge className="mt-1 bg-primary">
                Pontos CRM válidos para a Copa
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Battle */}
      <div className="grid lg:grid-cols-2 gap-6">
        {teamStats?.map((team, index) => {
          const isMyTeam = team.teamId === profile?.team_id;
          const isWinning = index === 0;
          
          return (
            <Card 
              key={team.teamId}
              className={cn(
                "relative overflow-hidden transition-all",
                isWinning && "card-winner shadow-gold-intense",
                isMyTeam && "ring-2 ring-primary"
              )}
            >
              {/* Position Badge */}
              <div className={cn(
                "absolute -top-2 -left-2 w-12 h-12 rounded-full flex items-center justify-center font-black text-xl z-10",
                isWinning 
                  ? "bg-gradient-gold-shine text-primary-foreground shadow-gold"
                  : "bg-secondary text-muted-foreground"
              )}>
                {index + 1}º
              </div>

              {isWinning && (
                <div className="absolute top-4 right-4 trophy-glow">
                  <Crown className="w-8 h-8 text-primary animate-float" />
                </div>
              )}

              <CardContent className="p-6 pt-8">
                <div className="flex items-center gap-4 mb-4">
                  <img 
                    src={team.teamLogo} 
                    alt={team.teamName}
                    className="w-16 h-16 object-contain drop-shadow-lg"
                  />
                  <div>
                    <h3 className={cn(
                      "text-xl font-bold",
                      isWinning && "text-gradient-gold"
                    )}>
                      {team.teamName}
                    </h3>
                    {isMyTeam && (
                      <Badge variant="outline" className="text-xs">
                        Seu Time
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="text-center mb-4">
                  <div className={cn(
                    "text-4xl font-black",
                    isWinning && "text-gradient-gold"
                  )}>
                    {team.crmPoints.toLocaleString('pt-BR')}
                  </div>
                  <div className="text-sm text-muted-foreground">Pontos CRM</div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2 rounded-lg bg-green-500/10 text-center">
                    <div className="font-bold text-green-600">{team.leadsWon}</div>
                    <div className="text-xs text-muted-foreground">Vendas</div>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-500/10 text-center">
                    <div className="font-bold text-blue-600">
                      R$ {(team.totalRevenue / 1000).toFixed(0)}k
                    </div>
                    <div className="text-xs text-muted-foreground">Receita</div>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-500/10 text-center">
                    <div className="font-bold text-amber-600">
                      {team.conversionRate.toFixed(0)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Conversão</div>
                  </div>
                  <div className="p-2 rounded-lg bg-purple-500/10 text-center">
                    <div className="font-bold text-purple-600">
                      {team.activeMembers}
                    </div>
                    <div className="text-xs text-muted-foreground">Membros</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Points Difference Banner */}
      {myTeam && rivalTeam && (
        <Card className={cn(
          "border-2",
          isLeading ? "border-green-500 bg-green-500/5" : "border-red-500 bg-red-500/5"
        )}>
          <CardContent className="p-4 flex items-center justify-center gap-4">
            {isLeading ? (
              <>
                <TrendingUp className="w-6 h-6 text-green-500" />
                <span className="text-lg font-bold text-green-600">
                  Seu time está {pointsDiff} pontos à frente! Continue assim!
                </span>
                <Flame className="w-6 h-6 text-orange-500 animate-pulse" />
              </>
            ) : (
              <>
                <Swords className="w-6 h-6 text-red-500" />
                <span className="text-lg font-bold text-red-600">
                  Seu time está {Math.abs(pointsDiff)} pontos atrás! É hora de reagir!
                </span>
                <Target className="w-6 h-6 text-amber-500" />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Achievements Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Conquistas CRM
          </CardTitle>
          <CardDescription>
            Desbloqueie conquistas para ganhar pontos extras para seu time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="unlocked">
            <TabsList>
              <TabsTrigger value="unlocked" className="gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Desbloqueadas ({unlockedAchievements.length})
              </TabsTrigger>
              <TabsTrigger value="locked" className="gap-1">
                <Shield className="w-4 h-4" />
                Bloqueadas ({lockedAchievements.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="unlocked" className="mt-4">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {unlockedAchievements.map((achievement) => {
                  const Icon = achievement.icon;
                  return (
                    <Card 
                      key={achievement.id}
                      className="bg-gradient-to-br from-primary/10 to-amber-500/10 border-primary/30"
                    >
                      <CardContent className="p-4 text-center">
                        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-primary/20 flex items-center justify-center">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <h4 className="font-bold">{achievement.name}</h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          {achievement.description}
                        </p>
                        <Badge className="bg-primary">
                          +{achievement.points} pts
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
                {unlockedAchievements.length === 0 && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>Nenhuma conquista desbloqueada ainda</p>
                    <p className="text-sm">Continue vendendo para desbloquear!</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="locked" className="mt-4">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {lockedAchievements.map((achievement) => {
                  const Icon = achievement.icon;
                  const progressPercent = achievement.maxProgress 
                    ? ((achievement.progress || 0) / achievement.maxProgress) * 100 
                    : 0;
                  
                  return (
                    <Card 
                      key={achievement.id}
                      className="bg-muted/30 border-muted"
                    >
                      <CardContent className="p-4 text-center">
                        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-muted flex items-center justify-center">
                          <Icon className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <h4 className="font-bold text-muted-foreground">{achievement.name}</h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          {achievement.description}
                        </p>
                        {achievement.maxProgress && (
                          <div className="space-y-1">
                            <Progress value={progressPercent} className="h-2" />
                            <span className="text-xs text-muted-foreground">
                              {achievement.progress?.toLocaleString('pt-BR')} / {achievement.maxProgress.toLocaleString('pt-BR')}
                            </span>
                          </div>
                        )}
                        <Badge variant="outline" className="mt-2">
                          +{achievement.points} pts
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Points Calculation Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="w-4 h-4 text-primary" />
            Como Ganhar Pontos CRM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="font-bold text-green-600 mb-1">+{CRM_SCORING.leadWon} pts</div>
              <div className="text-muted-foreground">Venda fechada</div>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="font-bold text-blue-600 mb-1">+{CRM_SCORING.proposalSent} pts</div>
              <div className="text-muted-foreground">Proposta enviada</div>
            </div>
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="font-bold text-purple-600 mb-1">+{CRM_SCORING.meetingScheduled} pts</div>
              <div className="text-muted-foreground">Reunião agendada</div>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="font-bold text-amber-600 mb-1">+{CRM_SCORING.leadQualified} pts</div>
              <div className="text-muted-foreground">Lead qualificado</div>
            </div>
            <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <div className="font-bold text-cyan-600 mb-1">+{CRM_SCORING.quickResponse} pts</div>
              <div className="text-muted-foreground">Resposta rápida (&lt;5min)</div>
            </div>
            <div className="p-3 rounded-lg bg-pink-500/10 border border-pink-500/20">
              <div className="font-bold text-pink-600 mb-1">+{CRM_SCORING.aiAnalysisUsed} pts</div>
              <div className="text-muted-foreground">Análise IA usada</div>
            </div>
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <div className="font-bold text-orange-600 mb-1">+{CRM_SCORING.noStaleLeads} pts</div>
              <div className="text-muted-foreground">Zero leads parados</div>
            </div>
            <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <div className="font-bold text-indigo-600 mb-1">+{CRM_SCORING.perfectWeek} pts</div>
              <div className="text-muted-foreground">Semana perfeita</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
