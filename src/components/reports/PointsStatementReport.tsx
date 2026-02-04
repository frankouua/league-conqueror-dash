import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Download, Filter, TrendingUp, TrendingDown, Users, Calendar,
  DollarSign, Star, MessageSquare, Award, UserCheck, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PointEntry {
  id: string;
  date: string;
  category: string;
  type: string;
  description: string;
  points: number;
  registeredBy: string;
  attributedTo: string;
  teamName: string;
  teamId: string;
  rawValue?: string;
  createdAt: string;
  source: 'revenue' | 'nps' | 'testimonial' | 'referral' | 'other' | 'card' | 'cancellation';
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// Official scoring from Copa Unique League 2026 playbook - MUST MATCH useFilteredTeamScores.ts
const POINTS_CONFIG = {
  revenue: { perThousand: 1 }, // 1 pt per R$ 1.000 (not 10.000!)
  nps: { score9: 3, score10: 5, citationBonus: 10 },
  testimonial: { whatsapp: 5, google: 10, video: 30, gold: 50 },
  referral: { collected: 5, toConsultation: 20, toSurgery: 50 },
  other: { unilovers: 5, ambassadors: 50, instagramMentions: 2 },
  // Cards use the points value from database, not fixed values
  cancellation: { perThousand: -1 } // -1 pt per R$ 1.000 (same as revenue impact)
};

export function PointsStatementReport() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const monthStart = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
  const monthEnd = format(endOfMonth(new Date(selectedYear, selectedMonth - 1)), "yyyy-MM-dd");

  // Fetch data
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

  const { data: revenueRecords, isLoading: loadingRevenue } = useQuery({
    queryKey: ["revenue_records_statement", monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_records")
        .select("*, teams(name)")
        .gte("date", monthStart)
        .lte("date", monthEnd)
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: npsRecords, isLoading: loadingNps } = useQuery({
    queryKey: ["nps_records_statement", monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nps_records")
        .select("*, teams(name)")
        .gte("date", monthStart)
        .lte("date", monthEnd)
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: testimonialRecords, isLoading: loadingTestimonials } = useQuery({
    queryKey: ["testimonial_records_statement", monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonial_records")
        .select("*, teams(name)")
        .gte("date", monthStart)
        .lte("date", monthEnd)
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: referralRecords, isLoading: loadingReferrals } = useQuery({
    queryKey: ["referral_records_statement", monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_records")
        .select("*, teams(name)")
        .gte("date", monthStart)
        .lte("date", monthEnd)
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: otherIndicators, isLoading: loadingOther } = useQuery({
    queryKey: ["other_indicators_statement", monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("other_indicators")
        .select("*, teams(name)")
        .gte("date", monthStart)
        .lte("date", monthEnd)
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: cardsData, isLoading: loadingCards } = useQuery({
    queryKey: ["cards_statement", monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select("*, teams(name)")
        .gte("date", monthStart)
        .lte("date", monthEnd)
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: cancellationsData, isLoading: loadingCancellations } = useQuery({
    queryKey: ["cancellations_statement", monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cancellations")
        .select("*, teams(name)")
        .gte("cancellation_request_date", monthStart)
        .lte("cancellation_request_date", monthEnd)
        .in("status", ["cancelled_no_fine", "cancelled_with_fine", "credit_used"])
        .order("cancellation_request_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Special Events (Boosters & Turning Points) - must match useFilteredTeamScores
  const { data: specialEventsData, isLoading: loadingSpecialEvents } = useQuery({
    queryKey: ["special_events_statement", monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("special_events")
        .select("*, teams(name)")
        .gte("date", monthStart)
        .lte("date", monthEnd)
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const isLoading = loadingRevenue || loadingNps || loadingTestimonials || loadingReferrals || loadingOther || loadingCards || loadingCancellations || loadingSpecialEvents;

  // Helper functions
  const getProfileName = (userId: string | null) => {
    if (!userId) return "—";
    const profile = profiles?.find(p => p.user_id === userId);
    return profile?.full_name || "Usuário desconhecido";
  };

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return "—";
    const team = teams?.find(t => t.id === teamId);
    return team?.name || "Equipe desconhecida";
  };

  // Build unified points entries
  const pointsEntries = useMemo(() => {
    const entries: PointEntry[] = [];

    // Revenue entries - Calculate points per team first (matching dashboard logic)
    // Dashboard calculates: floor(totalTeamRevenue / 1000), not sum of floor(eachRecord / 1000)
    // To match dashboard AND show individual entries, we:
    // 1. Calculate total revenue per team
    // 2. Calculate total points per team (floor of total / 1000)
    // 3. Distribute points proportionally to each record
    
    const teamRevenueMap = new Map<string, { total: number; records: typeof revenueRecords }>();
    
    revenueRecords?.forEach(r => {
      const teamId = r.team_id;
      const existing = teamRevenueMap.get(teamId) || { total: 0, records: [] as any[] };
      existing.total += Number(r.amount);
      existing.records.push(r);
      teamRevenueMap.set(teamId, existing);
    });
    
    // For each team, calculate total points and distribute
    teamRevenueMap.forEach((teamData, teamId) => {
      const totalTeamPoints = Math.floor(teamData.total / 1000) * POINTS_CONFIG.revenue.perThousand;
      const totalTeamRevenue = teamData.total;
      
      // Track distributed points to handle rounding
      let distributedPoints = 0;
      const recordCount = teamData.records.length;
      
      teamData.records.forEach((r: any, index: number) => {
        const amount = Number(r.amount);
        
        // Calculate proportional points for this record
        // For the last record, assign remaining points to avoid rounding errors
        let points: number;
        if (index === recordCount - 1) {
          points = totalTeamPoints - distributedPoints;
        } else {
          // Proportional distribution
          points = Math.round((amount / totalTeamRevenue) * totalTeamPoints);
          distributedPoints += points;
        }
        
        entries.push({
          id: `revenue-${r.id}`,
          date: r.date,
          category: "Faturamento",
          type: "Venda",
          description: r.notes || `Faturamento de R$ ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          points,
          registeredBy: getProfileName(r.user_id),
          attributedTo: r.attributed_to_user_id ? getProfileName(r.attributed_to_user_id) : getProfileName(r.user_id),
          teamName: (r.teams as any)?.name || getTeamName(r.team_id),
          teamId: r.team_id,
          rawValue: `R$ ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          createdAt: r.created_at,
          source: 'revenue',
        });
      });
    });

    // NPS entries
    npsRecords?.forEach(r => {
      let points = 0;
      let type = "";
      
      if (r.score === 9) {
        points += POINTS_CONFIG.nps.score9;
        type = "NPS 9";
      } else if (r.score === 10) {
        points += POINTS_CONFIG.nps.score10;
        type = "NPS 10";
      }
      
      if (r.cited_member) {
        points += POINTS_CONFIG.nps.citationBonus;
        type += " + Citou membro";
      }

      if (points > 0) {
        entries.push({
          id: `nps-${r.id}`,
          date: r.date,
          category: "NPS",
          type,
          description: r.member_name ? `Citou: ${r.member_name}` : `Nota ${r.score}`,
          points,
          registeredBy: getProfileName(r.user_id),
          attributedTo: r.attributed_to_user_id ? getProfileName(r.attributed_to_user_id) : getProfileName(r.user_id),
          teamName: (r.teams as any)?.name || getTeamName(r.team_id),
          teamId: r.team_id,
          rawValue: `Nota ${r.score}`,
          createdAt: r.created_at,
          source: 'nps',
        });
      }
    });

    // Testimonial entries - including whatsapp
    testimonialRecords?.forEach(r => {
      let points = 0;
      const typeLabels: Record<string, string> = { 
        whatsapp: "Depoimento WhatsApp", 
        google: "Google Review", 
        video: "Vídeo", 
        gold: "Depoimento Gold" 
      };
      
      if (r.type === "whatsapp") points = POINTS_CONFIG.testimonial.whatsapp;
      if (r.type === "google") points = POINTS_CONFIG.testimonial.google;
      if (r.type === "video") points = POINTS_CONFIG.testimonial.video;
      if (r.type === "gold") points = POINTS_CONFIG.testimonial.gold;

      entries.push({
        id: `testimonial-${r.id}`,
        date: r.date,
        category: "Depoimento",
        type: typeLabels[r.type] || r.type,
        description: r.patient_name ? `Paciente: ${r.patient_name}` : "Depoimento registrado",
        points,
        registeredBy: getProfileName(r.user_id),
        attributedTo: r.attributed_to_user_id ? getProfileName(r.attributed_to_user_id) : getProfileName(r.user_id),
        teamName: (r.teams as any)?.name || getTeamName(r.team_id),
        teamId: r.team_id,
        createdAt: r.created_at,
        source: 'testimonial',
      });
    });

    // Referral entries (split into multiple entries if has multiple types)
    referralRecords?.forEach(r => {
      const baseInfo = {
        date: r.date,
        category: "Indicação",
        registeredBy: getProfileName(r.user_id),
        attributedTo: r.attributed_to_user_id ? getProfileName(r.attributed_to_user_id) : getProfileName(r.user_id),
        teamName: (r.teams as any)?.name || getTeamName(r.team_id),
        teamId: r.team_id,
        createdAt: r.created_at,
        source: 'referral' as const,
      };

      if (r.collected > 0) {
        entries.push({
          id: `referral-collected-${r.id}`,
          type: "Coletados",
          description: r.patient_name ? `${r.patient_name}: ${r.collected} indicação(ões) coletada(s)` : `${r.collected} indicação(ões) coletada(s)`,
          points: r.collected * POINTS_CONFIG.referral.collected,
          rawValue: `${r.collected} coletados`,
          ...baseInfo,
        });
      }

      if (r.to_consultation > 0) {
        entries.push({
          id: `referral-consultation-${r.id}`,
          type: "→ Consulta",
          description: r.patient_name ? `${r.patient_name}: ${r.to_consultation} foi/foram para consulta` : `${r.to_consultation} indicação(ões) viraram consulta`,
          points: r.to_consultation * POINTS_CONFIG.referral.toConsultation,
          rawValue: `${r.to_consultation} consultas`,
          ...baseInfo,
        });
      }

      if (r.to_surgery > 0) {
        entries.push({
          id: `referral-surgery-${r.id}`,
          type: "→ Cirurgia",
          description: r.patient_name ? `${r.patient_name}: ${r.to_surgery} fechou/fecharam cirurgia` : `${r.to_surgery} indicação(ões) viraram cirurgia`,
          points: r.to_surgery * POINTS_CONFIG.referral.toSurgery,
          rawValue: `${r.to_surgery} cirurgias`,
          ...baseInfo,
        });
      }
    });

    // Other indicators (split into multiple entries)
    otherIndicators?.forEach(r => {
      const baseInfo = {
        date: r.date,
        category: "Outros Indicadores",
        registeredBy: getProfileName(r.user_id),
        attributedTo: r.attributed_to_user_id ? getProfileName(r.attributed_to_user_id) : getProfileName(r.user_id),
        teamName: (r.teams as any)?.name || getTeamName(r.team_id),
        teamId: r.team_id,
        createdAt: r.created_at,
        source: 'other' as const,
      };

      if (r.unilovers > 0) {
        entries.push({
          id: `other-unilovers-${r.id}`,
          type: "UniLovers",
          description: `${r.unilovers} UniLover(s) registrado(s)`,
          points: r.unilovers * POINTS_CONFIG.other.unilovers,
          rawValue: `${r.unilovers} UniLovers`,
          ...baseInfo,
        });
      }

      if (r.ambassadors > 0) {
        entries.push({
          id: `other-ambassadors-${r.id}`,
          type: "Embaixador",
          description: `${r.ambassadors} Embaixador(es) registrado(s)`,
          points: r.ambassadors * POINTS_CONFIG.other.ambassadors,
          rawValue: `${r.ambassadors} Embaixadores`,
          ...baseInfo,
        });
      }

      if (r.instagram_mentions > 0) {
        entries.push({
          id: `other-instagram-${r.id}`,
          type: "Menção Instagram",
          description: `${r.instagram_mentions} menção(ões) no Instagram`,
          points: r.instagram_mentions * POINTS_CONFIG.other.instagramMentions,
          rawValue: `${r.instagram_mentions} menções`,
          ...baseInfo,
        });
      }
    });

    // Cards - use points value from database (not fixed values)
    cardsData?.forEach(c => {
      const cardLabels: Record<string, { label: string; color: string }> = {
        blue: { label: "Cartão Azul", color: "blue" },
        white: { label: "Cartão Branco", color: "white" },
        yellow: { label: "Cartão Amarelo", color: "yellow" },
        red: { label: "Cartão Vermelho", color: "red" },
        bonus: { label: "Bônus", color: "green" },
      };

      const cardInfo = cardLabels[c.type] || { label: c.type, color: "gray" };
      // Use the points value from the database, as done in useFilteredTeamScores
      const points = c.points || 0;

      entries.push({
        id: `card-${c.id}`,
        date: c.date,
        category: "Cartão",
        type: cardInfo.label,
        description: c.reason || "Cartão aplicado",
        points,
        registeredBy: getProfileName(c.applied_by),
        attributedTo: getTeamName(c.team_id),
        teamName: (c.teams as any)?.name || getTeamName(c.team_id),
        teamId: c.team_id,
        createdAt: c.created_at,
        source: 'card',
      });
    });

    // Cancellations - subtract from revenue: -1 point per R$ 1.000
    cancellationsData?.forEach(c => {
      const contractValue = Number(c.contract_value);
      const points = Math.floor(contractValue / 1000) * POINTS_CONFIG.cancellation.perThousand;
      
      entries.push({
        id: `cancellation-${c.id}`,
        date: c.cancellation_request_date,
        category: "Cancelamento",
        type: "Cancelamento Confirmado",
        description: `${c.patient_name} - ${c.procedure_name}`,
        points,
        registeredBy: getProfileName(c.user_id),
        attributedTo: getTeamName(c.team_id),
        teamName: (c.teams as any)?.name || getTeamName(c.team_id),
        teamId: c.team_id,
        rawValue: `R$ ${contractValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        createdAt: c.created_at,
        source: 'cancellation',
      });
    });

    // Special Events (Boosters & Turning Points)
    specialEventsData?.forEach(e => {
      entries.push({
        id: `special-${e.id}`,
        date: e.date,
        category: "Evento Especial",
        type: e.event_type || e.category || "Evento",
        description: e.description || "Evento especial aplicado",
        points: e.points || 0,
        registeredBy: getProfileName(e.applied_by),
        attributedTo: getTeamName(e.team_id),
        teamName: (e.teams as any)?.name || getTeamName(e.team_id),
        teamId: e.team_id,
        createdAt: e.created_at,
        source: 'card', // Treat as modifier
      });
    });

    // Sort by date
    return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [revenueRecords, npsRecords, testimonialRecords, referralRecords, otherIndicators, cardsData, cancellationsData, specialEventsData, profiles, teams]);

  // Apply filters
  const filteredEntries = useMemo(() => {
    return pointsEntries.filter(entry => {
      if (selectedTeam !== "all" && entry.teamId !== selectedTeam) return false;
      if (selectedCategory !== "all" && entry.category !== selectedCategory) return false;
      return true;
    });
  }, [pointsEntries, selectedTeam, selectedCategory]);

  // Calculate totals
  const totals = useMemo(() => {
    const positive = filteredEntries.filter(e => e.points > 0).reduce((sum, e) => sum + e.points, 0);
    const negative = filteredEntries.filter(e => e.points < 0).reduce((sum, e) => sum + e.points, 0);
    const net = positive + negative;

    const byCategory: Record<string, number> = {};
    filteredEntries.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.points;
    });

    return { positive, negative, net, byCategory };
  }, [filteredEntries]);

  // Get unique categories
  const categories = useMemo(() => {
    return [...new Set(pointsEntries.map(e => e.category))];
  }, [pointsEntries]);

  // Export to Excel
  const exportToExcel = () => {
    const exportData = filteredEntries.map(entry => ({
      "Data": format(new Date(entry.date), "dd/MM/yyyy", { locale: ptBR }),
      "Categoria": entry.category,
      "Tipo": entry.type,
      "Descrição": entry.description,
      "Valor Original": entry.rawValue || "—",
      "Pontos": entry.points,
      "Registrado Por": entry.registeredBy,
      "Atribuído A": entry.attributedTo,
      "Equipe": entry.teamName,
      "Criado Em": format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }),
    }));

    // Add summary row
    exportData.push({
      "Data": "",
      "Categoria": "TOTAL",
      "Tipo": "",
      "Descrição": `Pontos Positivos: ${totals.positive} | Pontos Negativos: ${totals.negative}`,
      "Valor Original": "",
      "Pontos": totals.net,
      "Registrado Por": "",
      "Atribuído A": "",
      "Equipe": "",
      "Criado Em": "",
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Extrato de Pontuação");
    ws["!cols"] = [
      { wch: 12 }, { wch: 18 }, { wch: 20 }, { wch: 45 }, { wch: 20 },
      { wch: 10 }, { wch: 25 }, { wch: 25 }, { wch: 18 }, { wch: 18 }
    ];
    XLSX.writeFile(wb, `extrato-pontuacao-${MONTHS[selectedMonth - 1].toLowerCase()}-${selectedYear}.xlsx`);
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ReactNode> = {
      "Faturamento": <DollarSign className="w-4 h-4" />,
      "NPS": <Star className="w-4 h-4" />,
      "Depoimento": <MessageSquare className="w-4 h-4" />,
      "Indicação": <UserCheck className="w-4 h-4" />,
      "Outros Indicadores": <Award className="w-4 h-4" />,
      "Cartão": <AlertCircle className="w-4 h-4" />,
      "Cancelamento": <AlertCircle className="w-4 h-4" />,
    };
    return icons[category] || <Award className="w-4 h-4" />;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "Faturamento": "bg-green-500/10 text-green-500 border-green-500/30",
      "NPS": "bg-purple-500/10 text-purple-500 border-purple-500/30",
      "Depoimento": "bg-blue-500/10 text-blue-500 border-blue-500/30",
      "Indicação": "bg-orange-500/10 text-orange-500 border-orange-500/30",
      "Outros Indicadores": "bg-cyan-500/10 text-cyan-500 border-cyan-500/30",
      "Cartão": "bg-primary/10 text-primary border-primary/30",
      "Cancelamento": "bg-red-500/10 text-red-500 border-red-500/30",
    };
    return colors[category] || "bg-muted text-muted-foreground";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary" />
            Filtros do Extrato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Mês
              </label>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, index) => (
                    <SelectItem key={index} value={(index + 1).toString()}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Ano
              </label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Equipe
              </label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Award className="w-4 h-4" />
                Categoria
              </label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pontos Positivos</p>
                <p className="text-3xl font-bold text-green-500">+{totals.positive}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pontos Negativos</p>
                <p className="text-3xl font-bold text-red-500">{totals.negative}</p>
              </div>
              <TrendingDown className="w-10 h-10 text-red-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo Total</p>
                <p className={cn("text-3xl font-bold", totals.net >= 0 ? "text-primary" : "text-red-500")}>
                  {totals.net >= 0 ? "+" : ""}{totals.net}
                </p>
              </div>
              <Award className="w-10 h-10 text-primary/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Points breakdown by category */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {Object.entries(totals.byCategory).map(([category, points]) => (
          <Card key={category} className={cn("border", getCategoryColor(category))}>
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                {getCategoryIcon(category)}
              </div>
              <p className="text-lg font-bold">{points >= 0 ? "+" : ""}{points}</p>
              <p className="text-xs text-muted-foreground truncate">{category}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Table */}
      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Extrato Detalhado ({filteredEntries.length} lançamentos)</span>
            <Badge variant="outline" className="text-base px-3 py-1">
              {MONTHS[selectedMonth - 1]} {selectedYear}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[100px]">Data</TableHead>
                    <TableHead className="w-[140px]">Categoria</TableHead>
                    <TableHead className="w-[150px]">Tipo</TableHead>
                    <TableHead className="min-w-[250px]">Descrição</TableHead>
                    <TableHead className="w-[130px]">Valor Original</TableHead>
                    <TableHead className="w-[100px] text-center">Pontos</TableHead>
                    <TableHead className="w-[160px]">Registrado Por</TableHead>
                    <TableHead className="w-[160px]">Atribuído A</TableHead>
                    <TableHead className="w-[120px]">Equipe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                        Nenhum lançamento encontrado para o período selecionado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEntries.map((entry) => (
                      <TableRow key={entry.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">
                          {format(new Date(entry.date), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("gap-1", getCategoryColor(entry.category))}>
                            {getCategoryIcon(entry.category)}
                            <span className="truncate max-w-[100px]">{entry.category}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{entry.type}</TableCell>
                        <TableCell className="text-sm max-w-[300px]">
                          <span className="line-clamp-2">{entry.description}</span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {entry.rawValue || "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={entry.points >= 0 ? "default" : "destructive"} className="font-bold">
                            {entry.points >= 0 ? "+" : ""}{entry.points}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{entry.registeredBy}</TableCell>
                        <TableCell className="text-sm">{entry.attributedTo}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{entry.teamName}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          {filteredEntries.length > 0 && (
            <div className="mt-4 p-4 bg-muted/30 rounded-lg flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Total de {filteredEntries.length} lançamentos no período
              </span>
              <div className="flex gap-4 text-sm">
                <span className="text-green-500 font-medium">+{totals.positive} positivos</span>
                <span className="text-red-500 font-medium">{totals.negative} negativos</span>
                <span className={cn("font-bold", totals.net >= 0 ? "text-primary" : "text-red-500")}>
                  = {totals.net >= 0 ? "+" : ""}{totals.net} saldo
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
