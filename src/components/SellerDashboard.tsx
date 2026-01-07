import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Target,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Star,
  MessageSquare,
  Trophy,
  Medal,
  Award,
  ChevronRight,
  BarChart3,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PaceBadge } from "@/components/PaceBadge";
import { calculatePaceMetrics } from "@/lib/paceAnalysis";
import { cn } from "@/lib/utils";
import SellerDepartmentProgress from "@/components/SellerDepartmentProgress";

interface SellerDashboardProps {
  month: number;
  year: number;
  filterSeller?: string | null;
  filterDepartment?: string | null;
}

interface SellerData {
  userId: string;
  name: string;
  avatarUrl: string | null;
  department: string | null;
  position: string | null;
  teamId: string;
  teamName: string;
  meta1Goal: number;
  meta2Goal: number;
  meta3Goal: number;
  meta1Actual: number;
  meta1Percent: number;
  meta1Remaining: number;
  confirmed: boolean;
  position_label: string;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const POSITION_LABELS: Record<string, string> = {
  comercial_1_captacao: "Comercial 1 - Captação",
  comercial_2_closer: "Comercial 2 - Closer",
  comercial_3_experiencia: "Comercial 3 - Customer Success",
  comercial_4_farmer: "Comercial 4 - Farmer",
  sdr: "SDR",
  coordenador: "Coordenador",
  gerente: "Gerente",
  assistente: "Assistente",
  outro: "Outro",
};

export default function SellerDashboard({ 
  month, 
  year, 
  filterSeller, 
  filterDepartment 
}: SellerDashboardProps) {
  const [selectedSeller, setSelectedSeller] = useState<SellerData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Pace analysis variables
  const now = new Date();
  const currentDay = now.getDate();
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
  const daysInMonth = new Date(year, month, 0).getDate();

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
    queryKey: ["profiles-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch predefined goals
  const { data: predefinedGoals } = useQuery({
    queryKey: ["predefined-goals-all", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predefined_goals")
        .select("*")
        .eq("month", month)
        .eq("year", year);
      if (error) throw error;
      return data;
    },
  });

  // Fetch revenue records
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

  const { data: revenueRecords } = useQuery({
    queryKey: ["revenue-seller-dashboard", month, year],
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

  // Fetch all revenue for history
  const { data: allRevenueRecords } = useQuery({
    queryKey: ["revenue-all-history"],
    queryFn: async () => {
      const { data, error } = await supabase.from("revenue_records").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch all predefined goals for history
  const { data: allPredefinedGoals } = useQuery({
    queryKey: ["predefined-goals-history"],
    queryFn: async () => {
      const { data, error } = await supabase.from("predefined_goals").select("*");
      if (error) throw error;
      return data;
    },
  });

  // NPS records
  const { data: npsRecords } = useQuery({
    queryKey: ["nps-seller", month, year],
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

  // Testimonials
  const { data: testimonialRecords } = useQuery({
    queryKey: ["testimonials-seller", month, year],
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

  // Referrals
  const { data: referralRecords } = useQuery({
    queryKey: ["referrals-seller", month, year],
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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  // Build sellers data
  const sellersData = useMemo((): SellerData[] => {
    if (!profiles || !teams || !predefinedGoals) return [];

    const teamMap = new Map(teams.map((t) => [t.id, t.name]));

    let filteredProfiles = profiles;
    
    // Apply filters
    if (filterSeller) {
      filteredProfiles = filteredProfiles.filter(p => p.user_id === filterSeller);
    }
    
    if (filterDepartment) {
      filteredProfiles = filteredProfiles.filter(p => p.department === filterDepartment);
    }

    return filteredProfiles
      .map((profile) => {
        const goal = predefinedGoals.find((g) => g.matched_user_id === profile.user_id);
        const userRevenue =
          revenueRecords
            ?.filter((r) => r.user_id === profile.user_id)
            .reduce((sum, r) => sum + Number(r.amount), 0) || 0;

        const meta1Goal = goal?.meta1_goal ? Number(goal.meta1_goal) : 0;
        const meta2Goal = goal?.meta2_goal ? Number(goal.meta2_goal) : 0;
        const meta3Goal = goal?.meta3_goal ? Number(goal.meta3_goal) : 0;

        return {
          userId: profile.user_id,
          name: profile.full_name,
          avatarUrl: profile.avatar_url,
          department: profile.department,
          position: profile.position,
          teamId: profile.team_id || "",
          teamName: profile.team_id ? teamMap.get(profile.team_id) || "Sem equipe" : "Sem equipe",
          meta1Goal,
          meta2Goal,
          meta3Goal,
          meta1Actual: userRevenue,
          meta1Percent: meta1Goal > 0 ? Math.round((userRevenue / meta1Goal) * 100) : 0,
          meta1Remaining: Math.max(0, meta1Goal - userRevenue),
          confirmed: goal?.confirmed ?? false,
          position_label: profile.position ? POSITION_LABELS[profile.position] || profile.position : "Não definido",
        };
      })
      .filter((s) => s.meta1Goal > 0 || s.meta1Actual > 0)
      .sort((a, b) => b.meta1Percent - a.meta1Percent);
  }, [profiles, teams, predefinedGoals, revenueRecords, filterSeller, filterDepartment]);

  // Find equivalent seller from other team
  const findEquivalentSeller = (seller: SellerData) => {
    if (!sellersData) return null;
    return sellersData.find(
      (s) =>
        s.userId !== seller.userId &&
        s.teamId !== seller.teamId &&
        s.position === seller.position
    );
  };

  // Get historical data for seller
  const getSellerHistory = (userId: string) => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date(),
    });

    return months.map((monthDate) => {
      const m = monthDate.getMonth() + 1;
      const y = monthDate.getFullYear();
      const monthStart = format(startOfMonth(monthDate), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");
      const monthLabel = format(monthDate, "MMM/yy", { locale: ptBR });

      const revenue =
        allRevenueRecords
          ?.filter((r) => r.user_id === userId && r.date >= monthStart && r.date <= monthEnd)
          .reduce((sum, r) => sum + Number(r.amount), 0) || 0;

      const goal = allPredefinedGoals?.find(
        (g) => g.matched_user_id === userId && g.month === m && g.year === y
      );

      const meta1 = goal?.meta1_goal ? Number(goal.meta1_goal) : 0;
      const meta2 = goal?.meta2_goal ? Number(goal.meta2_goal) : 0;
      const meta3 = goal?.meta3_goal ? Number(goal.meta3_goal) : 0;

      let metaBatida = "Nenhuma";
      if (revenue >= meta3) metaBatida = "Meta 3";
      else if (revenue >= meta2) metaBatida = "Meta 2";
      else if (revenue >= meta1) metaBatida = "Meta 1";

      return {
        month: monthLabel,
        revenue,
        meta1,
        meta2,
        meta3,
        metaBatida,
        percent: meta1 > 0 ? Math.round((revenue / meta1) * 100) : 0,
      };
    });
  };

  // Get additional metrics for seller
  const getSellerMetrics = (userId: string) => {
    const userNps = npsRecords?.filter((r) => r.user_id === userId) || [];
    const userTestimonials = testimonialRecords?.filter((r) => r.user_id === userId) || [];
    const userReferrals = referralRecords?.filter((r) => r.user_id === userId) || [];

    const npsAvg =
      userNps.length > 0 ? Math.round(userNps.reduce((sum, n) => sum + n.score, 0) / userNps.length) : 0;

    const referralTotal = userReferrals.reduce(
      (sum, r) => sum + r.collected + r.to_consultation + r.to_surgery,
      0
    );

    return {
      npsCount: userNps.length,
      npsAvg,
      testimonialsCount: userTestimonials.length,
      referralsCount: referralTotal,
    };
  };

  const openSellerDialog = (seller: SellerData) => {
    setSelectedSeller(seller);
    setIsDialogOpen(true);
  };

  const getMetaStatus = (actual: number, meta1: number, meta2: number, meta3: number) => {
    if (actual >= meta3) return { label: "Meta 3", color: "bg-green-500", icon: Trophy };
    if (actual >= meta2) return { label: "Meta 2", color: "bg-blue-500", icon: Medal };
    if (actual >= meta1) return { label: "Meta 1", color: "bg-amber-500", icon: Award };
    return { label: "Em progresso", color: "bg-muted", icon: Target };
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return "bg-green-500";
    if (percent >= 80) return "bg-blue-500";
    if (percent >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Dashboard por Vendedor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Clique em um vendedor para ver detalhes completos de performance
          </p>
          
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {sellersData.map((seller, index) => {
                const status = getMetaStatus(
                  seller.meta1Actual,
                  seller.meta1Goal,
                  seller.meta2Goal,
                  seller.meta3Goal
                );
                const StatusIcon = status.icon;
                const metrics = getSellerMetrics(seller.userId);
                const paceMetrics = isCurrentMonth && seller.meta1Goal > 0
                  ? calculatePaceMetrics(seller.meta1Goal, seller.meta1Actual, currentDay, daysInMonth)
                  : null;

                return (
                  <Card
                    key={seller.userId}
                    className={cn(
                      "cursor-pointer hover:border-primary/50 transition-all",
                      paceMetrics && paceMetrics.borderColor,
                      paceMetrics && paceMetrics.bgColor.replace("/20", "/5")
                    )}
                    onClick={() => openSellerDialog(seller)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Position Badge */}
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                          {index < 3 ? (
                            index === 0 ? (
                              <Trophy className="w-5 h-5 text-primary" />
                            ) : index === 1 ? (
                              <Medal className="w-5 h-5 text-gray-400" />
                            ) : (
                              <Award className="w-5 h-5 text-amber-600" />
                            )
                          ) : (
                            <span className="font-bold text-muted-foreground">{index + 1}º</span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold truncate">{seller.name}</p>
                            {seller.confirmed && (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            )}
                            {isCurrentMonth && paceMetrics && (
                              <PaceBadge
                                monthlyGoal={seller.meta1Goal}
                                currentValue={seller.meta1Actual}
                                currentDay={currentDay}
                                totalDaysInMonth={daysInMonth}
                                compact
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {seller.teamName}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {seller.position_label}
                            </Badge>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="text-right min-w-[120px]">
                          <div className="flex items-center justify-end gap-2">
                            <Badge className={status.color}>{status.label}</Badge>
                          </div>
                          <p className="text-2xl font-bold text-primary mt-1">
                            {seller.meta1Percent}%
                          </p>
                        </div>

                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>

                      {/* Progress bar with pace analysis */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>{formatCurrency(seller.meta1Actual)}</span>
                          <div className="flex items-center gap-2">
                            {isCurrentMonth && paceMetrics && (
                              <span className={cn("font-medium", paceMetrics.textColor)}>
                                Esp: {formatCurrency(paceMetrics.expected)}
                              </span>
                            )}
                            <span>Meta 1: {formatCurrency(seller.meta1Goal)}</span>
                          </div>
                        </div>
                        <Progress value={Math.min(seller.meta1Percent, 100)} className="h-2" />
                      </div>

                      {/* Quick stats */}
                      <div className="grid grid-cols-4 gap-2 mt-3 text-center text-xs">
                        <div className="p-2 bg-muted/50 rounded">
                          <DollarSign className="w-3 h-3 mx-auto text-green-500 mb-1" />
                          <p className="font-semibold">{formatCurrency(seller.meta1Actual)}</p>
                        </div>
                        <div className="p-2 bg-muted/50 rounded">
                          <MessageSquare className="w-3 h-3 mx-auto text-blue-500 mb-1" />
                          <p className="font-semibold">{metrics.npsCount}</p>
                        </div>
                        <div className="p-2 bg-muted/50 rounded">
                          <Star className="w-3 h-3 mx-auto text-purple-500 mb-1" />
                          <p className="font-semibold">{metrics.testimonialsCount}</p>
                        </div>
                        <div className="p-2 bg-muted/50 rounded">
                          <Users className="w-3 h-3 mx-auto text-cyan-500 mb-1" />
                          <p className="font-semibold">{metrics.referralsCount}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {sellersData.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum vendedor com metas configuradas para este período</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Detailed Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedSeller && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-4">
                  <Avatar className="w-16 h-16 border-2 border-primary/30">
                    <AvatarImage src={selectedSeller.avatarUrl || undefined} alt={selectedSeller.name} />
                    <AvatarFallback className="text-xl bg-primary/20 text-primary font-bold">
                      {selectedSeller.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-xl">{selectedSeller.name}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">{selectedSeller.teamName}</Badge>
                      <Badge variant="outline">{selectedSeller.position_label}</Badge>
                    </div>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Current Month Goals */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Metas de {MONTHS[month - 1]} {year}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Meta 1 */}
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-amber-600">Meta 1</span>
                          {selectedSeller.meta1Actual >= selectedSeller.meta1Goal ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-2xl font-bold">{formatCurrency(selectedSeller.meta1Goal)}</p>
                        <Progress
                          value={Math.min(
                            (selectedSeller.meta1Actual / selectedSeller.meta1Goal) * 100,
                            100
                          )}
                          className="h-2 mt-2"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatCurrency(selectedSeller.meta1Actual)} / Falta{" "}
                          {formatCurrency(Math.max(0, selectedSeller.meta1Goal - selectedSeller.meta1Actual))}
                        </p>
                      </div>

                      {/* Meta 2 */}
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-blue-600">Meta 2</span>
                          {selectedSeller.meta1Actual >= selectedSeller.meta2Goal ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-2xl font-bold">{formatCurrency(selectedSeller.meta2Goal)}</p>
                        <Progress
                          value={Math.min(
                            (selectedSeller.meta1Actual / selectedSeller.meta2Goal) * 100,
                            100
                          )}
                          className="h-2 mt-2"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatCurrency(selectedSeller.meta1Actual)} / Falta{" "}
                          {formatCurrency(Math.max(0, selectedSeller.meta2Goal - selectedSeller.meta1Actual))}
                        </p>
                      </div>

                      {/* Meta 3 */}
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-green-600">Meta 3</span>
                          {selectedSeller.meta1Actual >= selectedSeller.meta3Goal ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-2xl font-bold">{formatCurrency(selectedSeller.meta3Goal)}</p>
                        <Progress
                          value={Math.min(
                            (selectedSeller.meta1Actual / selectedSeller.meta3Goal) * 100,
                            100
                          )}
                          className="h-2 mt-2"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatCurrency(selectedSeller.meta1Actual)} / Falta{" "}
                          {formatCurrency(Math.max(0, selectedSeller.meta3Goal - selectedSeller.meta1Actual))}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Department Progress Tables */}
                <SellerDepartmentProgress 
                  userId={selectedSeller.userId} 
                  month={month} 
                  year={year} 
                />

                {/* Comparison with equivalent seller */}
                {(() => {
                  const equivalent = findEquivalentSeller(selectedSeller);
                  if (!equivalent) return null;

                  const diff = selectedSeller.meta1Actual - equivalent.meta1Actual;
                  const percentDiff =
                    equivalent.meta1Actual > 0
                      ? Math.round((diff / equivalent.meta1Actual) * 100)
                      : 0;

                  return (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Comparativo com {equivalent.name} ({equivalent.teamName})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 border rounded-lg text-center">
                            <p className="text-sm text-muted-foreground mb-1">{selectedSeller.name}</p>
                            <p className="text-2xl font-bold text-primary">
                              {formatCurrency(selectedSeller.meta1Actual)}
                            </p>
                            <p className="text-sm">{selectedSeller.meta1Percent}% da meta</p>
                          </div>
                          <div className="p-4 border rounded-lg text-center">
                            <p className="text-sm text-muted-foreground mb-1">{equivalent.name}</p>
                            <p className="text-2xl font-bold">{formatCurrency(equivalent.meta1Actual)}</p>
                            <p className="text-sm">{equivalent.meta1Percent}% da meta</p>
                          </div>
                        </div>
                        <div className="mt-4 p-3 bg-muted/50 rounded-lg text-center">
                          <div className="flex items-center justify-center gap-2">
                            {diff > 0 ? (
                              <>
                                <ArrowUpRight className="w-5 h-5 text-green-500" />
                                <span className="text-green-600 font-semibold">
                                  +{formatCurrency(diff)} ({percentDiff}%)
                                </span>
                              </>
                            ) : diff < 0 ? (
                              <>
                                <ArrowDownRight className="w-5 h-5 text-red-500" />
                                <span className="text-red-600 font-semibold">
                                  {formatCurrency(diff)} ({percentDiff}%)
                                </span>
                              </>
                            ) : (
                              <>
                                <Minus className="w-5 h-5 text-muted-foreground" />
                                <span className="text-muted-foreground font-semibold">Empate</span>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Additional Metrics */}
                {(() => {
                  const metrics = getSellerMetrics(selectedSeller.userId);
                  return (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <BarChart3 className="w-4 h-4" />
                          Outros Indicadores do Mês
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-4 bg-blue-500/10 rounded-lg text-center">
                            <MessageSquare className="w-6 h-6 mx-auto text-blue-500 mb-2" />
                            <p className="text-2xl font-bold">{metrics.npsCount}</p>
                            <p className="text-xs text-muted-foreground">NPS Coletados</p>
                            {metrics.npsAvg > 0 && (
                              <p className="text-sm text-muted-foreground">Média: {metrics.npsAvg}</p>
                            )}
                          </div>
                          <div className="p-4 bg-purple-500/10 rounded-lg text-center">
                            <Star className="w-6 h-6 mx-auto text-purple-500 mb-2" />
                            <p className="text-2xl font-bold">{metrics.testimonialsCount}</p>
                            <p className="text-xs text-muted-foreground">Depoimentos</p>
                          </div>
                          <div className="p-4 bg-cyan-500/10 rounded-lg text-center">
                            <Users className="w-6 h-6 mx-auto text-cyan-500 mb-2" />
                            <p className="text-2xl font-bold">{metrics.referralsCount}</p>
                            <p className="text-xs text-muted-foreground">Indicações</p>
                          </div>
                          <div className="p-4 bg-green-500/10 rounded-lg text-center">
                            <DollarSign className="w-6 h-6 mx-auto text-green-500 mb-2" />
                            <p className="text-2xl font-bold">
                              {formatCurrency(selectedSeller.meta1Actual)}
                            </p>
                            <p className="text-xs text-muted-foreground">Faturamento</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Historical Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Histórico de Performance (últimos 6 meses)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const history = getSellerHistory(selectedSeller.userId);
                      return (
                        <>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={history}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                                <Tooltip
                                  formatter={(value: number) => formatCurrency(value)}
                                  labelFormatter={(label) => `Mês: ${label}`}
                                />
                                <Legend />
                                <Bar dataKey="revenue" name="Realizado" fill="hsl(var(--primary))" />
                                <Bar dataKey="meta1" name="Meta 1" fill="hsl(45 93% 47%)" />
                                <Bar dataKey="meta2" name="Meta 2" fill="hsl(217 91% 60%)" />
                                <Bar dataKey="meta3" name="Meta 3" fill="hsl(142 76% 36%)" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          {/* History table */}
                          <div className="mt-4 overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2">Mês</th>
                                  <th className="text-right py-2">Realizado</th>
                                  <th className="text-right py-2">% Meta 1</th>
                                  <th className="text-center py-2">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {history.map((h) => (
                                  <tr key={h.month} className="border-b">
                                    <td className="py-2">{h.month}</td>
                                    <td className="text-right py-2">{formatCurrency(h.revenue)}</td>
                                    <td className="text-right py-2">{h.percent}%</td>
                                    <td className="text-center py-2">
                                      <Badge
                                        variant={h.metaBatida === "Nenhuma" ? "secondary" : "default"}
                                        className={
                                          h.metaBatida === "Meta 3"
                                            ? "bg-green-500"
                                            : h.metaBatida === "Meta 2"
                                            ? "bg-blue-500"
                                            : h.metaBatida === "Meta 1"
                                            ? "bg-amber-500"
                                            : ""
                                        }
                                      >
                                        {h.metaBatida}
                                      </Badge>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
