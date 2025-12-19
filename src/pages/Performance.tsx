import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Target,
  DollarSign,
  MessageSquare,
  Star,
  Users,
  TrendingUp,
  CheckCircle2,
  Edit,
  Trophy,
  Medal,
  Award,
  Building2,
} from "lucide-react";
import DepartmentGoalsCard from "@/components/DepartmentGoalsCard";
import GoalTrackingDashboard from "@/components/GoalTrackingDashboard";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

interface MemberPerformance {
  userId: string;
  name: string;
  teamId: string;
  teamName: string;
  revenue: number;
  revenuePoints: number;
  npsCount: number;
  npsPoints: number;
  testimonials: number;
  testimonialPoints: number;
  referrals: number;
  referralPoints: number;
  otherPoints: number;
  totalPoints: number;
}

const Performance = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [goalForm, setGoalForm] = useState({
    revenue_goal: "",
    meta2_goal: "",
    meta3_goal: "",
    nps_goal: "",
    testimonials_goal: "",
    referrals_goal: "",
  });

  // Fetch teams
  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch all profiles
  const { data: profiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch individual goals
  const { data: allGoals } = useQuery({
    queryKey: ["individual-goals", selectedMonth, selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("individual_goals")
        .select("*")
        .eq("month", selectedMonth)
        .eq("year", selectedYear);
      if (error) throw error;
      return data;
    },
  });

  // Fetch current user's goal
  const { data: myGoal } = useQuery({
    queryKey: ["my-goal", selectedMonth, selectedYear, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("individual_goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("month", selectedMonth)
        .eq("year", selectedYear)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch records
  const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
  const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-31`;

  const { data: revenueRecords } = useQuery({
    queryKey: ["revenue-perf", selectedMonth, selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase.from("revenue_records").select("*").gte("date", startDate).lte("date", endDate);
      if (error) throw error;
      return data;
    },
  });

  const { data: npsRecords } = useQuery({
    queryKey: ["nps-perf", selectedMonth, selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase.from("nps_records").select("*").gte("date", startDate).lte("date", endDate);
      if (error) throw error;
      return data;
    },
  });

  const { data: testimonialRecords } = useQuery({
    queryKey: ["testimonials-perf", selectedMonth, selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase.from("testimonial_records").select("*").gte("date", startDate).lte("date", endDate);
      if (error) throw error;
      return data;
    },
  });

  const { data: referralRecords } = useQuery({
    queryKey: ["referrals-perf", selectedMonth, selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase.from("referral_records").select("*").gte("date", startDate).lte("date", endDate);
      if (error) throw error;
      return data;
    },
  });

  const { data: otherIndicators } = useQuery({
    queryKey: ["other-perf", selectedMonth, selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase.from("other_indicators").select("*").gte("date", startDate).lte("date", endDate);
      if (error) throw error;
      return data;
    },
  });

  // Save goal mutation
  const saveGoalMutation = useMutation({
    mutationFn: async (goalData: typeof goalForm) => {
      if (!user?.id || !profile?.team_id) throw new Error("Usuário não autenticado");
      const payload = {
        user_id: user.id,
        team_id: profile.team_id,
        month: selectedMonth,
        year: selectedYear,
        revenue_goal: parseFloat(goalData.revenue_goal.replace(/\./g, "").replace(",", ".")) || 0,
        meta2_goal: parseFloat(goalData.meta2_goal.replace(/\./g, "").replace(",", ".")) || 0,
        meta3_goal: parseFloat(goalData.meta3_goal.replace(/\./g, "").replace(",", ".")) || 0,
        nps_goal: parseInt(goalData.nps_goal) || 0,
        testimonials_goal: parseInt(goalData.testimonials_goal) || 0,
        referrals_goal: parseInt(goalData.referrals_goal) || 0,
      };
      if (myGoal) {
        const { error } = await supabase.from("individual_goals").update(payload).eq("id", myGoal.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("individual_goals").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-goal"] });
      queryClient.invalidateQueries({ queryKey: ["individual-goals"] });
      toast({ title: "Meta salva com sucesso!" });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Erro ao salvar meta", description: error.message, variant: "destructive" });
    },
  });

  // Calculate individual progress
  const calculateProgress = (userId: string) => {
    const userRevenue = revenueRecords?.filter(r => r.user_id === userId).reduce((sum, r) => sum + Number(r.amount), 0) || 0;
    const userNps = npsRecords?.filter(r => r.user_id === userId).length || 0;
    const userTestimonials = testimonialRecords?.filter(r => r.user_id === userId).length || 0;
    const userReferrals = referralRecords?.filter(r => r.user_id === userId).reduce((sum, r) => sum + r.collected + r.to_consultation + r.to_surgery, 0) || 0;
    return { revenue: userRevenue, nps: userNps, testimonials: userTestimonials, referrals: userReferrals };
  };

  const calculateMemberPerformance = (): MemberPerformance[] => {
    if (!profiles || !teams) return [];
    const teamMap = new Map(teams.map(t => [t.id, t.name]));
    return profiles.map(profile => {
      const userRevenue = revenueRecords?.filter(r => r.user_id === profile.user_id) || [];
      const revenue = userRevenue.reduce((sum, r) => sum + Number(r.amount), 0);
      const revenuePoints = Math.floor(revenue / 10000);
      const userNps = npsRecords?.filter(r => r.user_id === profile.user_id) || [];
      let npsPoints = 0;
      userNps.forEach(n => {
        if (n.score === 9) npsPoints += 3;
        if (n.score === 10) npsPoints += 5;
        if (n.cited_member) npsPoints += 10;
      });
      const userTestimonials = testimonialRecords?.filter(r => r.user_id === profile.user_id) || [];
      let testimonialPoints = 0;
      userTestimonials.forEach(t => {
        if (t.type === "google") testimonialPoints += 10;
        if (t.type === "video") testimonialPoints += 20;
        if (t.type === "gold") testimonialPoints += 40;
      });
      const userReferrals = referralRecords?.filter(r => r.user_id === profile.user_id) || [];
      let referralPoints = 0;
      userReferrals.forEach(r => {
        referralPoints += r.collected * 5;
        referralPoints += r.to_consultation * 15;
        referralPoints += r.to_surgery * 30;
      });
      const userOther = otherIndicators?.filter(r => r.user_id === profile.user_id) || [];
      let otherPoints = 0;
      userOther.forEach(o => {
        otherPoints += o.unilovers * 5;
        otherPoints += o.ambassadors * 50;
        otherPoints += o.instagram_mentions * 2;
      });
      return {
        userId: profile.user_id,
        name: profile.full_name,
        teamId: profile.team_id || "",
        teamName: profile.team_id ? teamMap.get(profile.team_id) || "Sem equipe" : "Sem equipe",
        revenue,
        revenuePoints,
        npsCount: userNps.length,
        npsPoints,
        testimonials: userTestimonials.length,
        testimonialPoints,
        referrals: userReferrals.reduce((sum, r) => sum + r.collected + r.to_consultation + r.to_surgery, 0),
        referralPoints,
        otherPoints,
        totalPoints: revenuePoints + npsPoints + testimonialPoints + referralPoints + otherPoints,
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints);
  };

  const memberPerformance = calculateMemberPerformance();
  const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  const getProgressPercent = (actual: number, goal: number) => goal > 0 ? Math.min(Math.round((actual / goal) * 100), 100) : 0;
  const myProgress = user?.id ? calculateProgress(user.id) : { revenue: 0, nps: 0, testimonials: 0, referrals: 0 };

  const getPositionIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-primary" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="text-muted-foreground font-medium">{index + 1}º</span>;
  };

  const openEditDialog = () => {
    setGoalForm({
      revenue_goal: myGoal?.revenue_goal?.toString() || "",
      meta2_goal: myGoal?.meta2_goal?.toString() || "",
      meta3_goal: myGoal?.meta3_goal?.toString() || "",
      nps_goal: myGoal?.nps_goal?.toString() || "",
      testimonials_goal: myGoal?.testimonials_goal?.toString() || "",
      referrals_goal: myGoal?.referrals_goal?.toString() || "",
    });
    setIsDialogOpen(true);
  };

  const getTeamMembers = (teamId: string) => memberPerformance.filter(m => m.teamId === teamId);

  // Calculate team totals
  const calculateTeamTotals = (teamId: string) => {
    const teamMembers = profiles?.filter(p => p.team_id === teamId) || [];
    const teamGoals = allGoals?.filter(g => g.team_id === teamId) || [];
    let totalRevenueGoal = 0, totalNpsGoal = 0, totalTestimonialsGoal = 0, totalReferralsGoal = 0;
    let totalRevenue = 0, totalNps = 0, totalTestimonials = 0, totalReferrals = 0;
    teamMembers.forEach(member => {
      const goal = teamGoals.find(g => g.user_id === member.user_id);
      if (goal) {
        totalRevenueGoal += Number(goal.revenue_goal);
        totalNpsGoal += goal.nps_goal;
        totalTestimonialsGoal += goal.testimonials_goal;
        totalReferralsGoal += goal.referrals_goal;
      }
      const progress = calculateProgress(member.user_id);
      totalRevenue += progress.revenue;
      totalNps += progress.nps;
      totalTestimonials += progress.testimonials;
      totalReferrals += progress.referrals;
    });
    return {
      goals: { revenue: totalRevenueGoal, nps: totalNpsGoal, testimonials: totalTestimonialsGoal, referrals: totalReferralsGoal },
      actual: { revenue: totalRevenue, nps: totalNps, testimonials: totalTestimonials, referrals: totalReferrals },
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Desempenho & Metas</h1>
          <p className="text-muted-foreground">Ranking individual e acompanhamento de metas</p>
        </div>

        {/* Month/Year Selector */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((month, index) => (
                <SelectItem key={index} value={(index + 1).toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="tracking" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-6">
            <TabsTrigger value="tracking">Acompanhamento</TabsTrigger>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
            <TabsTrigger value="departments">Departamentos</TabsTrigger>
            <TabsTrigger value="my-goals">Minhas Metas</TabsTrigger>
            <TabsTrigger value="team">Minha Equipe</TabsTrigger>
            <TabsTrigger value="all">Visão Geral</TabsTrigger>
          </TabsList>

          {/* GOAL TRACKING - Meta vs Realizado */}
          <TabsContent value="tracking" className="space-y-6">
            <GoalTrackingDashboard month={selectedMonth} year={selectedYear} />
          </TabsContent>

          {/* DEPARTMENT GOALS */}
          <TabsContent value="departments" className="space-y-6">
            <DepartmentGoalsCard month={selectedMonth} year={selectedYear} />
          </TabsContent>

          {/* RANKING */}
          <TabsContent value="ranking" className="space-y-4">
            <div className="grid gap-4">
              {memberPerformance.map((member, index) => (
                <Card key={member.userId} className={`transition-all ${index === 0 ? "border-primary/50 bg-gradient-to-r from-primary/10 to-primary/5" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10">{getPositionIcon(index)}</div>
                      <div className="flex-1">
                        <p className="font-semibold text-lg">{member.name}</p>
                        <Badge variant="secondary" className="text-xs">{member.teamName}</Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{member.totalPoints}</p>
                        <p className="text-xs text-muted-foreground">pontos</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-5 gap-2 text-center text-xs">
                      <div className="p-2 bg-green-500/10 rounded">
                        <DollarSign className="w-4 h-4 mx-auto text-green-500 mb-1" />
                        <p className="font-semibold">{member.revenuePoints}</p>
                        <p className="text-muted-foreground">Fat.</p>
                      </div>
                      <div className="p-2 bg-blue-500/10 rounded">
                        <MessageSquare className="w-4 h-4 mx-auto text-blue-500 mb-1" />
                        <p className="font-semibold">{member.npsPoints}</p>
                        <p className="text-muted-foreground">NPS</p>
                      </div>
                      <div className="p-2 bg-purple-500/10 rounded">
                        <Star className="w-4 h-4 mx-auto text-purple-500 mb-1" />
                        <p className="font-semibold">{member.testimonialPoints}</p>
                        <p className="text-muted-foreground">Dep.</p>
                      </div>
                      <div className="p-2 bg-cyan-500/10 rounded">
                        <Users className="w-4 h-4 mx-auto text-cyan-500 mb-1" />
                        <p className="font-semibold">{member.referralPoints}</p>
                        <p className="text-muted-foreground">Ind.</p>
                      </div>
                      <div className="p-2 bg-pink-500/10 rounded">
                        <TrendingUp className="w-4 h-4 mx-auto text-pink-500 mb-1" />
                        <p className="font-semibold">{member.otherPoints}</p>
                        <p className="text-muted-foreground">Outros</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* MINHAS METAS */}
          <TabsContent value="my-goals" className="space-y-6">
            {user ? (
              <Card className="border-primary/30">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Minhas Metas - {MONTHS[selectedMonth - 1]} {selectedYear}
                  </CardTitle>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={openEditDialog}>
                        <Edit className="w-4 h-4 mr-2" />
                        {myGoal ? "Editar" : "Definir"} Metas
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Definir Metas - {MONTHS[selectedMonth - 1]} {selectedYear}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        {/* Metas de Faturamento */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm text-primary flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Metas de Faturamento
                          </h4>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label className="text-xs text-success">Meta 1 (R$)</Label>
                              <Input type="text" placeholder="50.000" value={goalForm.revenue_goal} onChange={(e) => setGoalForm({ ...goalForm, revenue_goal: e.target.value })} className="text-sm" />
                            </div>
                            <div>
                              <Label className="text-xs text-success">Meta 2 (R$)</Label>
                              <Input type="text" placeholder="70.000" value={goalForm.meta2_goal} onChange={(e) => setGoalForm({ ...goalForm, meta2_goal: e.target.value })} className="text-sm" />
                            </div>
                            <div>
                              <Label className="text-xs text-primary">Meta 3 (R$)</Label>
                              <Input type="text" placeholder="100.000" value={goalForm.meta3_goal} onChange={(e) => setGoalForm({ ...goalForm, meta3_goal: e.target.value })} className="text-sm" />
                            </div>
                          </div>
                        </div>
                        {/* Outras Metas */}
                        <div className="space-y-3 border-t border-border pt-4">
                          <h4 className="font-semibold text-sm text-muted-foreground">Outras Metas</h4>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label className="text-xs">NPS (qtd)</Label>
                              <Input type="number" placeholder="10" value={goalForm.nps_goal} onChange={(e) => setGoalForm({ ...goalForm, nps_goal: e.target.value })} className="text-sm" />
                            </div>
                            <div>
                              <Label className="text-xs">Depoimentos (qtd)</Label>
                              <Input type="number" placeholder="5" value={goalForm.testimonials_goal} onChange={(e) => setGoalForm({ ...goalForm, testimonials_goal: e.target.value })} className="text-sm" />
                            </div>
                            <div>
                              <Label className="text-xs">Indicações (qtd)</Label>
                              <Input type="number" placeholder="8" value={goalForm.referrals_goal} onChange={(e) => setGoalForm({ ...goalForm, referrals_goal: e.target.value })} className="text-sm" />
                            </div>
                          </div>
                        </div>
                        <Button className="w-full" onClick={() => saveGoalMutation.mutate(goalForm)} disabled={saveGoalMutation.isPending}>
                          {saveGoalMutation.isPending ? "Salvando..." : "Salvar Metas"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {myGoal ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-green-500/10 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-500" />
                            <span className="font-medium">Faturamento</span>
                          </div>
                          {getProgressPercent(myProgress.revenue, Number(myGoal.revenue_goal)) >= 100 && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                        </div>
                        <Progress value={getProgressPercent(myProgress.revenue, Number(myGoal.revenue_goal))} className="h-3 mb-2" />
                        <div className="flex justify-between text-sm">
                          <span>{formatCurrency(myProgress.revenue)}</span>
                          <span className="text-muted-foreground">Meta: {formatCurrency(Number(myGoal.revenue_goal))}</span>
                        </div>
                      </div>
                      <div className="p-4 bg-blue-500/10 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-blue-500" />
                            <span className="font-medium">NPS</span>
                          </div>
                          {getProgressPercent(myProgress.nps, myGoal.nps_goal || 0) >= 100 && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                        </div>
                        <Progress value={getProgressPercent(myProgress.nps, myGoal.nps_goal || 0)} className="h-3 mb-2" />
                        <div className="flex justify-between text-sm">
                          <span>{myProgress.nps} registros</span>
                          <span className="text-muted-foreground">Meta: {myGoal.nps_goal}</span>
                        </div>
                      </div>
                      <div className="p-4 bg-purple-500/10 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Star className="w-5 h-5 text-purple-500" />
                            <span className="font-medium">Depoimentos</span>
                          </div>
                          {getProgressPercent(myProgress.testimonials, myGoal.testimonials_goal || 0) >= 100 && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                        </div>
                        <Progress value={getProgressPercent(myProgress.testimonials, myGoal.testimonials_goal || 0)} className="h-3 mb-2" />
                        <div className="flex justify-between text-sm">
                          <span>{myProgress.testimonials}</span>
                          <span className="text-muted-foreground">Meta: {myGoal.testimonials_goal}</span>
                        </div>
                      </div>
                      <div className="p-4 bg-cyan-500/10 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-cyan-500" />
                            <span className="font-medium">Indicações</span>
                          </div>
                          {getProgressPercent(myProgress.referrals, myGoal.referrals_goal || 0) >= 100 && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                        </div>
                        <Progress value={getProgressPercent(myProgress.referrals, myGoal.referrals_goal || 0)} className="h-3 mb-2" />
                        <div className="flex justify-between text-sm">
                          <span>{myProgress.referrals}</span>
                          <span className="text-muted-foreground">Meta: {myGoal.referrals_goal}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Você ainda não definiu metas para este mês.</p>
                      <Button variant="outline" className="mt-4" onClick={openEditDialog}>Definir Metas</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Faça login para ver suas metas</CardContent></Card>
            )}
          </TabsContent>

          {/* MINHA EQUIPE */}
          <TabsContent value="team" className="space-y-6">
            {teams?.map(team => {
              const teamMembers = getTeamMembers(team.id);
              const teamTotal = teamMembers.reduce((sum, m) => sum + m.totalPoints, 0);
              const teamTotals = calculateTeamTotals(team.id);
              return (
                <Card key={team.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between">
                      <span>{team.name}</span>
                      <Badge className="bg-primary text-lg px-3">{teamTotal} pts</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="p-3 bg-green-500/10 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">Faturamento</p>
                        <p className="font-bold">{formatCurrency(teamTotals.actual.revenue)}</p>
                        {teamTotals.goals.revenue > 0 && (
                          <Progress value={getProgressPercent(teamTotals.actual.revenue, teamTotals.goals.revenue)} className="h-1 mt-1" />
                        )}
                      </div>
                      <div className="p-3 bg-blue-500/10 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">NPS</p>
                        <p className="font-bold">{teamTotals.actual.nps}</p>
                        {teamTotals.goals.nps > 0 && (
                          <Progress value={getProgressPercent(teamTotals.actual.nps, teamTotals.goals.nps)} className="h-1 mt-1" />
                        )}
                      </div>
                      <div className="p-3 bg-purple-500/10 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">Depoimentos</p>
                        <p className="font-bold">{teamTotals.actual.testimonials}</p>
                        {teamTotals.goals.testimonials > 0 && (
                          <Progress value={getProgressPercent(teamTotals.actual.testimonials, teamTotals.goals.testimonials)} className="h-1 mt-1" />
                        )}
                      </div>
                      <div className="p-3 bg-cyan-500/10 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">Indicações</p>
                        <p className="font-bold">{teamTotals.actual.referrals}</p>
                        {teamTotals.goals.referrals > 0 && (
                          <Progress value={getProgressPercent(teamTotals.actual.referrals, teamTotals.goals.referrals)} className="h-1 mt-1" />
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {teamMembers.map((member, index) => {
                        const contribution = teamTotal > 0 ? Math.round((member.totalPoints / teamTotal) * 100) : 0;
                        return (
                          <div key={member.userId} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-muted-foreground">{index + 1}º</span>
                              <span className="font-medium">{member.name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-semibold">{member.totalPoints} pts</p>
                                <p className="text-xs text-muted-foreground">{contribution}% do time</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* VISÃO GERAL */}
          <TabsContent value="all" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {teams?.map(team => {
                const teamTotals = calculateTeamTotals(team.id);
                return (
                  <Card key={team.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-primary" />
                        {team.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-3 bg-green-500/10 rounded-lg">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">Faturamento</span>
                            <span className="text-sm font-medium">{formatCurrency(teamTotals.actual.revenue)} / {formatCurrency(teamTotals.goals.revenue)}</span>
                          </div>
                          <Progress value={getProgressPercent(teamTotals.actual.revenue, teamTotals.goals.revenue)} className="h-2" />
                        </div>
                        <div className="p-3 bg-blue-500/10 rounded-lg">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">NPS</span>
                            <span className="text-sm font-medium">{teamTotals.actual.nps} / {teamTotals.goals.nps}</span>
                          </div>
                          <Progress value={getProgressPercent(teamTotals.actual.nps, teamTotals.goals.nps)} className="h-2" />
                        </div>
                        <div className="p-3 bg-purple-500/10 rounded-lg">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">Depoimentos</span>
                            <span className="text-sm font-medium">{teamTotals.actual.testimonials} / {teamTotals.goals.testimonials}</span>
                          </div>
                          <Progress value={getProgressPercent(teamTotals.actual.testimonials, teamTotals.goals.testimonials)} className="h-2" />
                        </div>
                        <div className="p-3 bg-cyan-500/10 rounded-lg">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">Indicações</span>
                            <span className="text-sm font-medium">{teamTotals.actual.referrals} / {teamTotals.goals.referrals}</span>
                          </div>
                          <Progress value={getProgressPercent(teamTotals.actual.referrals, teamTotals.goals.referrals)} className="h-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Performance;
