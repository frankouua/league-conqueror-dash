import { useMemo } from "react";
import { TrendingUp, TrendingDown, ArrowRight, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Database } from "@/integrations/supabase/types";

type ReferralLeadStatus = Database["public"]["Enums"]["referral_lead_status"];

interface ReferralLead {
  id: string;
  status: ReferralLeadStatus;
  created_at: string;
}

interface Props {
  leads: ReferralLead[];
}

const STATUS_LABELS: Record<ReferralLeadStatus, string> = {
  nova: "Nova",
  em_contato: "Em Contato",
  sem_interesse: "Sem Interesse",
  agendou: "Agendou",
  consultou: "Consultou",
  operou: "Operou",
  pos_venda: "Pós-Venda",
  relacionamento: "Relacionamento",
  ganho: "Ganho",
  perdido: "Perdido",
};

// Pipeline stages for conversion (excluding dead-end statuses)
const PIPELINE_STAGES: ReferralLeadStatus[] = ["nova", "em_contato", "agendou", "consultou", "operou", "ganho"];

export const ReferralConversionReport = ({ leads }: Props) => {
  const stats = useMemo(() => {
    const total = leads.length;
    
    // Count by status
    const countByStatus = leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {} as Record<ReferralLeadStatus, number>);

    // For conversion rates, we consider leads that "passed through" each stage
    const passedThrough: Record<ReferralLeadStatus, number> = {
      nova: total,
      em_contato: 0,
      sem_interesse: countByStatus["sem_interesse"] || 0,
      agendou: 0,
      consultou: 0,
      operou: 0,
      pos_venda: 0,
      relacionamento: 0,
      ganho: 0,
      perdido: countByStatus["perdido"] || 0,
    };

    // Leads that reached or passed each stage
    const stageIndex = (status: ReferralLeadStatus) => PIPELINE_STAGES.indexOf(status);
    
    leads.forEach((lead) => {
      if (lead.status === "sem_interesse") return; // Dead end
      
      const currentIndex = stageIndex(lead.status);
      if (currentIndex === -1) return;
      
      // This lead has reached at least this stage
      for (let i = 1; i <= currentIndex; i++) {
        passedThrough[PIPELINE_STAGES[i]]++;
      }
    });

    // Calculate conversion rates between stages
    const conversions = PIPELINE_STAGES.slice(0, -1).map((fromStatus, index) => {
      const toStatus = PIPELINE_STAGES[index + 1];
      const fromCount = passedThrough[fromStatus];
      const toCount = passedThrough[toStatus];
      const rate = fromCount > 0 ? (toCount / fromCount) * 100 : 0;
      
      return {
        from: fromStatus,
        to: toStatus,
        fromCount,
        toCount,
        rate,
      };
    });

    // Overall conversion rate (nova -> operou)
    const overallRate = total > 0 ? ((countByStatus["operou"] || 0) / total) * 100 : 0;

    // Lost leads (sem_interesse)
    const lostCount = countByStatus["sem_interesse"] || 0;
    const lostRate = total > 0 ? (lostCount / total) * 100 : 0;

    return {
      total,
      countByStatus,
      passedThrough,
      conversions,
      overallRate,
      lostCount,
      lostRate,
    };
  }, [leads]);

  if (stats.total === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-card border-border mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <BarChart3 className="w-5 h-5 text-primary" />
          Relatório de Conversão
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total de Indicações</p>
          </div>
          <div className="bg-green-500/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{stats.countByStatus["operou"] || 0}</p>
            <p className="text-xs text-muted-foreground">Cirurgias</p>
          </div>
          <div className="bg-primary/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-primary">{stats.overallRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Taxa de Conversão</p>
          </div>
          <div className="bg-red-500/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-400">{stats.lostCount}</p>
            <p className="text-xs text-muted-foreground">Sem Interesse</p>
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground mb-2">Funil de Conversão</p>
          {stats.conversions.map((conv, index) => (
            <div key={conv.from} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    {STATUS_LABELS[conv.from]}
                    <ArrowRight className="w-3 h-3" />
                    {STATUS_LABELS[conv.to]}
                  </span>
                  <span className="font-medium text-foreground flex items-center gap-1">
                    {conv.rate >= 50 ? (
                      <TrendingUp className="w-3 h-3 text-green-400" />
                    ) : conv.rate < 30 ? (
                      <TrendingDown className="w-3 h-3 text-red-400" />
                    ) : null}
                    {conv.rate.toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={conv.rate} 
                  className="h-2 bg-secondary"
                />
              </div>
              <span className="text-xs text-muted-foreground w-16 text-right">
                {conv.toCount}/{conv.fromCount}
              </span>
            </div>
          ))}
        </div>

        {/* Status Distribution */}
        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-sm font-medium text-foreground mb-3">Distribuição por Status</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.countByStatus).map(([status, count]) => (
              <div 
                key={status} 
                className="bg-secondary/50 rounded-lg px-3 py-1.5 flex items-center gap-2"
              >
                <span className="text-xs text-muted-foreground">{STATUS_LABELS[status as ReferralLeadStatus]}:</span>
                <span className="text-sm font-medium text-foreground">{count}</span>
                <span className="text-xs text-muted-foreground">
                  ({((count / stats.total) * 100).toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
