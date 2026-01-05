import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  User, 
  Target, 
  Trophy, 
  TrendingUp, 
  Star, 
  CheckCircle2, 
  Clock, 
  DollarSign,
  Users,
  Building2,
  Phone,
  Mail,
  Award,
  Zap,
  MessageSquare,
  Lightbulb,
  Flame,
  Medal,
  Calendar,
  BookOpen,
  ClipboardList,
  FileText,
  Heart,
  Copy
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { POSITION_DETAILS } from "@/constants/positionDetails";
import { useToast } from "@/hooks/use-toast";

const POSITION_LABELS: Record<string, { label: string; description: string; focus: string[] }> = {
  comercial_1_captacao: { 
    label: "Captação", 
    description: "Responsável por trazer novos leads e oportunidades para a clínica.",
    focus: ["Indicações coletadas", "Leads convertidos", "Primeira impressão do paciente"]
  },
  comercial_2_closer: { 
    label: "Closer", 
    description: "Especialista em fechar vendas e converter consultas em procedimentos.",
    focus: ["Taxa de conversão", "Valor médio de venda", "Follow-up de propostas"]
  },
  comercial_3_experiencia: { 
    label: "Experiência", 
    description: "Garante a melhor experiência do paciente durante toda jornada.",
    focus: ["NPS do paciente", "Depoimentos", "Satisfação pós-procedimento"]
  },
  comercial_4_farmer: { 
    label: "Farmer", 
    description: "Cuida do relacionamento de longo prazo e recompra de pacientes.",
    focus: ["Retenção de pacientes", "Recompras", "Indicações de clientes antigos"]
  },
  sdr: { 
    label: "SDR", 
    description: "Qualifica leads e agenda consultas para o time comercial.",
    focus: ["Leads qualificados", "Agendamentos realizados", "Tempo de resposta"]
  },
  coordenador: { 
    label: "Coordenador", 
    description: "Lidera e desenvolve a equipe comercial.",
    focus: ["Performance da equipe", "Metas do time", "Desenvolvimento de pessoas"]
  },
  gerente: { 
    label: "Gerente", 
    description: "Gestão estratégica da área comercial.",
    focus: ["Resultados gerais", "Estratégia comercial", "Indicadores da clínica"]
  },
  assistente: { 
    label: "Assistente", 
    description: "Suporte operacional ao time comercial.",
    focus: ["Organização", "Suporte ao time", "Processos administrativos"]
  },
  outro: { 
    label: "Outro", 
    description: "Função diversa na equipe.",
    focus: ["Objetivos específicos do cargo"]
  },
};

const DEPARTMENT_LABELS: Record<string, string> = {
  comercial: "Comercial",
  atendimento: "Atendimento",
  marketing: "Marketing",
  administrativo: "Administrativo",
  clinico: "Clínico",
};

