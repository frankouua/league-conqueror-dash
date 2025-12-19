import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Filter, Calendar, Users, FileSpreadsheet } from "lucide-react";
import brasaoLioness from "@/assets/brasao-lioness-team.png";
import brasaoTroia from "@/assets/brasao-troia-team.png";

type RecordType = "revenue" | "nps" | "testimonial" | "referral" | "other" | "all";

interface UnifiedRecord {
  id: string;
  type: RecordType;
  team_name: string;
  team_id: string;
  date: string;
  details: string;
  value: string;
  created_at: string;
}

const History = () => {
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<RecordType>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

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
  const { data: revenueRecords } = useQuery({
    queryKey: ["revenue_records"],
    queryFn: async () => {
      const { data, error } = await supabase.from("revenue_records").select("*, teams(name)");
      if (error) throw error;
      return data;
    },
  });

  const { data: npsRecords } = useQuery({
    queryKey: ["nps_records"],
    queryFn: async () => {
      const { data, error } = await supabase.from("nps_records").select("*, teams(name)");
      if (error) throw error;
      return data;
    },
  });

  const { data: testimonialRecords } = useQuery({
    queryKey: ["testimonial_records"],
    queryFn: async () => {
      const { data, error } = await supabase.from("testimonial_records").select("*, teams(name)");
      if (error) throw error;
      return data;
    },
  });

  const { data: referralRecords } = useQuery({
    queryKey: ["referral_records"],
    queryFn: async () => {
      const { data, error } = await supabase.from("referral_records").select("*, teams(name)");
      if (error) throw error;
      return data;
    },
  });

  const { data: otherIndicators } = useQuery({
    queryKey: ["other_indicators"],
    queryFn: async () => {
      const { data, error } = await supabase.from("other_indicators").select("*, teams(name)");
      if (error) throw error;
      return data;
    },
  });

  // Unify all records
  const unifiedRecords = useMemo(() => {
    const records: UnifiedRecord[] = [];

    revenueRecords?.forEach((r) => {
      records.push({
        id: r.id,
        type: "revenue",
        team_name: (r.teams as any)?.name || "N/A",
        team_id: r.team_id,
        date: r.date,
        details: r.notes || "Faturamento registrado",
        value: `R$ ${Number(r.amount).toLocaleString("pt-BR")}`,
        created_at: r.created_at,
      });
    });

    npsRecords?.forEach((r) => {
      records.push({
        id: r.id,
        type: "nps",
        team_name: (r.teams as any)?.name || "N/A",
        team_id: r.team_id,
        date: r.date,
        details: r.cited_member ? `Citou membro: ${r.member_name}` : "NPS registrado",
        value: `Nota ${r.score}`,
        created_at: r.created_at,
      });
    });

    testimonialRecords?.forEach((r) => {
      const typeLabels = { google: "Google", video: "Vídeo", gold: "Gold" };
      records.push({
        id: r.id,
        type: "testimonial",
        team_name: (r.teams as any)?.name || "N/A",
        team_id: r.team_id,
        date: r.date,
        details: `${typeLabels[r.type]} - ${r.patient_name || "Paciente"}`,
        value: r.type,
        created_at: r.created_at,
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
        date: r.date,
        details: r.patient_name ? `${r.patient_name}: ${parts.join(", ")}` : parts.join(", "),
        value: parts.join(", "),
        created_at: r.created_at,
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
        date: r.date,
        details: parts.join(", ") || "Indicadores",
        value: parts.join(", "),
        created_at: r.created_at,
      });
    });

    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [revenueRecords, npsRecords, testimonialRecords, referralRecords, otherIndicators]);

  // Filter records
  const filteredRecords = useMemo(() => {
    return unifiedRecords.filter((record) => {
      if (selectedTeam !== "all" && record.team_id !== selectedTeam) return false;
      if (selectedType !== "all" && record.type !== selectedType) return false;
      if (startDate && record.date < startDate) return false;
      if (endDate && record.date > endDate) return false;
      return true;
    });
  }, [unifiedRecords, selectedTeam, selectedType, startDate, endDate]);

  // Export to Excel
  const exportToExcel = () => {
    const exportData = filteredRecords.map((record) => ({
      "Data": format(new Date(record.date), "dd/MM/yyyy", { locale: ptBR }),
      "Equipe": record.team_name,
      "Tipo": getTypeLabel(record.type),
      "Detalhes": record.details,
      "Valor": record.value,
      "Criado em": format(new Date(record.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Histórico");
    
    // Auto-size columns
    const colWidths = [
      { wch: 12 }, // Data
      { wch: 20 }, // Equipe
      { wch: 15 }, // Tipo
      { wch: 40 }, // Detalhes
      { wch: 25 }, // Valor
      { wch: 18 }, // Criado em
    ];
    ws["!cols"] = colWidths;

    XLSX.writeFile(wb, `historico_copa_unique_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const getTypeLabel = (type: RecordType) => {
    const labels: Record<RecordType, string> = {
      revenue: "Faturamento",
      nps: "NPS",
      testimonial: "Depoimento",
      referral: "Indicação",
      other: "Outros Indicadores",
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Histórico de Registros</h1>
          <p className="text-muted-foreground">Visualize e exporte todos os registros da competição</p>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-border/50 bg-card/80 backdrop-blur">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Equipe
                </label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as equipes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as equipes</SelectItem>
                    {teams?.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  Tipo de Registro
                </label>
                <Select value={selectedType} onValueChange={(v) => setSelectedType(v as RecordType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="revenue">Faturamento</SelectItem>
                    <SelectItem value="nps">NPS</SelectItem>
                    <SelectItem value="testimonial">Depoimento</SelectItem>
                    <SelectItem value="referral">Indicação</SelectItem>
                    <SelectItem value="other">Outros Indicadores</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data Inicial
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data Final
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-background"
                />
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

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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

        {/* Records Table */}
        <Card className="border-border/50 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Registros ({filteredRecords.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Data</TableHead>
                    <TableHead>Equipe</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Detalhes</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum registro encontrado com os filtros selecionados
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.slice(0, 100).map((record) => {
                      const teamLogo = record.team_name.toLowerCase().includes("lioness") ? brasaoLioness : brasaoTroia;
                      return (
                        <TableRow key={`${record.type}-${record.id}`} className="hover:bg-muted/30">
                          <TableCell className="font-medium">
                            {format(new Date(record.date), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <img src={teamLogo} alt={record.team_name} className="w-6 h-6 object-contain" />
                              <span>{record.team_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getTypeBadgeVariant(record.type)}>
                              {getTypeLabel(record.type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate">{record.details}</TableCell>
                          <TableCell className="font-medium">{record.value}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            {filteredRecords.length > 100 && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                Mostrando 100 de {filteredRecords.length} registros. Exporte para ver todos.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default History;
