import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, eachWeekOfInterval, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, DollarSign, Star, MessageSquare, Users, Award, Loader2 } from "lucide-react";

const CHART_COLORS = {
  team1: "hsl(43, 65%, 52%)", // Gold
  team2: "hsl(217, 91%, 60%)", // Blue
  revenue: "hsl(160, 84%, 39%)", // Green
  nps: "hsl(280, 70%, 60%)", // Purple
  testimonial: "hsl(340, 80%, 55%)", // Pink
  referral: "hsl(200, 80%, 50%)", // Cyan
};

const PIE_COLORS = ["hsl(43, 65%, 52%)", "hsl(217, 91%, 60%)", "hsl(160, 84%, 39%)", "hsl(280, 70%, 60%)"];

const Analytics = () => {
  const [period, setPeriod] = useState<"week" | "month" | "quarter">("month");

  // Fetch teams
  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch all records
  const { data: revenueRecords, isLoading: loadingRevenue } = useQuery({
    queryKey: ["revenue_records_analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("revenue_records").select("*, teams(name)").order("date");
      if (error) throw error;
      return data;
    },
  });

  const { data: npsRecords, isLoading: loadingNps } = useQuery({
    queryKey: ["nps_records_analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("nps_records").select("*, teams(name)").order("date");
      if (error) throw error;
      return data;
    },
  });

  const { data: testimonialRecords, isLoading: loadingTestimonials } = useQuery({
    queryKey: ["testimonial_records_analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("testimonial_records").select("*, teams(name)").order("date");
      if (error) throw error;
      return data;
    },
  });

  const { data: referralRecords, isLoading: loadingReferrals } = useQuery({
    queryKey: ["referral_records_analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("referral_records").select("*, teams(name)").order("date");
      if (error) throw error;
      return data;
    },
  });

  const { data: otherIndicators, isLoading: loadingIndicators } = useQuery({
    queryKey: ["other_indicators_analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("other_indicators").select("*, teams(name)").order("date");
      if (error) throw error;
      return data;
    },
  });

  const isLoading = loadingRevenue || loadingNps || loadingTestimonials || loadingReferrals || loadingIndicators;

  // Generate time periods
  const timeIntervals = useMemo(() => {
    const now = new Date();
    if (period === "week") {
      return eachWeekOfInterval({ start: subWeeks(now, 8), end: now });
    } else if (period === "month") {
      return eachMonthOfInterval({ start: subMonths(now, 6), end: now });
    } else {
      return eachMonthOfInterval({ start: subMonths(now, 12), end: now });
    }
  }, [period]);

  // Revenue evolution data
  const revenueEvolution = useMemo(() => {
    if (!revenueRecords || !teams) return [];

    return timeIntervals.map((interval) => {
      const periodStart = startOfMonth(interval);
      const periodEnd = endOfMonth(interval);
      const label = format(interval, period === "week" ? "dd/MM" : "MMM", { locale: ptBR });

      const dataPoint: any = { period: label };

      teams.forEach((team, idx) => {
        const teamRecords = revenueRecords.filter(
          (r) =>
            r.team_id === team.id &&
            new Date(r.date) >= periodStart &&
            new Date(r.date) <= periodEnd
        );
        dataPoint[`team${idx + 1}`] = teamRecords.reduce((sum, r) => sum + Number(r.amount), 0);
        dataPoint[`team${idx + 1}Name`] = team.name;
      });

      return dataPoint;
    });
  }, [revenueRecords, teams, timeIntervals, period]);

  // Cumulative revenue
  const cumulativeRevenue = useMemo(() => {
    if (!revenueRecords || !teams) return [];

    let cumulative: { [key: string]: number } = {};
    teams.forEach((_, idx) => {
      cumulative[`team${idx + 1}`] = 0;
    });

    return timeIntervals.map((interval) => {
      const periodStart = startOfMonth(interval);
      const periodEnd = endOfMonth(interval);
      const label = format(interval, period === "week" ? "dd/MM" : "MMM", { locale: ptBR });

      teams.forEach((team, idx) => {
        const teamRecords = revenueRecords.filter(
          (r) =>
            r.team_id === team.id &&
            new Date(r.date) >= periodStart &&
            new Date(r.date) <= periodEnd
        );
        cumulative[`team${idx + 1}`] += teamRecords.reduce((sum, r) => sum + Number(r.amount), 0);
      });

      return {
        period: label,
        ...Object.keys(cumulative).reduce((acc, key) => {
          acc[key] = cumulative[key];
          return acc;
        }, {} as any),
      };
    });
  }, [revenueRecords, teams, timeIntervals, period]);

  // NPS evolution data
  const npsEvolution = useMemo(() => {
    if (!npsRecords || !teams) return [];

    return timeIntervals.map((interval) => {
      const periodStart = startOfMonth(interval);
      const periodEnd = endOfMonth(interval);
      const label = format(interval, period === "week" ? "dd/MM" : "MMM", { locale: ptBR });

      const dataPoint: any = { period: label };

      teams.forEach((team, idx) => {
        const teamRecords = npsRecords.filter(
          (r) =>
            r.team_id === team.id &&
            new Date(r.date) >= periodStart &&
            new Date(r.date) <= periodEnd
        );
        const avgScore = teamRecords.length > 0
          ? teamRecords.reduce((sum, r) => sum + r.score, 0) / teamRecords.length
          : 0;
        dataPoint[`team${idx + 1}`] = Number(avgScore.toFixed(1));
        dataPoint[`team${idx + 1}Count`] = teamRecords.length;
      });

      return dataPoint;
    });
  }, [npsRecords, teams, timeIntervals, period]);

  // Testimonials by type
  const testimonialsByType = useMemo(() => {
    if (!testimonialRecords) return [];

    const types = { google: 0, video: 0, gold: 0 };
    testimonialRecords.forEach((t) => {
      types[t.type as keyof typeof types]++;
    });

    return [
      { name: "Google 5★", value: types.google, color: PIE_COLORS[0] },
      { name: "Vídeo", value: types.video, color: PIE_COLORS[1] },
      { name: "Ouro", value: types.gold, color: PIE_COLORS[2] },
    ];
  }, [testimonialRecords]);

  // Testimonials evolution
  const testimonialsEvolution = useMemo(() => {
    if (!testimonialRecords || !teams) return [];

    return timeIntervals.map((interval) => {
      const periodStart = startOfMonth(interval);
      const periodEnd = endOfMonth(interval);
      const label = format(interval, period === "week" ? "dd/MM" : "MMM", { locale: ptBR });

      const dataPoint: any = { period: label };

      teams.forEach((team, idx) => {
        const teamRecords = testimonialRecords.filter(
          (r) =>
            r.team_id === team.id &&
            new Date(r.date) >= periodStart &&
            new Date(r.date) <= periodEnd
        );
        dataPoint[`team${idx + 1}`] = teamRecords.length;
      });

      return dataPoint;
    });
  }, [testimonialRecords, teams, timeIntervals, period]);

  // Referrals evolution
  const referralsEvolution = useMemo(() => {
    if (!referralRecords || !teams) return [];

    return timeIntervals.map((interval) => {
      const periodStart = startOfMonth(interval);
      const periodEnd = endOfMonth(interval);
      const label = format(interval, period === "week" ? "dd/MM" : "MMM", { locale: ptBR });

      const periodRecords = referralRecords.filter(
        (r) => new Date(r.date) >= periodStart && new Date(r.date) <= periodEnd
      );

      return {
        period: label,
        coletadas: periodRecords.reduce((sum, r) => sum + r.collected, 0),
        consultas: periodRecords.reduce((sum, r) => sum + r.to_consultation, 0),
        cirurgias: periodRecords.reduce((sum, r) => sum + r.to_surgery, 0),
      };
    });
  }, [referralRecords, timeIntervals, period]);

  // Other indicators summary
  const indicatorsSummary = useMemo(() => {
    if (!otherIndicators || !teams) return [];

    return teams.map((team) => {
      const teamRecords = otherIndicators.filter((r) => r.team_id === team.id);
      return {
        name: team.name,
        embaixadores: teamRecords.reduce((sum, r) => sum + r.ambassadors, 0),
        unilovers: teamRecords.reduce((sum, r) => sum + r.unilovers, 0),
        instagram: teamRecords.reduce((sum, r) => sum + r.instagram_mentions, 0),
      };
    });
  }, [otherIndicators, teams]);

  const chartTooltipStyle = {
    contentStyle: {
      backgroundColor: "hsl(0 0% 8%)",
      border: "1px solid hsl(0 0% 18%)",
      borderRadius: "12px",
      padding: "12px",
    },
    labelStyle: { color: "hsl(0 0% 98%)", fontWeight: "bold" },
    itemStyle: { color: "hsl(0 0% 80%)" },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando análises...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Análise de Evolução</h1>
            <p className="text-muted-foreground">Acompanhe a evolução dos indicadores ao longo do tempo</p>
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Últimas 8 semanas</SelectItem>
              <SelectItem value="month">Últimos 6 meses</SelectItem>
              <SelectItem value="quarter">Último ano</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="revenue" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-2 bg-transparent h-auto p-0">
            <TabsTrigger value="revenue" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <DollarSign className="w-4 h-4 mr-2" />
              Faturamento
            </TabsTrigger>
            <TabsTrigger value="nps" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Star className="w-4 h-4 mr-2" />
              NPS
            </TabsTrigger>
            <TabsTrigger value="testimonials" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <MessageSquare className="w-4 h-4 mr-2" />
              Depoimentos
            </TabsTrigger>
            <TabsTrigger value="referrals" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="w-4 h-4 mr-2" />
              Indicações
            </TabsTrigger>
            <TabsTrigger value="indicators" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Award className="w-4 h-4 mr-2" />
              Indicadores
            </TabsTrigger>
          </TabsList>

          {/* Revenue Tab */}
          <TabsContent value="revenue" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border/50 bg-card/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Faturamento Mensal por Equipe
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueEvolution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 18%)" vertical={false} />
                        <XAxis dataKey="period" stroke="hsl(0 0% 60%)" fontSize={12} tickLine={false} />
                        <YAxis stroke="hsl(0 0% 60%)" fontSize={12} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip {...chartTooltipStyle} formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR")}`} />
                        <Legend />
                        <Bar dataKey="team1" name={teams?.[0]?.name || "Equipe 1"} fill={CHART_COLORS.team1} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="team2" name={teams?.[1]?.name || "Equipe 2"} fill={CHART_COLORS.team2} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    Faturamento Acumulado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cumulativeRevenue}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 18%)" vertical={false} />
                        <XAxis dataKey="period" stroke="hsl(0 0% 60%)" fontSize={12} tickLine={false} />
                        <YAxis stroke="hsl(0 0% 60%)" fontSize={12} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                        <Tooltip {...chartTooltipStyle} formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR")}`} />
                        <Legend />
                        <Area type="monotone" dataKey="team1" name={teams?.[0]?.name || "Equipe 1"} stroke={CHART_COLORS.team1} fill={CHART_COLORS.team1} fillOpacity={0.3} />
                        <Area type="monotone" dataKey="team2" name={teams?.[1]?.name || "Equipe 2"} stroke={CHART_COLORS.team2} fill={CHART_COLORS.team2} fillOpacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* NPS Tab */}
          <TabsContent value="nps" className="space-y-6">
            <Card className="border-border/50 bg-card/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  Média NPS por Período
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={npsEvolution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 18%)" vertical={false} />
                      <XAxis dataKey="period" stroke="hsl(0 0% 60%)" fontSize={12} tickLine={false} />
                      <YAxis stroke="hsl(0 0% 60%)" fontSize={12} tickLine={false} domain={[0, 10]} />
                      <Tooltip {...chartTooltipStyle} />
                      <Legend />
                      <Line type="monotone" dataKey="team1" name={teams?.[0]?.name || "Equipe 1"} stroke={CHART_COLORS.team1} strokeWidth={3} dot={{ fill: CHART_COLORS.team1, r: 4 }} />
                      <Line type="monotone" dataKey="team2" name={teams?.[1]?.name || "Equipe 2"} stroke={CHART_COLORS.team2} strokeWidth={3} dot={{ fill: CHART_COLORS.team2, r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Testimonials Tab */}
          <TabsContent value="testimonials" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border/50 bg-card/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    Depoimentos por Tipo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={testimonialsByType}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {testimonialsByType.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip {...chartTooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Depoimentos por Período
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={testimonialsEvolution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 18%)" vertical={false} />
                        <XAxis dataKey="period" stroke="hsl(0 0% 60%)" fontSize={12} tickLine={false} />
                        <YAxis stroke="hsl(0 0% 60%)" fontSize={12} tickLine={false} />
                        <Tooltip {...chartTooltipStyle} />
                        <Legend />
                        <Bar dataKey="team1" name={teams?.[0]?.name || "Equipe 1"} fill={CHART_COLORS.team1} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="team2" name={teams?.[1]?.name || "Equipe 2"} fill={CHART_COLORS.team2} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Referrals Tab */}
          <TabsContent value="referrals" className="space-y-6">
            <Card className="border-border/50 bg-card/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Indicações por Período
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={referralsEvolution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 18%)" vertical={false} />
                      <XAxis dataKey="period" stroke="hsl(0 0% 60%)" fontSize={12} tickLine={false} />
                      <YAxis stroke="hsl(0 0% 60%)" fontSize={12} tickLine={false} />
                      <Tooltip {...chartTooltipStyle} />
                      <Legend />
                      <Area type="monotone" dataKey="coletadas" name="Coletadas" stroke="hsl(200, 80%, 50%)" fill="hsl(200, 80%, 50%)" fillOpacity={0.3} />
                      <Area type="monotone" dataKey="consultas" name="Consultas" stroke="hsl(43, 65%, 52%)" fill="hsl(43, 65%, 52%)" fillOpacity={0.3} />
                      <Area type="monotone" dataKey="cirurgias" name="Cirurgias" stroke="hsl(160, 84%, 39%)" fill="hsl(160, 84%, 39%)" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Indicators Tab */}
          <TabsContent value="indicators" className="space-y-6">
            <Card className="border-border/50 bg-card/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  Indicadores por Equipe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={indicatorsSummary} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 18%)" horizontal={false} />
                      <XAxis type="number" stroke="hsl(0 0% 60%)" fontSize={12} tickLine={false} />
                      <YAxis dataKey="name" type="category" stroke="hsl(0 0% 60%)" fontSize={12} tickLine={false} width={120} />
                      <Tooltip {...chartTooltipStyle} />
                      <Legend />
                      <Bar dataKey="embaixadores" name="Embaixadores" fill="hsl(43, 65%, 52%)" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="unilovers" name="Unilovers" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="instagram" name="Menções IG" fill="hsl(340, 80%, 55%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Analytics;