const MyGoalsDashboard = () => {
  const { user, profile } = useAuth();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const endOfMonth = new Date(currentYear, currentMonth, 0);
  const daysRemaining = differenceInDays(endOfMonth, now);

  // Fetch team info
  const { data: team } = useQuery({
    queryKey: ["my-team", profile?.team_id],
    queryFn: async () => {
      if (!profile?.team_id) return null;
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("id", profile.team_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.team_id,
  });

  // Fetch individual goals
  const { data: individualGoals } = useQuery({
    queryKey: ["my-individual-goals", user?.id, currentMonth, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("individual_goals")
        .select("*")
        .eq("user_id", user?.id)
        .eq("month", currentMonth)
        .eq("year", currentYear)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch predefined goals
  const { data: predefinedGoal } = useQuery({
    queryKey: ["my-predefined-goal", user?.id, currentMonth, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predefined_goals")
        .select("*")
        .eq("matched_user_id", user?.id)
        .eq("month", currentMonth)
        .eq("year", currentYear)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch revenue records for current month
  const { data: revenueRecords = [] } = useQuery({
    queryKey: ["my-revenue", user?.id, currentMonth, currentYear],
    queryFn: async () => {
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-31`;
      const { data, error } = await supabase
        .from("revenue_records")
        .select("*")
        .eq("attributed_to_user_id", user?.id)
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch executed records
  const { data: executedRecords = [] } = useQuery({
    queryKey: ["my-executed", user?.id, currentMonth, currentYear],
    queryFn: async () => {
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-31`;
      const { data, error } = await supabase
        .from("executed_records")
        .select("*")
        .eq("attributed_to_user_id", user?.id)
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch referrals
  const { data: referralRecords = [] } = useQuery({
    queryKey: ["my-referrals", user?.id, currentMonth, currentYear],
    queryFn: async () => {
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-31`;
      const { data, error } = await supabase
        .from("referral_records")
        .select("*")
        .eq("attributed_to_user_id", user?.id)
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch testimonials
  const { data: testimonialRecords = [] } = useQuery({
    queryKey: ["my-testimonials", user?.id, currentMonth, currentYear],
    queryFn: async () => {
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-31`;
      const { data, error } = await supabase
        .from("testimonial_records")
        .select("*")
        .eq("attributed_to_user_id", user?.id)
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch NPS
  const { data: npsRecords = [] } = useQuery({
    queryKey: ["my-nps", user?.id, currentMonth, currentYear],
    queryFn: async () => {
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-31`;
      const { data, error } = await supabase
        .from("nps_records")
        .select("*")
        .eq("attributed_to_user_id", user?.id)
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch achievements
  const { data: achievements = [] } = useQuery({
    queryKey: ["my-achievements", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_achievements")
        .select("*")
        .eq("user_id", user?.id)
        .order("unlocked_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch colleagues with same position for ranking
  const { data: colleaguesRanking = [] } = useQuery({
    queryKey: ["colleagues-ranking", profile?.position, currentMonth, currentYear],
    queryFn: async () => {
      if (!profile?.position) return [];
      
      // Get all profiles with same position
      const { data: colleagues, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, team_id")
        .eq("position", profile.position);
      
      if (profilesError) throw profilesError;
      if (!colleagues || colleagues.length === 0) return [];

      // Get revenue for each colleague this month
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-31`;
      
      const { data: revenues, error: revenueError } = await supabase
        .from("revenue_records")
        .select("attributed_to_user_id, amount")
        .in("attributed_to_user_id", colleagues.map(c => c.user_id))
        .gte("date", startDate)
        .lte("date", endDate);
      
      if (revenueError) throw revenueError;

      // Calculate total revenue per colleague
      const revenueByUser: Record<string, number> = {};
      revenues?.forEach(r => {
        if (r.attributed_to_user_id) {
          revenueByUser[r.attributed_to_user_id] = (revenueByUser[r.attributed_to_user_id] || 0) + r.amount;
        }
      });

      // Get team names
      const teamIds = [...new Set(colleagues.map(c => c.team_id).filter(Boolean))];
      const { data: teams } = await supabase
        .from("teams")
        .select("id, name")
        .in("id", teamIds);
      
      const teamMap: Record<string, string> = {};
      teams?.forEach(t => { teamMap[t.id] = t.name; });

      // Build ranking
      const ranking = colleagues.map(c => ({
        user_id: c.user_id,
        full_name: c.full_name,
        avatar_url: c.avatar_url,
        team_name: c.team_id ? teamMap[c.team_id] : null,
        total_revenue: revenueByUser[c.user_id] || 0,
        is_current_user: c.user_id === user?.id,
      }));

      // Sort by revenue descending
      ranking.sort((a, b) => b.total_revenue - a.total_revenue);

      // Add position
      return ranking.map((r, idx) => ({ ...r, position: idx + 1 }));
    },
    enabled: !!profile?.position && !!user?.id,
  });

  // Calculate totals
  const totalRevenue = revenueRecords.reduce((sum, r) => sum + r.amount, 0);
  const totalExecuted = executedRecords.reduce((sum, r) => sum + r.amount, 0);
  const totalReferrals = referralRecords.reduce((sum, r) => sum + r.collected, 0);
  const totalTestimonials = testimonialRecords.length;
  const avgNps = npsRecords.length > 0 
    ? npsRecords.reduce((sum, r) => sum + r.score, 0) / npsRecords.length 
    : 0;

  // Get goals
  const revenueGoal = predefinedGoal?.meta1_goal || individualGoals?.revenue_goal || 0;
  const meta2Goal = predefinedGoal?.meta2_goal || individualGoals?.meta2_goal || 0;
  const meta3Goal = predefinedGoal?.meta3_goal || individualGoals?.meta3_goal || 0;
  const referralsGoal = individualGoals?.referrals_goal || 5;
  const testimonialsGoal = individualGoals?.testimonials_goal || 3;
  const npsGoal = individualGoals?.nps_goal || 9;

  // Calculate progress
  const revenueProgress = revenueGoal > 0 ? Math.min(100, (totalRevenue / revenueGoal) * 100) : 0;
  const referralsProgress = referralsGoal > 0 ? Math.min(100, (totalReferrals / referralsGoal) * 100) : 0;
  const testimonialsProgress = testimonialsGoal > 0 ? Math.min(100, (totalTestimonials / testimonialsGoal) * 100) : 0;

  // Position info - use detailed info
  const positionInfo = profile?.position ? POSITION_LABELS[profile.position] : null;
  const positionDetails = profile?.position ? POSITION_DETAILS[profile.position] : null;
  const { toast } = useToast();

  // Daily target
  const dailyTarget = daysRemaining > 0 && revenueGoal > 0
    ? Math.max(0, (revenueGoal - totalRevenue) / daysRemaining)
    : 0;

  if (!profile) {
    return (
      <Card className="bg-card/50 border-border">
        <CardContent className="p-8 text-center">
          <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">Carregando perfil...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-primary/30 shadow-lg">
                <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name} />
                <AvatarFallback className="text-2xl md:text-3xl bg-primary/20 text-primary font-bold">
                  {profile.full_name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {achievements.length > 0 && (
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center border-2 border-background">
                  <Medal className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">{profile.full_name}</h2>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2">
                {positionInfo && (
                  <Badge className="bg-primary/20 text-primary border-primary/30">
                    {positionInfo.label}
                  </Badge>
                )}
                {profile.department && (
                  <Badge variant="outline" className="gap-1">
                    <Building2 className="w-3 h-3" />
                    {DEPARTMENT_LABELS[profile.department]}
                  </Badge>
                )}
                {team && (
                  <Badge variant="outline" className="gap-1">
                    <Users className="w-3 h-3" />
                    {team.name}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {profile.email}
                </div>
                {profile.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    {profile.phone}
                  </div>
                )}
              </div>

              {positionInfo && (
                <p className="mt-3 text-sm text-muted-foreground max-w-xl">
                  {positionInfo.description}
                </p>
              )}
            </div>

            {/* Days Remaining */}
            <div className="text-center p-4 rounded-xl bg-muted/50 border border-border">
              <Clock className="w-6 h-6 mx-auto text-primary mb-1" />
              <p className="text-3xl font-bold text-foreground">{daysRemaining}</p>
              <p className="text-xs text-muted-foreground">dias restantes</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {format(endOfMonth, "dd/MM", { locale: ptBR })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="metas" className="space-y-6">
        <TabsList className="bg-secondary/50 w-full md:w-auto">
          <TabsTrigger value="metas" className="gap-1 flex-1 md:flex-none">
            <Target className="w-3 h-3" />
            Metas
          </TabsTrigger>
          <TabsTrigger value="desempenho" className="gap-1 flex-1 md:flex-none">
            <TrendingUp className="w-3 h-3" />
            Desempenho
          </TabsTrigger>
          <TabsTrigger value="foco" className="gap-1 flex-1 md:flex-none">
            <Lightbulb className="w-3 h-3" />
            Foco
          </TabsTrigger>
        </TabsList>

        {/* Metas Tab */}
        <TabsContent value="metas" className="space-y-6">
          {/* Goal Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Revenue Goal */}
            <Card className={`border-border ${revenueProgress >= 100 ? 'bg-emerald-500/10 border-emerald-500/30' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Faturamento</p>
                      <p className="font-bold text-lg">
                        {revenueProgress >= 100 && <CheckCircle2 className="w-4 h-4 inline mr-1 text-emerald-500" />}
                        R$ {totalRevenue.toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
                <Progress value={revenueProgress} className="h-2 mb-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{revenueProgress.toFixed(0)}%</span>
                  <span>Meta: R$ {revenueGoal.toLocaleString('pt-BR')}</span>
                </div>
              </CardContent>
            </Card>

            {/* Referrals Goal */}
            <Card className={`border-border ${referralsProgress >= 100 ? 'bg-emerald-500/10 border-emerald-500/30' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Indicações</p>
                      <p className="font-bold text-lg">
                        {referralsProgress >= 100 && <CheckCircle2 className="w-4 h-4 inline mr-1 text-emerald-500" />}
                        {totalReferrals}
                      </p>
                    </div>
                  </div>
                </div>
                <Progress value={referralsProgress} className="h-2 mb-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{referralsProgress.toFixed(0)}%</span>
                  <span>Meta: {referralsGoal}</span>
                </div>
              </CardContent>
            </Card>

            {/* Testimonials Goal */}
            <Card className={`border-border ${testimonialsProgress >= 100 ? 'bg-emerald-500/10 border-emerald-500/30' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Depoimentos</p>
                      <p className="font-bold text-lg">
                        {testimonialsProgress >= 100 && <CheckCircle2 className="w-4 h-4 inline mr-1 text-emerald-500" />}
                        {totalTestimonials}
                      </p>
                    </div>
                  </div>
                </div>
                <Progress value={testimonialsProgress} className="h-2 mb-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{testimonialsProgress.toFixed(0)}%</span>
                  <span>Meta: {testimonialsGoal}</span>
                </div>
              </CardContent>
            </Card>

            {/* NPS */}
            <Card className={`border-border ${avgNps >= npsGoal ? 'bg-emerald-500/10 border-emerald-500/30' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Star className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">NPS Médio</p>
                      <p className="font-bold text-lg">
                        {avgNps >= npsGoal && <CheckCircle2 className="w-4 h-4 inline mr-1 text-emerald-500" />}
                        {avgNps.toFixed(1)}
                      </p>
                    </div>
                  </div>
                </div>
                <Progress value={(avgNps / 10) * 100} className="h-2 mb-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{npsRecords.length} avaliações</span>
                  <span>Meta: {npsGoal}+</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Target */}
          {dailyTarget > 0 && revenueProgress < 100 && (
            <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30">
              <CardContent className="p-4 flex items-center gap-4">
                <Flame className="w-10 h-10 text-amber-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Para bater sua meta, você precisa vender</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    R$ {dailyTarget.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} por dia
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {revenueProgress >= 100 && (
            <Card className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-emerald-500/30">
              <CardContent className="p-4 flex items-center gap-4">
                <Trophy className="w-10 h-10 text-emerald-500" />
                <div>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    🎉 Parabéns! Você bateu sua meta de faturamento!
                  </p>
                  <p className="text-sm text-muted-foreground">Continue vendendo para superar ainda mais!</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* What's Missing */}
          {(revenueProgress < 100 || referralsProgress < 100 || testimonialsProgress < 100) && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  O Que Falta Para Bater Suas Metas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {revenueProgress < 100 && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Faturamento</p>
                      <p className="text-lg font-bold text-primary">
                        R$ {(revenueGoal - totalRevenue).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  )}
                  {referralsProgress < 100 && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Indicações</p>
                      <p className="text-lg font-bold text-blue-500">
                        {referralsGoal - totalReferrals} indicação(ões)
                      </p>
                    </div>
                  )}
                  {testimonialsProgress < 100 && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Depoimentos</p>
                      <p className="text-lg font-bold text-amber-500">
                        {testimonialsGoal - totalTestimonials} depoimento(s)
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Desempenho Tab */}
        <TabsContent value="desempenho" className="space-y-6">
          {/* Recent Achievements */}
          {achievements.length > 0 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" />
                  Conquistas Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {achievements.map((achievement) => (
                    <Badge 
                      key={achievement.id} 
                      variant="outline" 
                      className="py-2 px-3 bg-amber-500/10 border-amber-500/30"
                    >
                      <span className="mr-1">{achievement.icon || "🏆"}</span>
                      {achievement.achievement_name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-border">
              <CardContent className="p-4 text-center">
                <DollarSign className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                <p className="text-2xl font-bold">R$ {totalRevenue.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">Vendido este mês</p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4 text-center">
                <Zap className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                <p className="text-2xl font-bold">R$ {totalExecuted.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">Executado este mês</p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4 text-center">
                <Users className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                <p className="text-2xl font-bold">{totalReferrals}</p>
                <p className="text-xs text-muted-foreground">Indicações coletadas</p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4 text-center">
                <Star className="w-8 h-8 mx-auto text-amber-500 mb-2" />
                <p className="text-2xl font-bold">{avgNps.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">NPS médio</p>
              </CardContent>
            </Card>
          </div>

          {/* Personal Ranking Card */}
          {colleaguesRanking.length > 1 && positionInfo && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Ranking {positionInfo.label}
                  <Badge variant="outline" className="ml-auto text-xs">
                    {colleaguesRanking.length} colegas
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* My Position Highlight */}
                {(() => {
                  const myRanking = colleaguesRanking.find(c => c.is_current_user);
                  if (!myRanking) return null;
                  
                  const isTop3 = myRanking.position <= 3;
                  const positionColors = {
                    1: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
                    2: 'from-slate-400/20 to-slate-500/10 border-slate-400/30',
                    3: 'from-orange-600/20 to-orange-700/10 border-orange-600/30',
                  };
                  
                  return (
                    <div className={`p-4 rounded-xl mb-4 bg-gradient-to-r ${isTop3 ? positionColors[myRanking.position as 1 | 2 | 3] || 'from-primary/10 to-primary/5 border-primary/20' : 'from-primary/10 to-primary/5 border-primary/20'} border`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-2xl ${
                          myRanking.position === 1 ? 'bg-amber-500 text-white' :
                          myRanking.position === 2 ? 'bg-slate-400 text-white' :
                          myRanking.position === 3 ? 'bg-orange-600 text-white' :
                          'bg-primary/20 text-primary'
                        }`}>
                          {myRanking.position}º
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-lg">Sua Posição</p>
                          <p className="text-sm text-muted-foreground">
                            R$ {myRanking.total_revenue.toLocaleString('pt-BR')} vendidos
                          </p>
                        </div>
                        {myRanking.position === 1 && (
                          <div className="text-amber-500">
                            <Medal className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      {myRanking.position > 1 && (
                        <div className="mt-3 pt-3 border-t border-border/50 text-sm text-muted-foreground">
                          <span className="text-primary font-medium">
                            R$ {(colleaguesRanking[myRanking.position - 2].total_revenue - myRanking.total_revenue).toLocaleString('pt-BR')}
                          </span>
                          {' '}para alcançar a {myRanking.position - 1}ª posição
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Full Ranking List */}
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {colleaguesRanking.map((colleague, idx) => (
                      <div 
                        key={colleague.user_id}
                        className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                          colleague.is_current_user 
                            ? 'bg-primary/10 border border-primary/20' 
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          idx === 0 ? 'bg-amber-500 text-white' :
                          idx === 1 ? 'bg-slate-400 text-white' :
                          idx === 2 ? 'bg-orange-600 text-white' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {colleague.position}º
                        </div>
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={colleague.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {colleague.full_name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${colleague.is_current_user ? 'font-bold text-primary' : ''}`}>
                            {colleague.full_name}
                            {colleague.is_current_user && ' (Você)'}
                          </p>
                          {colleague.team_name && (
                            <p className="text-xs text-muted-foreground truncate">{colleague.team_name}</p>
                          )}
                        </div>
                        <p className="text-sm font-medium text-right">
                          R$ {colleague.total_revenue.toLocaleString('pt-BR')}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Team Info */}
          {team && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Minha Equipe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Trophy className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{team.name}</p>
                    {team.motto && (
                      <p className="text-sm text-muted-foreground italic">"{team.motto}"</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Foco Tab */}
        <TabsContent value="foco" className="space-y-6">
          {/* Mission Card */}
          {positionDetails && (
            <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  {positionDetails.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-background/50 border border-primary/20">
                  <p className="text-sm font-medium text-primary mb-1">Sua Missão</p>
                  <p className="text-muted-foreground">{positionDetails.mission}</p>
                </div>
                <p className="text-muted-foreground">{positionDetails.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Values */}
          {positionDetails && positionDetails.values.length > 0 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-500" />
                  Valores do Seu Cargo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {positionDetails.values.map((value, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-muted/50 text-sm">
                      {value}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* KPIs */}
          {positionDetails && positionDetails.kpis.length > 0 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Seus KPIs (Indicadores de Sucesso)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {positionDetails.kpis.map((kpi, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-muted/30 border border-border text-center">
                      <p className="text-lg font-bold text-primary">{kpi.target}</p>
                      <p className="text-xs text-muted-foreground">{kpi.metric}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Daily Schedule */}
          {positionDetails && positionDetails.dailySchedule.length > 0 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  Agenda de Sucesso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {positionDetails.dailySchedule.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-28 flex-shrink-0">
                        <Badge variant="outline" className="text-xs font-mono">
                          {item.time}
                        </Badge>
                      </div>
                      <p className="text-sm">{item.activity}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Best Practices */}
          {positionDetails && positionDetails.bestPractices.length > 0 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-500" />
                  Melhores Práticas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {positionDetails.bestPractices.map((practice, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {practice}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Scripts */}
          {positionDetails && positionDetails.scripts.length > 0 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-500" />
                  Scripts do Seu Cargo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {positionDetails.scripts.map((script, idx) => (
                    <AccordionItem key={idx} value={`script-${idx}`}>
                      <AccordionTrigger className="text-sm hover:no-underline">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-primary" />
                          {script.title}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="relative">
                          <pre className="p-4 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap font-sans">
                            {script.content}
                          </pre>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(script.content);
                              toast({ title: "Script copiado!", description: "Cole onde precisar." });
                            }}
                            className="absolute top-2 right-2 p-2 rounded-lg bg-background/80 hover:bg-background border border-border transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}

          {/* Focus Areas */}
          {positionDetails && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-primary" />
                  Áreas de Foco Principal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {positionDetails.focus.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
                      <p className="text-sm font-medium">{item}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Tips */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Dicas Rápidas Para Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dailyTarget > 0 && revenueProgress < 100 && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-sm">
                      💰 Foque em fechar <strong>R$ {dailyTarget.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</strong> por dia para bater sua meta.
                    </p>
                  </div>
                )}
                {totalReferrals < referralsGoal && (
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-sm">
                      👥 Peça indicações! Faltam apenas <strong>{referralsGoal - totalReferrals}</strong> para bater sua meta de indicações.
                    </p>
                  </div>
                )}
                {totalTestimonials < testimonialsGoal && (
                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <p className="text-sm">
                      ⭐ Solicite depoimentos de pacientes satisfeitos. Faltam <strong>{testimonialsGoal - totalTestimonials}</strong>.
                    </p>
                  </div>
                )}
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-sm">
                    📚 Acesse os <strong>Guias Comerciais</strong> no menu para mais scripts e estratégias avançadas.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* No position set */}
          {!positionDetails && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-6 text-center">
                <Lightbulb className="w-10 h-10 mx-auto mb-3 text-amber-500" />
                <p className="font-medium mb-2">Cargo não definido</p>
                <p className="text-sm text-muted-foreground">
                  Peça ao seu coordenador para definir seu cargo no sistema para ver informações personalizadas.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyGoalsDashboard;
