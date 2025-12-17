import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  DollarSign, 
  Star, 
  Users, 
  MessageSquare,
  Trophy,
  TrendingUp,
  Award,
  Medal,
  LineChart as LineChartIcon
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  BarChart,
  Bar,
} from "recharts";
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

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

const Individual = () => {
  const [selectedMember, setSelectedMember] = useState<string>("all");

  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: revenueRecords } = useQuery({
    queryKey: ["revenue-individual"],
    queryFn: async () => {
      const { data, error } = await supabase.from("revenue_records").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: npsRecords } = useQuery({
    queryKey: ["nps-individual"],
    queryFn: async () => {
      const { data, error } = await supabase.from("nps_records").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: testimonialRecords } = useQuery({
    queryKey: ["testimonials-individual"],
    queryFn: async () => {
      const { data, error } = await supabase.from("testimonial_records").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: referralRecords } = useQuery({
    queryKey: ["referrals-individual"],
    queryFn: async () => {
      const { data, error } = await supabase.from("referral_records").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: otherIndicators } = useQuery({
    queryKey: ["other-individual"],
    queryFn: async () => {
      const { data, error } = await supabase.from("other_indicators").select("*");
      if (error) throw error;
      return data;
    },
  });

  const calculateMemberPerformance = (): MemberPerformance[] => {
    if (!profiles || !teams) return [];

    const teamMap = new Map(teams.map(t => [t.id, t.name]));
    
    return profiles.map(profile => {
      // Revenue
      const userRevenue = revenueRecords?.filter(r => r.user_id === profile.user_id) || [];
      const revenue = userRevenue.reduce((sum, r) => sum + Number(r.amount), 0);
      const revenuePoints = Math.floor(revenue / 10000);

      // NPS
      const userNps = npsRecords?.filter(r => r.user_id === profile.user_id) || [];
      let npsPoints = 0;
      userNps.forEach(n => {
        if (n.score === 9) npsPoints += 3;
        if (n.score === 10) npsPoints += 5;
        if (n.cited_member) npsPoints += 10;
      });

      // Testimonials
      const userTestimonials = testimonialRecords?.filter(r => r.user_id === profile.user_id) || [];
      let testimonialPoints = 0;
      userTestimonials.forEach(t => {
        if (t.type === "google") testimonialPoints += 10;
        if (t.type === "video") testimonialPoints += 20;
        if (t.type === "gold") testimonialPoints += 40;
      });

      // Referrals
      const userReferrals = referralRecords?.filter(r => r.user_id === profile.user_id) || [];
      let referralPoints = 0;
      userReferrals.forEach(r => {
        referralPoints += r.collected * 5;
        referralPoints += r.to_consultation * 15;
        referralPoints += r.to_surgery * 30;
      });

      // Other indicators
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
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getPositionIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-primary" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="text-muted-foreground font-medium">{index + 1}º</span>;
  };

  const getTeamMembers = (teamId: string) => {
    return memberPerformance.filter(m => m.teamId === teamId);
  };

  // Generate monthly evolution data for charts
  const getMonthlyEvolutionData = () => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 11),
      end: new Date(),
    });

    return months.map(month => {
      const monthStart = format(startOfMonth(month), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(month), "yyyy-MM-dd");
      const monthLabel = format(month, "MMM/yy", { locale: ptBR });

      const membersData: Record<string, { revenue: number; points: number }> = {};

      profiles?.forEach(profile => {
        const userId = profile.user_id;
        
        // Revenue for this month
        const monthRevenue = revenueRecords?.filter(r => 
          r.user_id === userId && r.date >= monthStart && r.date <= monthEnd
        ).reduce((sum, r) => sum + Number(r.amount), 0) || 0;

        // Points calculation for this month
        let monthPoints = Math.floor(monthRevenue / 10000);

        // NPS points
        const monthNps = npsRecords?.filter(r => 
          r.user_id === userId && r.date >= monthStart && r.date <= monthEnd
        ) || [];
        monthNps.forEach(n => {
          if (n.score === 9) monthPoints += 3;
          if (n.score === 10) monthPoints += 5;
          if (n.cited_member) monthPoints += 10;
        });

        // Testimonial points
        const monthTestimonials = testimonialRecords?.filter(r => 
          r.user_id === userId && r.date >= monthStart && r.date <= monthEnd
        ) || [];
        monthTestimonials.forEach(t => {
          if (t.type === "google") monthPoints += 10;
          if (t.type === "video") monthPoints += 20;
          if (t.type === "gold") monthPoints += 40;
        });

        // Referral points
        const monthReferrals = referralRecords?.filter(r => 
          r.user_id === userId && r.date >= monthStart && r.date <= monthEnd
        ) || [];
        monthReferrals.forEach(r => {
          monthPoints += r.collected * 5;
          monthPoints += r.to_consultation * 15;
          monthPoints += r.to_surgery * 30;
        });

        // Other indicators
        const monthOther = otherIndicators?.filter(r => 
          r.user_id === userId && r.date >= monthStart && r.date <= monthEnd
        ) || [];
        monthOther.forEach(o => {
          monthPoints += o.unilovers * 5;
          monthPoints += o.ambassadors * 50;
          monthPoints += o.instagram_mentions * 2;
        });

        membersData[userId] = { revenue: monthRevenue, points: monthPoints };
      });

      return { month: monthLabel, ...membersData };
    });
  };

  const monthlyData = getMonthlyEvolutionData();

  // Get member colors for charts
  const memberColors = [
    "#D4AF37", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", 
    "#F59E0B", "#06B6D4", "#EF4444", "#84CC16", "#6366F1"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Desempenho Individual
          </h1>
          <p className="text-muted-foreground">
            Comparativo de contribuição de cada membro
          </p>
        </div>

        <Tabs defaultValue="ranking" className="space-y-6">
          <TabsList className="grid w-full max-w-lg mx-auto grid-cols-4">
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
            <TabsTrigger value="teams">Equipes</TabsTrigger>
            <TabsTrigger value="evolution">Evolução</TabsTrigger>
            <TabsTrigger value="details">Detalhado</TabsTrigger>
          </TabsList>

          {/* Ranking Geral */}
          <TabsContent value="ranking" className="space-y-4">
            <div className="grid gap-4">
              {memberPerformance.map((member, index) => (
                <Card 
                  key={member.userId} 
                  className={`transition-all ${
                    index === 0 ? "border-primary/50 bg-gradient-to-r from-primary/10 to-primary/5" : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10">
                        {getPositionIcon(index)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-lg">{member.name}</p>
                        <Badge variant="secondary" className="text-xs">
                          {member.teamName}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          {member.totalPoints}
                        </p>
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

          {/* Por Equipe */}
          <TabsContent value="teams" className="space-y-6">
            {teams?.map(team => {
              const teamMembers = getTeamMembers(team.id);
              const teamTotal = teamMembers.reduce((sum, m) => sum + m.totalPoints, 0);
              
              return (
                <Card key={team.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between">
                      <span>{team.name}</span>
                      <Badge className="bg-primary text-lg px-3">
                        {teamTotal} pts
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {teamMembers.map((member, index) => {
                        const contribution = teamTotal > 0 
                          ? Math.round((member.totalPoints / teamTotal) * 100) 
                          : 0;
                        
                        return (
                          <div 
                            key={member.userId}
                            className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                          >
                            <span className="text-sm font-medium text-muted-foreground w-6">
                              {index + 1}º
                            </span>
                            <div className="flex-1">
                              <p className="font-medium">{member.name}</p>
                              <div className="w-full bg-muted rounded-full h-2 mt-1">
                                <div 
                                  className="bg-primary h-2 rounded-full transition-all"
                                  style={{ width: `${contribution}%` }}
                                />
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-primary">{member.totalPoints} pts</p>
                              <p className="text-xs text-muted-foreground">{contribution}% do time</p>
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

          {/* Detalhado */}
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Detalhamento por Indicador</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Membro</TableHead>
                      <TableHead>Equipe</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                      <TableHead className="text-right">Pts Fat.</TableHead>
                      <TableHead className="text-right">NPS</TableHead>
                      <TableHead className="text-right">Pts NPS</TableHead>
                      <TableHead className="text-right">Depoimentos</TableHead>
                      <TableHead className="text-right">Pts Dep.</TableHead>
                      <TableHead className="text-right">Indicações</TableHead>
                      <TableHead className="text-right">Pts Ind.</TableHead>
                      <TableHead className="text-right">Outros Pts</TableHead>
                      <TableHead className="text-right font-bold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberPerformance.map((member, index) => (
                      <TableRow 
                        key={member.userId}
                        className={index === 0 ? "bg-primary/5" : ""}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {index < 3 && getPositionIcon(index)}
                            {member.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{member.teamName}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(member.revenue)}</TableCell>
                        <TableCell className="text-right text-green-600">{member.revenuePoints}</TableCell>
                        <TableCell className="text-right">{member.npsCount}</TableCell>
                        <TableCell className="text-right text-blue-600">{member.npsPoints}</TableCell>
                        <TableCell className="text-right">{member.testimonials}</TableCell>
                        <TableCell className="text-right text-purple-600">{member.testimonialPoints}</TableCell>
                        <TableCell className="text-right">{member.referrals}</TableCell>
                        <TableCell className="text-right text-cyan-600">{member.referralPoints}</TableCell>
                        <TableCell className="text-right text-pink-600">{member.otherPoints}</TableCell>
                        <TableCell className="text-right font-bold text-primary">{member.totalPoints}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Evolução */}
          <TabsContent value="evolution" className="space-y-6">
            {/* Member Selector */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <LineChartIcon className="w-5 h-5 text-primary" />
                    <span className="font-medium">Visualizar:</span>
                  </div>
                  <Select value={selectedMember} onValueChange={setSelectedMember}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Selecione um membro" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os membros</SelectItem>
                      {profiles?.map((profile, index) => (
                        <SelectItem key={profile.user_id} value={profile.user_id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: memberColors[index % memberColors.length] }}
                            />
                            {profile.full_name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Points Evolution Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Evolução de Pontos (Últimos 12 meses)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                        formatter={(value: number, name: string) => {
                          const profile = profiles?.find(p => p.user_id === name);
                          return [value, profile?.full_name || name];
                        }}
                      />
                      <Legend 
                        formatter={(value) => {
                          const profile = profiles?.find(p => p.user_id === value);
                          return profile?.full_name || value;
                        }}
                      />
                      {profiles?.filter(p => selectedMember === "all" || p.user_id === selectedMember).map((profile, index) => (
                        <Line
                          key={profile.user_id}
                          type="monotone"
                          dataKey={`${profile.user_id}.points`}
                          name={profile.user_id}
                          stroke={memberColors[index % memberColors.length]}
                          strokeWidth={2}
                          dot={{ fill: memberColors[index % memberColors.length], r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Evolution Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  Evolução de Faturamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                        formatter={(value: number, name: string) => {
                          const profile = profiles?.find(p => p.user_id === name);
                          return [formatCurrency(value), profile?.full_name || name];
                        }}
                      />
                      <Legend 
                        formatter={(value) => {
                          const profile = profiles?.find(p => p.user_id === value);
                          return profile?.full_name || value;
                        }}
                      />
                      {profiles?.filter(p => selectedMember === "all" || p.user_id === selectedMember).map((profile, index) => (
                        <Bar
                          key={profile.user_id}
                          dataKey={`${profile.user_id}.revenue`}
                          name={profile.user_id}
                          fill={memberColors[index % memberColors.length]}
                          radius={[4, 4, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Cumulative Points Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  Pontuação Acumulada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData.map((month, idx) => {
                      const cumulative: Record<string, number | string> = { month: month.month };
                      profiles?.forEach(profile => {
                        let total = 0;
                        for (let i = 0; i <= idx; i++) {
                          total += (monthlyData[i][profile.user_id] as { points: number })?.points || 0;
                        }
                        cumulative[`${profile.user_id}_cumulative`] = total;
                      });
                      return cumulative;
                    })}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                        formatter={(value: number, name: string) => {
                          const userId = name.replace("_cumulative", "");
                          const profile = profiles?.find(p => p.user_id === userId);
                          return [value, profile?.full_name || name];
                        }}
                      />
                      <Legend 
                        formatter={(value) => {
                          const userId = value.replace("_cumulative", "");
                          const profile = profiles?.find(p => p.user_id === userId);
                          return profile?.full_name || value;
                        }}
                      />
                      {profiles?.filter(p => selectedMember === "all" || p.user_id === selectedMember).map((profile, index) => (
                        <Area
                          key={profile.user_id}
                          type="monotone"
                          dataKey={`${profile.user_id}_cumulative`}
                          name={`${profile.user_id}_cumulative`}
                          stroke={memberColors[index % memberColors.length]}
                          fill={memberColors[index % memberColors.length]}
                          fillOpacity={0.3}
                          strokeWidth={2}
                        />
                      ))}
                    </AreaChart>
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

export default Individual;
