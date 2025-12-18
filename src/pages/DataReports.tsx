import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, eachWeekOfInterval, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Download, Filter, Calendar, Users, FileSpreadsheet, History, BarChart3, 
  FileText, TrendingUp, DollarSign, Star, MessageSquare, Award, Loader2,
  Trophy, User
} from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type RecordType = "revenue" | "nps" | "testimonial" | "referral" | "other" | "all";

interface UnifiedRecord {
  id: string;
  type: RecordType;
  team_name: string;
  team_id: string;
  user_id: string;
  date: string;
  details: string;
  value: string;
  created_at: string;
  registered_by_name: string;
  registered_by_admin: boolean;
  attributed_to_name: string | null;
}

const CHART_COLORS = {
  team1: "hsl(43, 65%, 52%)",
  team2: "hsl(217, 91%, 60%)",
  revenue: "hsl(160, 84%, 39%)",
  nps: "hsl(280, 70%, 60%)",
};

const PIE_COLORS = ["hsl(43, 65%, 52%)", "hsl(217, 91%, 60%)", "hsl(160, 84%, 39%)", "hsl(280, 70%, 60%)"];

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const DataReports = () => {
  // History filters
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<RecordType>("all");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  
  // Analytics period
  const [period, setPeriod] = useState<"week" | "month" | "quarter">("month");
  
  // Reports period
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch teams
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

  const { data: cards } = useQuery({
    queryKey: ["cards"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cards").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch all records
  const { data: revenueRecords, isLoading: loadingRevenue } = useQuery({
    queryKey: ["revenue_records_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("revenue_records").select("*, teams(name)").order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: npsRecords, isLoading: loadingNps } = useQuery({
    queryKey: ["nps_records_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("nps_records").select("*, teams(name)").order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: testimonialRecords, isLoading: loadingTestimonials } = useQuery({
    queryKey: ["testimonial_records_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("testimonial_records").select("*, teams(name)").order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: referralRecords, isLoading: loadingReferrals } = useQuery({
    queryKey: ["referral_records_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("referral_records").select("*, teams(name)").order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: otherIndicators, isLoading: loadingIndicators } = useQuery({
    queryKey: ["other_indicators_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("other_indicators").select("*, teams(name)").order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const isLoading = loadingRevenue || loadingNps || loadingTestimonials || loadingReferrals || loadingIndicators;

  // Helper to get profile name by user_id
  const getProfileName = (userId: string | null) => {
    if (!userId) return null;
    const profile = profiles?.find(p => p.user_id === userId);
    return profile?.full_name || "Usuário desconhecido";
  };

  // HISTORY: Unify all records
  const unifiedRecords = useMemo(() => {
    const records: UnifiedRecord[] = [];

    revenueRecords?.forEach((r) => {
      records.push({
        id: r.id,
        type: "revenue",
        team_name: (r.teams as any)?.name || "N/A",
        team_id: r.team_id,
        user_id: r.user_id,
        date: r.date,
        details: r.notes || "Faturamento registrado",
        value: `R$ ${Number(r.amount).toLocaleString("pt-BR")}`,
        created_at: r.created_at,
        registered_by_name: getProfileName(r.user_id) || "Desconhecido",
        registered_by_admin: r.registered_by_admin,
        attributed_to_name: r.attributed_to_user_id ? getProfileName(r.attributed_to_user_id) : null,
      });
    });

    npsRecords?.forEach((r) => {
      records.push({
        id: r.id,
        type: "nps",
        team_name: (r.teams as any)?.name || "N/A",
        team_id: r.team_id,
        user_id: r.user_id,
        date: r.date,
        details: r.cited_member ? `Citou membro: ${r.member_name}` : "NPS registrado",
        value: `Nota ${r.score}`,
        created_at: r.created_at,
        registered_by_name: getProfileName(r.user_id) || "Desconhecido",
        registered_by_admin: r.registered_by_admin,
        attributed_to_name: r.attributed_to_user_id ? getProfileName(r.attributed_to_user_id) : null,
      });
    });

    testimonialRecords?.forEach((r) => {
      const typeLabels = { google: "Google", video: "Vídeo", gold: "Gold" };
      records.push({
        id: r.id,
        type: "testimonial",
        team_name: (r.teams as any)?.name || "N/A",
        team_id: r.team_id,
        user_id: r.user_id,
        date: r.date,
        details: `${typeLabels[r.type]} - ${r.patient_name || "Paciente"}`,
        value: r.type,
        created_at: r.created_at,
        registered_by_name: getProfileName(r.user_id) || "Desconhecido",
        registered_by_admin: r.registered_by_admin,
        attributed_to_name: r.attributed_to_user_id ? getProfileName(r.attributed_to_user_id) : null,
      });
    });

    referralRecords?.forEach((r) => {
      const parts = [];
      if (r.collected > 0) parts.push(`${r.collected} coletados`);
      if (r.to_consultation > 0) parts.push(`${r.to_consultation} consultas`);
      if (r.to_surgery > 0) parts.push(`${r.to_surgery} cirurgias`);
      records.push({
        id: r.id,
        type: "referral",
        team_name: (r.teams as any)?.name || "N/A",
        team_id: r.team_id,
        user_id: r.user_id,
        date: r.date,
        details: r.patient_name ? `${r.patient_name}: ${parts.join(", ")}` : parts.join(", "),
        value: parts.join(", "),
        created_at: r.created_at,
        registered_by_name: getProfileName(r.user_id) || "Desconhecido",
        registered_by_admin: r.registered_by_admin,
        attributed_to_name: r.attributed_to_user_id ? getProfileName(r.attributed_to_user_id) : null,
      });
    });

    otherIndicators?.forEach((r) => {
      const parts = [];
      if (r.ambassadors > 0) parts.push(`${r.ambassadors} embaixadores`);
      if (r.unilovers > 0) parts.push(`${r.unilovers} unilovers`);
      if (r.instagram_mentions > 0) parts.push(`${r.instagram_mentions} menções IG`);
      records.push({
        id: r.id,
        type: "other",
        team_name: (r.teams as any)?.name || "N/A",
        team_id: r.team_id,
        user_id: r.user_id,
        date: r.date,
        details: parts.join(", ") || "Indicadores",
        value: parts.join(", "),
        created_at: r.created_at,
        registered_by_name: getProfileName(r.user_id) || "Desconhecido",
        registered_by_admin: r.registered_by_admin,
        attributed_to_name: r.attributed_to_user_id ? getProfileName(r.attributed_to_user_id) : null,
      });
    });

    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [revenueRecords, npsRecords, testimonialRecords, referralRecords, otherIndicators, profiles]);

  const filteredRecords = useMemo(() => {
    return unifiedRecords.filter((record) => {
      if (selectedTeam !== "all" && record.team_id !== selectedTeam) return false;
      if (selectedType !== "all" && record.type !== selectedType) return false;
      if (selectedUser !== "all" && record.user_id !== selectedUser) return false;
      if (startDate && record.date < startDate) return false;
      if (endDate && record.date > endDate) return false;
      return true;
    });
  }, [unifiedRecords, selectedTeam, selectedType, selectedUser, startDate, endDate]);

  // Get unique users who have registered records
  const usersWithRecords = useMemo(() => {
    const userIds = new Set(unifiedRecords.map(r => r.user_id));
    return profiles?.filter(p => userIds.has(p.user_id)) || [];
  }, [unifiedRecords, profiles]);

  // Calculate statistics per person based on filtered records
  const userStats = useMemo(() => {
    const stats: Record<string, {
      name: string;
      team_name: string;
      total_records: number;
      revenue_count: number;
      revenue_total: number;
      nps_count: number;
      testimonial_count: number;
      referral_count: number;
      other_count: number;
    }> = {};

    filteredRecords.forEach((record) => {
      if (!stats[record.user_id]) {
        stats[record.user_id] = {
          name: record.registered_by_name,
          team_name: record.team_name,
          total_records: 0,
          revenue_count: 0,
          revenue_total: 0,
          nps_count: 0,
          testimonial_count: 0,
          referral_count: 0,
          other_count: 0,
        };
      }

      stats[record.user_id].total_records++;

      switch (record.type) {
        case "revenue":
          stats[record.user_id].revenue_count++;
          // Extract numeric value from "R$ X.XXX"
          const numValue = parseFloat(record.value.replace(/[R$\s.]/g, '').replace(',', '.'));
          if (!isNaN(numValue)) {
            stats[record.user_id].revenue_total += numValue;
          }
          break;
        case "nps":
          stats[record.user_id].nps_count++;
          break;
        case "testimonial":
          stats[record.user_id].testimonial_count++;
          break;
        case "referral":
          stats[record.user_id].referral_count++;
          break;
        case "other":
          stats[record.user_id].other_count++;
          break;
      }
    });

    return Object.entries(stats)
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.total_records - a.total_records);
  }, [filteredRecords]);

  const exportToExcel = () => {
    const exportData = filteredRecords.map((record) => ({
      "Data": format(new Date(record.date), "dd/MM/yyyy", { locale: ptBR }),
      "Equipe": record.team_name,
      "Registrado por": record.registered_by_name,
      "Via Admin": record.registered_by_admin ? "Sim" : "Não",
      "Atribuído a": record.attributed_to_name || "-",
      "Tipo": getTypeLabel(record.type),
      "Detalhes": record.details,
      "Valor": record.value,
      "Criado em": format(new Date(record.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Histórico");
    ws["!cols"] = [{ wch: 12 }, { wch: 20 }, { wch: 25 }, { wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 40 }, { wch: 25 }, { wch: 18 }];
    XLSX.writeFile(wb, `historico_copa_unique_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const getTypeLabel = (type: RecordType) => {
    const labels: Record<RecordType, string> = {
      revenue: "Faturamento",
      nps: "NPS",
      testimonial: "Depoimento",
      referral: "Indicação",
      other: "Outros",
      all: "Todos",
    };
    return labels[type];
  };

  const getTypeBadgeVariant = (type: RecordType) => {
    const variants: Record<RecordType, "default" | "secondary" | "destructive" | "outline"> = {
      revenue: "default",
      nps: "secondary",
      testimonial: "outline",
      referral: "destructive",
      other: "secondary",
      all: "default",
    };
    return variants[type];
  };

  // ANALYTICS: Time intervals
  const timeIntervals = useMemo(() => {
    const now = new Date();
    if (period === "week") return eachWeekOfInterval({ start: subWeeks(now, 8), end: now });
    if (period === "month") return eachMonthOfInterval({ start: subMonths(now, 6), end: now });
    return eachMonthOfInterval({ start: subMonths(now, 12), end: now });
  }, [period]);

  const revenueEvolution = useMemo(() => {
    if (!revenueRecords || !teams) return [];
    return timeIntervals.map((interval) => {
      const periodStart = startOfMonth(interval);
      const periodEnd = endOfMonth(interval);
      const label = format(interval, period === "week" ? "dd/MM" : "MMM", { locale: ptBR });
      const dataPoint: any = { period: label };
      teams.forEach((team, idx) => {
        const teamRecords = revenueRecords.filter(
          (r) => r.team_id === team.id && new Date(r.date) >= periodStart && new Date(r.date) <= periodEnd
        );
        dataPoint[`team${idx + 1}`] = teamRecords.reduce((sum, r) => sum + Number(r.amount), 0);
      });
      return dataPoint;
    });
  }, [revenueRecords, teams, timeIntervals, period]);

  const chartTooltipStyle = {
    contentStyle: { backgroundColor: "hsl(0 0% 8%)", border: "1px solid hsl(0 0% 18%)", borderRadius: "12px", padding: "12px" },
    labelStyle: { color: "hsl(0 0% 98%)", fontWeight: "bold" },
  };

  // REPORTS: Calculate performance
  const reportStartDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
  const reportEndDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-31`;

  const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const calculateMemberPerformance = (userId: string) => {
    const userRevenue = revenueRecords?.filter(r => r.user_id === userId && r.date >= reportStartDate && r.date <= reportEndDate).reduce((sum, r) => sum + Number(r.amount), 0) || 0;
    const revenuePoints = Math.floor(userRevenue / 10000);
    const userNps = npsRecords?.filter(r => r.user_id === userId && r.date >= reportStartDate && r.date <= reportEndDate) || [];
    let npsPoints = 0;
    userNps.forEach(n => {
      if (n.score === 9) npsPoints += 3;
      if (n.score === 10) npsPoints += 5;
      if (n.cited_member) npsPoints += 10;
    });
    const userTestimonials = testimonialRecords?.filter(r => r.user_id === userId && r.date >= reportStartDate && r.date <= reportEndDate) || [];
    let testimonialPoints = 0;
    userTestimonials.forEach(t => {
      if (t.type === "google") testimonialPoints += 10;
      if (t.type === "video") testimonialPoints += 20;
      if (t.type === "gold") testimonialPoints += 40;
    });
    const userReferrals = referralRecords?.filter(r => r.user_id === userId && r.date >= reportStartDate && r.date <= reportEndDate) || [];
    let referralPoints = 0;
    userReferrals.forEach(r => {
      referralPoints += r.collected * 5;
      referralPoints += r.to_consultation * 15;
      referralPoints += r.to_surgery * 30;
    });
    const userOther = otherIndicators?.filter(r => r.user_id === userId && r.date >= reportStartDate && r.date <= reportEndDate) || [];
    let otherPoints = 0;
    userOther.forEach(o => {
      otherPoints += o.unilovers * 5;
      otherPoints += o.ambassadors * 50;
      otherPoints += o.instagram_mentions * 2;
    });
    return { revenue: userRevenue, revenuePoints, npsPoints, testimonialPoints, referralPoints, otherPoints, totalPoints: revenuePoints + npsPoints + testimonialPoints + referralPoints + otherPoints };
  };

  const calculateTeamPerformance = (teamId: string) => {
    const teamMembers = profiles?.filter(p => p.team_id === teamId) || [];
    let totalRevenue = 0, totalRevenuePoints = 0, totalNpsPoints = 0, totalTestimonialPoints = 0, totalReferralPoints = 0, totalOtherPoints = 0;
    teamMembers.forEach(member => {
      const perf = calculateMemberPerformance(member.user_id);
      totalRevenue += perf.revenue;
      totalRevenuePoints += perf.revenuePoints;
      totalNpsPoints += perf.npsPoints;
      totalTestimonialPoints += perf.testimonialPoints;
      totalReferralPoints += perf.referralPoints;
      totalOtherPoints += perf.otherPoints;
    });
    const teamCards = cards?.filter(c => c.team_id === teamId) || [];
    let cardModifier = 0;
    teamCards.forEach(c => {
      if (c.type === "blue") cardModifier += 20;
      if (c.type === "white") cardModifier += 10;
      if (c.type === "yellow") cardModifier -= 15;
      if (c.type === "red") cardModifier -= 40;
    });
    const qualityPoints = totalNpsPoints + totalTestimonialPoints + totalReferralPoints + totalOtherPoints;
    return { revenue: totalRevenue, revenuePoints: totalRevenuePoints, qualityPoints, cardModifier, totalPoints: totalRevenuePoints + qualityPoints + cardModifier };
  };

  const teamData = teams?.map(team => {
    const perf = calculateTeamPerformance(team.id);
    return { name: team.name, ...perf };
  }).sort((a, b) => b.totalPoints - a.totalPoints) || [];

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const primaryColor: [number, number, number] = [212, 175, 55];
      const textColor: [number, number, number] = [51, 51, 51];

      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 35, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("Copa Unique League 2026", pageWidth / 2, 15, { align: "center" });
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Relatório - ${MONTHS[selectedMonth - 1]} ${selectedYear}`, pageWidth / 2, 25, { align: "center" });
      doc.setFontSize(10);
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, 32, { align: "center" });

      let yPos = 45;
      doc.setTextColor(...textColor);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Ranking das Equipes", 14, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [["Pos.", "Equipe", "Faturamento", "Pts Fat.", "Pts Qual.", "Mod.", "Total"]],
        body: teamData.map((team, idx) => [
          `${idx + 1}º`, team.name, formatCurrency(team.revenue), team.revenuePoints.toString(),
          team.qualityPoints.toString(), team.cardModifier >= 0 ? `+${team.cardModifier}` : team.cardModifier.toString(),
          team.totalPoints.toString(),
        ]),
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [250, 248, 240] },
        styles: { fontSize: 10 },
      });

      doc.save(`relatorio-copa-unique-${MONTHS[selectedMonth - 1].toLowerCase()}-${selectedYear}.pdf`);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Relatórios & Análises</h1>
          <p className="text-muted-foreground">Histórico, gráficos e exportação de dados</p>
        </div>

        <Tabs defaultValue="history" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3 gap-2">
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              Histórico
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Análises
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-2">
              <FileText className="w-4 h-4" />
              Exportar
            </TabsTrigger>
          </TabsList>

          {/* HISTÓRICO */}
          <TabsContent value="history" className="space-y-6">
            <Card className="border-border/50 bg-card/80 backdrop-blur">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="w-5 h-5 text-primary" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Equipe
                    </label>
                    <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                      <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as equipes</SelectItem>
                        {teams?.map((team) => (
                          <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4" />
                      Tipo
                    </label>
                    <Select value={selectedType} onValueChange={(v) => setSelectedType(v as RecordType)}>
                      <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        <SelectItem value="revenue">Faturamento</SelectItem>
                        <SelectItem value="nps">NPS</SelectItem>
                        <SelectItem value="testimonial">Depoimento</SelectItem>
                        <SelectItem value="referral">Indicação</SelectItem>
                        <SelectItem value="other">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Registrado por
                    </label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as pessoas</SelectItem>
                        {usersWithRecords.map((profile) => (
                          <SelectItem key={profile.user_id} value={profile.user_id}>
                            {profile.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Data Inicial
                    </label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Data Final
                    </label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">&nbsp;</label>
                    <Button onClick={exportToExcel} className="w-full gap-2">
                      <Download className="w-4 h-4" />
                      Exportar Excel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {["revenue", "nps", "testimonial", "referral", "other"].map((type) => {
                const count = filteredRecords.filter((r) => r.type === type).length;
                return (
                  <Card key={type} className="border-border/50 bg-card/80">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-primary">{count}</p>
                      <p className="text-xs text-muted-foreground">{getTypeLabel(type as RecordType)}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Estatísticas por pessoa */}
            {userStats.length > 0 && (
              <Card className="border-border/50 bg-card/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Resumo por Pessoa ({userStats.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Pessoa</TableHead>
                          <TableHead>Equipe</TableHead>
                          <TableHead className="text-center">Total</TableHead>
                          <TableHead className="text-center">Faturamento</TableHead>
                          <TableHead className="text-center">NPS</TableHead>
                          <TableHead className="text-center">Depoimentos</TableHead>
                          <TableHead className="text-center">Indicações</TableHead>
                          <TableHead className="text-center">Outros</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userStats.map((stat, index) => (
                          <TableRow key={stat.userId} className={index === 0 ? "bg-primary/5" : "hover:bg-muted/30"}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {index === 0 && <Trophy className="w-4 h-4 text-primary" />}
                                {stat.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{stat.team_name}</Badge>
                            </TableCell>
                            <TableCell className="text-center font-bold text-primary">
                              {stat.total_records}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-col">
                                <span className="font-medium">{stat.revenue_count}</span>
                                {stat.revenue_total > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    R$ {stat.revenue_total.toLocaleString("pt-BR")}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{stat.nps_count}</TableCell>
                            <TableCell className="text-center">{stat.testimonial_count}</TableCell>
                            <TableCell className="text-center">{stat.referral_count}</TableCell>
                            <TableCell className="text-center">{stat.other_count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-border/50 bg-card/80 backdrop-blur">
              <CardHeader>
                <CardTitle>Registros ({filteredRecords.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Data</TableHead>
                        <TableHead>Equipe</TableHead>
                        <TableHead>Registrado por</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Detalhes</TableHead>
                        <TableHead>Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Nenhum registro encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRecords.slice(0, 100).map((record) => (
                          <TableRow key={`${record.type}-${record.id}`} className="hover:bg-muted/30">
                            <TableCell className="font-medium">
                              {format(new Date(record.date), "dd/MM/yyyy", { locale: ptBR })}
                            </TableCell>
                            <TableCell>{record.team_name}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{record.registered_by_name}</span>
                                {record.registered_by_admin && (
                                  <Badge variant="outline" className="w-fit text-xs mt-0.5">Admin</Badge>
                                )}
                                {record.attributed_to_name && (
                                  <span className="text-xs text-muted-foreground">
                                    → Atribuído a: {record.attributed_to_name}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getTypeBadgeVariant(record.type)}>{getTypeLabel(record.type)}</Badge>
                            </TableCell>
                            <TableCell className="max-w-[300px] truncate">{record.details}</TableCell>
                            <TableCell className="font-medium">{record.value}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {filteredRecords.length > 100 && (
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    Mostrando 100 de {filteredRecords.length}. Exporte para ver todos.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ANÁLISES */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="flex justify-end">
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

            <Card className="border-border/50 bg-card/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Faturamento por Equipe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
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
          </TabsContent>

          {/* EXPORTAR PDF */}
          <TabsContent value="export" className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      <span className="font-medium">Período:</span>
                    </div>
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
                  <Button onClick={generatePDF} disabled={isGenerating} className="gap-2">
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {isGenerating ? "Gerando..." : "Exportar PDF"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  Preview - Ranking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamData.map((team, index) => (
                    <div key={team.name} className={`flex items-center justify-between p-4 rounded-lg ${index === 0 ? "bg-primary/10 border border-primary/30" : "bg-muted/50"}`}>
                      <div className="flex items-center gap-4">
                        <Badge variant={index === 0 ? "default" : "secondary"} className="text-lg px-3">{index + 1}º</Badge>
                        <div>
                          <p className="font-semibold text-lg">{team.name}</p>
                          <p className="text-sm text-muted-foreground">{formatCurrency(team.revenue)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{team.totalPoints}</p>
                        <p className="text-xs text-muted-foreground">pontos</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default DataReports;
