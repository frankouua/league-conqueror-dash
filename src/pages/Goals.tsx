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
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import GoalProgressDashboard from "@/components/GoalProgressDashboard";
import DepartmentGoalsCard from "@/components/DepartmentGoalsCard";
import GoalTrackingDashboard from "@/components/GoalTrackingDashboard";
import IndividualGoalsForm from "@/components/IndividualGoalsForm";
import PersonalGoalsByDepartment from "@/components/PersonalGoalsByDepartment";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const Goals = () => {
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

  // Fetch records for the selected month
  const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
  const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-31`;

  const { data: revenueRecords } = useQuery({
    queryKey: ["revenue-goals", selectedMonth, selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_records")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data;
    },
  });

  const { data: npsRecords } = useQuery({
    queryKey: ["nps-goals", selectedMonth, selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nps_records")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data;
    },
  });

  const { data: testimonialRecords } = useQuery({
    queryKey: ["testimonials-goals", selectedMonth, selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonial_records")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data;
    },
  });

  const { data: referralRecords } = useQuery({
    queryKey: ["referrals-goals", selectedMonth, selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_records")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate);
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
        const { error } = await supabase
          .from("individual_goals")
          .update(payload)
          .eq("id", myGoal.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("individual_goals")
          .insert(payload);
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

  const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  const getProgressPercent = (actual: number, goal: number) => goal > 0 ? Math.min(Math.round((actual / goal) * 100), 100) : 0;
  const myProgress = user?.id ? calculateProgress(user.id) : { revenue: 0, nps: 0, testimonials: 0, referrals: 0 };

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Metas Individuais</h1>
          <p className="text-muted-foreground">Defina suas metas e acompanhe seu progresso</p>
        </div>

        {/* Month/Year Selector */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month, index) => (
                <SelectItem key={index} value={(index + 1).toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="tracking" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-6">
            <TabsTrigger value="tracking">Acompanhamento</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="departments">Departamentos</TabsTrigger>
            <TabsTrigger value="my-goals">Minhas Metas</TabsTrigger>
            <TabsTrigger value="team">Minha Equipe</TabsTrigger>
            <TabsTrigger value="all">Visão Geral</TabsTrigger>
          </TabsList>

          {/* Goal Tracking Tab - Meta vs Realizado */}
          <TabsContent value="tracking" className="space-y-6">
            <GoalTrackingDashboard month={selectedMonth} year={selectedYear} />
          </TabsContent>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <GoalProgressDashboard />
          </TabsContent>

          {/* Department Goals Tab */}
          <TabsContent value="departments" className="space-y-6">
            <DepartmentGoalsCard month={selectedMonth} year={selectedYear} />
          </TabsContent>

          {/* My Goals Tab */}
          <TabsContent value="my-goals" className="space-y-6">
            {user ? (
              <>
                {/* Metas Pessoais por Departamento com Meta 1, 2, 3 */}
                <PersonalGoalsByDepartment month={selectedMonth} year={selectedYear} />
                
                {/* Formulário de edição de metas */}
                <IndividualGoalsForm month={selectedMonth} year={selectedYear} />
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">Faça login para definir suas metas.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-6">
            {profile?.team_id && teams ? (
              <>
                {(() => {
                  const team = teams.find(t => t.id === profile.team_id);
                  const teamTotals = calculateTeamTotals(profile.team_id);
                  const teamMembers = profiles?.filter(p => p.team_id === profile.team_id) || [];

                  return (
                    <>
                      <Card className="border-primary/30">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-primary" />
                            {team?.name} - Meta Coletiva
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-green-500/10 rounded-lg text-center">
                              <DollarSign className="w-6 h-6 text-green-500 mx-auto mb-2" />
                              <p className="text-2xl font-bold">{formatCurrency(teamTotals.actual.revenue)}</p>
                              <p className="text-sm text-muted-foreground">de {formatCurrency(teamTotals.goals.revenue)}</p>
                              <Progress value={getProgressPercent(teamTotals.actual.revenue, teamTotals.goals.revenue)} className="h-2 mt-2" />
                            </div>
                            <div className="p-4 bg-blue-500/10 rounded-lg text-center">
                              <MessageSquare className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                              <p className="text-2xl font-bold">{teamTotals.actual.nps}</p>
                              <p className="text-sm text-muted-foreground">de {teamTotals.goals.nps} NPS</p>
                              <Progress value={getProgressPercent(teamTotals.actual.nps, teamTotals.goals.nps)} className="h-2 mt-2" />
                            </div>
                            <div className="p-4 bg-purple-500/10 rounded-lg text-center">
                              <Star className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                              <p className="text-2xl font-bold">{teamTotals.actual.testimonials}</p>
                              <p className="text-sm text-muted-foreground">de {teamTotals.goals.testimonials} dep.</p>
                              <Progress value={getProgressPercent(teamTotals.actual.testimonials, teamTotals.goals.testimonials)} className="h-2 mt-2" />
                            </div>
                            <div className="p-4 bg-cyan-500/10 rounded-lg text-center">
                              <Users className="w-6 h-6 text-cyan-500 mx-auto mb-2" />
                              <p className="text-2xl font-bold">{teamTotals.actual.referrals}</p>
                              <p className="text-sm text-muted-foreground">de {teamTotals.goals.referrals} ind.</p>
                              <Progress value={getProgressPercent(teamTotals.actual.referrals, teamTotals.goals.referrals)} className="h-2 mt-2" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Contribuição Individual</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {teamMembers.map(member => {
                              const memberGoal = allGoals?.find(g => g.user_id === member.user_id);
                              const memberProgress = calculateProgress(member.user_id);

                              return (
                                <div key={member.user_id} className="p-4 bg-muted/50 rounded-lg">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold">{member.full_name}</span>
                                      {member.user_id === user?.id && (
                                        <Badge variant="secondary" className="text-xs">Você</Badge>
                                      )}
                                    </div>
                                    {!memberGoal && (
                                      <Badge variant="outline" className="text-xs text-muted-foreground">Sem meta</Badge>
                                    )}
                                  </div>
                                  {memberGoal ? (
                                    <div className="grid grid-cols-4 gap-2 text-sm">
                                      <div>
                                        <p className="text-muted-foreground">Faturamento</p>
                                        <p className="font-medium">{formatCurrency(memberProgress.revenue)}</p>
                                        <p className="text-xs text-muted-foreground">de {formatCurrency(Number(memberGoal.revenue_goal))}</p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">NPS</p>
                                        <p className="font-medium">{memberProgress.nps}</p>
                                        <p className="text-xs text-muted-foreground">de {memberGoal.nps_goal}</p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">Depoimentos</p>
                                        <p className="font-medium">{memberProgress.testimonials}</p>
                                        <p className="text-xs text-muted-foreground">de {memberGoal.testimonials_goal}</p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">Indicações</p>
                                        <p className="font-medium">{memberProgress.referrals}</p>
                                        <p className="text-xs text-muted-foreground">de {memberGoal.referrals_goal}</p>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-4 gap-2 text-sm">
                                      <div>
                                        <p className="text-muted-foreground">Faturamento</p>
                                        <p className="font-medium">{formatCurrency(memberProgress.revenue)}</p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">NPS</p>
                                        <p className="font-medium">{memberProgress.nps}</p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">Depoimentos</p>
                                        <p className="font-medium">{memberProgress.testimonials}</p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">Indicações</p>
                                        <p className="font-medium">{memberProgress.referrals}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  );
                })()}
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">Você não está em nenhuma equipe.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* All Teams Tab */}
          <TabsContent value="all" className="space-y-6">
            {teams?.map(team => {
              const teamTotals = calculateTeamTotals(team.id);

              return (
                <Card key={team.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{team.name}</span>
                      <Badge className="bg-primary">
                        {getProgressPercent(
                          teamTotals.actual.revenue + teamTotals.actual.nps + teamTotals.actual.testimonials + teamTotals.actual.referrals,
                          teamTotals.goals.revenue + teamTotals.goals.nps + teamTotals.goals.testimonials + teamTotals.goals.referrals
                        ) || 0}% das metas
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-lg font-bold text-green-600">{formatCurrency(teamTotals.actual.revenue)}</p>
                        <p className="text-xs text-muted-foreground">de {formatCurrency(teamTotals.goals.revenue)}</p>
                        <Progress value={getProgressPercent(teamTotals.actual.revenue, teamTotals.goals.revenue)} className="h-1 mt-1" />
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-blue-600">{teamTotals.actual.nps} NPS</p>
                        <p className="text-xs text-muted-foreground">de {teamTotals.goals.nps}</p>
                        <Progress value={getProgressPercent(teamTotals.actual.nps, teamTotals.goals.nps)} className="h-1 mt-1" />
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-purple-600">{teamTotals.actual.testimonials} Dep.</p>
                        <p className="text-xs text-muted-foreground">de {teamTotals.goals.testimonials}</p>
                        <Progress value={getProgressPercent(teamTotals.actual.testimonials, teamTotals.goals.testimonials)} className="h-1 mt-1" />
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-cyan-600">{teamTotals.actual.referrals} Ind.</p>
                        <p className="text-xs text-muted-foreground">de {teamTotals.goals.referrals}</p>
                        <Progress value={getProgressPercent(teamTotals.actual.referrals, teamTotals.goals.referrals)} className="h-1 mt-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Goals;
