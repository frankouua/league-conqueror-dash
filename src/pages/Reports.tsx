import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Download, Loader2, Trophy, Users, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import brasaoLioness from "@/assets/brasao-lioness-team.png";
import brasaoTroia from "@/assets/brasao-troia-team.png";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const Reports = () => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch all data
  const { data: teams } = useQuery({
    queryKey: ["teams-report"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles-report"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: cards } = useQuery({
    queryKey: ["cards-report"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cards").select("*");
      if (error) throw error;
      return data;
    },
  });

  const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
  const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-31`;

  const { data: revenueRecords } = useQuery({
    queryKey: ["revenue-report", selectedMonth, selectedYear],
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
    queryKey: ["nps-report", selectedMonth, selectedYear],
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
    queryKey: ["testimonials-report", selectedMonth, selectedYear],
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
    queryKey: ["referrals-report", selectedMonth, selectedYear],
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

  const { data: otherIndicators } = useQuery({
    queryKey: ["other-report", selectedMonth, selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("other_indicators")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data;
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const calculateMemberPerformance = (userId: string) => {
    const userRevenue = revenueRecords?.filter(r => r.attributed_to_user_id === userId || (!r.attributed_to_user_id && r.user_id === userId)).reduce((sum, r) => sum + Number(r.amount), 0) || 0;
    const revenuePoints = Math.floor(userRevenue / 10000);

    const userNps = npsRecords?.filter(r => r.attributed_to_user_id === userId || (!r.attributed_to_user_id && r.user_id === userId)) || [];
    let npsPoints = 0;
    userNps.forEach(n => {
      if (n.score === 9) npsPoints += 3;
      if (n.score === 10) npsPoints += 5;
      if (n.cited_member) npsPoints += 10;
    });

    const userTestimonials = testimonialRecords?.filter(r => r.attributed_to_user_id === userId || (!r.attributed_to_user_id && r.user_id === userId)) || [];
    let testimonialPoints = 0;
    userTestimonials.forEach(t => {
      if (t.type === "google") testimonialPoints += 10;
      if (t.type === "video") testimonialPoints += 20;
      if (t.type === "gold") testimonialPoints += 40;
    });

    const userReferrals = referralRecords?.filter(r => r.attributed_to_user_id === userId || (!r.attributed_to_user_id && r.user_id === userId)) || [];
    let referralPoints = 0;
    userReferrals.forEach(r => {
      referralPoints += r.collected * 5;
      referralPoints += r.to_consultation * 15;
      referralPoints += r.to_surgery * 30;
    });

    const userOther = otherIndicators?.filter(r => r.attributed_to_user_id === userId || (!r.attributed_to_user_id && r.user_id === userId)) || [];
    let otherPoints = 0;
    userOther.forEach(o => {
      otherPoints += o.unilovers * 5;
      otherPoints += o.ambassadors * 50;
      otherPoints += o.instagram_mentions * 2;
    });

    return {
      revenue: userRevenue,
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
  };

  const calculateTeamPerformance = (teamId: string) => {
    const teamMembers = profiles?.filter(p => p.team_id === teamId) || [];
    let totalRevenue = 0, totalRevenuePoints = 0, totalNpsPoints = 0;
    let totalTestimonialPoints = 0, totalReferralPoints = 0, totalOtherPoints = 0;

    teamMembers.forEach(member => {
      const perf = calculateMemberPerformance(member.user_id);
      totalRevenue += perf.revenue;
      totalRevenuePoints += perf.revenuePoints;
      totalNpsPoints += perf.npsPoints;
      totalTestimonialPoints += perf.testimonialPoints;
      totalReferralPoints += perf.referralPoints;
      totalOtherPoints += perf.otherPoints;
    });

    // Card modifiers
    const teamCards = cards?.filter(c => c.team_id === teamId) || [];
    let cardModifier = 0;
    teamCards.forEach(c => {
      if (c.type === "blue") cardModifier += 20;
      if (c.type === "white") cardModifier += 10;
      if (c.type === "yellow") cardModifier -= 15;
      if (c.type === "red") cardModifier -= 40;
    });

    const qualityPoints = totalNpsPoints + totalTestimonialPoints + totalReferralPoints + totalOtherPoints;
    const totalPoints = totalRevenuePoints + qualityPoints + cardModifier;

    return {
      revenue: totalRevenue,
      revenuePoints: totalRevenuePoints,
      qualityPoints,
      cardModifier,
      totalPoints,
    };
  };

  const generatePDF = async () => {
    setIsGenerating(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const primaryColor: [number, number, number] = [212, 175, 55]; // Gold
      const textColor: [number, number, number] = [51, 51, 51];

      // Header
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 35, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("Copa Unique League 2026", pageWidth / 2, 15, { align: "center" });
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Relatório de Desempenho - ${MONTHS[selectedMonth - 1]} ${selectedYear}`, pageWidth / 2, 25, { align: "center" });
      
      doc.setFontSize(10);
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, 32, { align: "center" });

      let yPos = 45;

      // Team Rankings
      doc.setTextColor(...textColor);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Ranking das Equipes", 14, yPos);
      yPos += 8;

      const teamData = teams?.map(team => {
        const perf = calculateTeamPerformance(team.id);
        return {
          name: team.name,
          ...perf,
        };
      }).sort((a, b) => b.totalPoints - a.totalPoints) || [];

      autoTable(doc, {
        startY: yPos,
        head: [["Pos.", "Equipe", "Faturamento", "Pts Fat.", "Pts Qual.", "Modificador", "Total"]],
        body: teamData.map((team, idx) => [
          `${idx + 1}º`,
          team.name,
          formatCurrency(team.revenue),
          team.revenuePoints.toString(),
          team.qualityPoints.toString(),
          team.cardModifier >= 0 ? `+${team.cardModifier}` : team.cardModifier.toString(),
          team.totalPoints.toString(),
        ]),
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [250, 248, 240],
        },
        styles: {
          fontSize: 10,
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Individual Performance per Team
      teams?.forEach((team, teamIndex) => {
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...primaryColor);
        doc.text(`${team.name} - Desempenho Individual`, 14, yPos);
        yPos += 8;

        const teamMembers = profiles?.filter(p => p.team_id === team.id) || [];
        const memberData = teamMembers.map(member => {
          const perf = calculateMemberPerformance(member.user_id);
          return {
            name: member.full_name,
            ...perf,
          };
        }).sort((a, b) => b.totalPoints - a.totalPoints);

        autoTable(doc, {
          startY: yPos,
          head: [["Membro", "Faturamento", "Pts Fat.", "Pts NPS", "Pts Dep.", "Pts Ind.", "Outros", "Total"]],
          body: memberData.map(member => [
            member.name,
            formatCurrency(member.revenue),
            member.revenuePoints.toString(),
            member.npsPoints.toString(),
            member.testimonialPoints.toString(),
            member.referralPoints.toString(),
            member.otherPoints.toString(),
            member.totalPoints.toString(),
          ]),
          headStyles: {
            fillColor: [100, 100, 100],
            textColor: [255, 255, 255],
            fontStyle: "bold",
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245],
          },
          styles: {
            fontSize: 9,
          },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      });

      // Summary Section
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...primaryColor);
      doc.text("Resumo Geral", 14, yPos);
      yPos += 10;

      const totalClinicRevenue = revenueRecords?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
      const totalNps = npsRecords?.length || 0;
      const totalTestimonials = testimonialRecords?.length || 0;
      const totalReferrals = referralRecords?.reduce((sum, r) => sum + r.collected + r.to_consultation + r.to_surgery, 0) || 0;

      doc.setTextColor(...textColor);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");

      const summaryItems = [
        `Faturamento Total da Clínica: ${formatCurrency(totalClinicRevenue)}`,
        `Total de Registros NPS: ${totalNps}`,
        `Total de Depoimentos: ${totalTestimonials}`,
        `Total de Indicações: ${totalReferrals}`,
      ];

      summaryItems.forEach(item => {
        doc.text(`• ${item}`, 14, yPos);
        yPos += 7;
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Copa Unique League 2026 - Página ${i} de ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }

      // Save
      doc.save(`relatorio-copa-unique-${MONTHS[selectedMonth - 1].toLowerCase()}-${selectedYear}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Calculate preview data
  const teamData = teams?.map(team => {
    const perf = calculateTeamPerformance(team.id);
    return { name: team.name, ...perf };
  }).sort((a, b) => b.totalPoints - a.totalPoints) || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Relatórios</h1>
          <p className="text-muted-foreground">Exporte relatórios de desempenho em PDF</p>
        </div>

        {/* Controls */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="font-medium">Período:</span>
                </div>
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
              <Button onClick={generatePDF} disabled={isGenerating} className="gap-2">
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {isGenerating ? "Gerando..." : "Exportar PDF"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Preview - Ranking das Equipes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamData.map((team, index) => {
                  const teamLogo = team.name.toLowerCase().includes("lioness") ? brasaoLioness : brasaoTroia;
                  return (
                    <div
                      key={team.name}
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        index === 0 ? "bg-primary/10 border border-primary/30" : "bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <Badge variant={index === 0 ? "default" : "secondary"} className="text-lg px-3">
                          {index + 1}º
                        </Badge>
                        <img 
                          src={teamLogo} 
                          alt={team.name}
                          className={`w-12 h-12 object-contain ${index === 0 ? "animate-pulse" : ""}`}
                        />
                        <div>
                          <p className="font-semibold text-lg">{team.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(team.revenue)} em faturamento
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{team.totalPoints}</p>
                        <p className="text-xs text-muted-foreground">pontos</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Preview - Top 5 Individual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {profiles?.map(p => ({
                  ...p,
                  ...calculateMemberPerformance(p.user_id),
                  teamName: teams?.find(t => t.id === p.team_id)?.name || "Sem equipe",
                }))
                  .sort((a, b) => b.totalPoints - a.totalPoints)
                  .slice(0, 5)
                  .map((member, index) => (
                    <div
                      key={member.user_id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground w-6">
                          {index + 1}º
                        </span>
                        <div>
                          <p className="font-medium">{member.full_name}</p>
                          <Badge variant="outline" className="text-xs">{member.teamName}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{member.totalPoints} pts</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(member.revenue)}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Reports;
