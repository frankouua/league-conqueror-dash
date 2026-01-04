import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, CheckCircle2, XCircle, ArrowRight } from "lucide-react";

interface SoldVsExecutedPanelProps {
  month: number;
  year: number;
}

export const SoldVsExecutedPanel = ({ month, year }: SoldVsExecutedPanelProps) => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

  // Fetch revenue (sold) records
  const { data: revenueRecords } = useQuery({
    queryKey: ["revenue-comparison", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_records")
        .select("amount, attributed_to_user_id, department")
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch executed records
  const { data: executedRecords } = useQuery({
    queryKey: ["executed-comparison", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("executed_records")
        .select("amount, attributed_to_user_id, department")
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch predefined goals
  const { data: goals } = useQuery({
    queryKey: ["goals-comparison", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predefined_goals")
        .select("matched_user_id, meta1_goal, meta2_goal, meta3_goal")
        .eq("month", month)
        .eq("year", year);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch department goals
  const { data: deptGoals } = useQuery({
    queryKey: ["dept-goals-comparison", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("department_goals")
        .select("department_name, meta1_goal, meta2_goal, meta3_goal")
        .eq("month", month)
        .eq("year", year);
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate totals
  const totalSold = revenueRecords?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
  const totalExecuted = executedRecords?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
  const difference = totalExecuted - totalSold;
  const percentDiff = totalSold > 0 ? ((totalExecuted / totalSold) * 100) : 0;

  // Calculate total goals
  const totalMeta1 = goals?.reduce((sum, g) => sum + Number(g.meta1_goal), 0) || 0;
  const totalMeta2 = goals?.reduce((sum, g) => sum + Number(g.meta2_goal), 0) || 0;
  const totalMeta3 = goals?.reduce((sum, g) => sum + Number(g.meta3_goal), 0) || 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getAchievedLevel = (value: number, meta1: number, meta2: number, meta3: number) => {
    if (value >= meta3) return { level: 3, label: "Meta 3", color: "bg-amber-500" };
    if (value >= meta2) return { level: 2, label: "Meta 2", color: "bg-zinc-400" };
    if (value >= meta1) return { level: 1, label: "Meta 1", color: "bg-amber-700" };
    return { level: 0, label: "Não atingiu", color: "bg-destructive" };
  };

  const soldLevel = getAchievedLevel(totalSold, totalMeta1, totalMeta2, totalMeta3);
  const executedLevel = getAchievedLevel(totalExecuted, totalMeta1, totalMeta2, totalMeta3);

  const getProgressPercent = (value: number, goal: number) => {
    if (goal === 0) return 0;
    return Math.min((value / goal) * 100, 100);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          Vendido vs Executado
          <Badge variant="outline" className="ml-auto">
            {month}/{year}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Sold */}
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">💰 Vendido</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {formatCurrency(totalSold)}
            </div>
            <div className="mt-2">
              <Badge className={`${soldLevel.color} text-white`}>
                {soldLevel.level > 0 ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                {soldLevel.label}
              </Badge>
            </div>
            <Progress 
              value={getProgressPercent(totalSold, totalMeta1)} 
              className="mt-2 h-2"
            />
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <ArrowRight className="h-8 w-8 text-muted-foreground" />
              <div className={`text-sm font-medium ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {difference >= 0 ? (
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    +{formatCurrency(difference)}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <TrendingDown className="h-4 w-4" />
                    {formatCurrency(difference)}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {percentDiff.toFixed(1)}% do vendido
              </div>
            </div>
          </div>

          {/* Executed */}
          <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="text-sm text-green-600 dark:text-green-400 font-medium mb-1">✅ Executado</div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              {formatCurrency(totalExecuted)}
            </div>
            <div className="mt-2">
              <Badge className={`${executedLevel.color} text-white`}>
                {executedLevel.level > 0 ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                {executedLevel.label}
              </Badge>
            </div>
            <Progress 
              value={getProgressPercent(totalExecuted, totalMeta1)} 
              className="mt-2 h-2"
            />
          </div>
        </div>

        {/* Goals Reference */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="text-sm font-medium mb-3">🎯 Referência de Metas (Total)</div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Meta 1</div>
              <div className="font-semibold text-amber-700">{formatCurrency(totalMeta1)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Meta 2</div>
              <div className="font-semibold text-zinc-500">{formatCurrency(totalMeta2)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Meta 3</div>
              <div className="font-semibold text-amber-500">{formatCurrency(totalMeta3)}</div>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2">Métrica</th>
                <th className="text-right py-2 px-2">Vendido</th>
                <th className="text-right py-2 px-2">Executado</th>
                <th className="text-right py-2 px-2">Diferença</th>
                <th className="text-center py-2 px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-3 px-2 font-medium">vs Meta 1</td>
                <td className="text-right py-3 px-2">
                  <span className={totalSold >= totalMeta1 ? 'text-green-600' : 'text-red-600'}>
                    {((totalSold / totalMeta1) * 100).toFixed(1)}%
                  </span>
                </td>
                <td className="text-right py-3 px-2">
                  <span className={totalExecuted >= totalMeta1 ? 'text-green-600' : 'text-red-600'}>
                    {((totalExecuted / totalMeta1) * 100).toFixed(1)}%
                  </span>
                </td>
                <td className="text-right py-3 px-2">
                  {formatCurrency(totalExecuted - totalMeta1)}
                </td>
                <td className="text-center py-3 px-2">
                  {totalExecuted >= totalMeta1 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                  )}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-2 font-medium">vs Meta 2</td>
                <td className="text-right py-3 px-2">
                  <span className={totalSold >= totalMeta2 ? 'text-green-600' : 'text-red-600'}>
                    {totalMeta2 > 0 ? ((totalSold / totalMeta2) * 100).toFixed(1) : 0}%
                  </span>
                </td>
                <td className="text-right py-3 px-2">
                  <span className={totalExecuted >= totalMeta2 ? 'text-green-600' : 'text-red-600'}>
                    {totalMeta2 > 0 ? ((totalExecuted / totalMeta2) * 100).toFixed(1) : 0}%
                  </span>
                </td>
                <td className="text-right py-3 px-2">
                  {formatCurrency(totalExecuted - totalMeta2)}
                </td>
                <td className="text-center py-3 px-2">
                  {totalExecuted >= totalMeta2 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-2 font-medium">vs Meta 3</td>
                <td className="text-right py-3 px-2">
                  <span className={totalSold >= totalMeta3 ? 'text-green-600' : 'text-red-600'}>
                    {totalMeta3 > 0 ? ((totalSold / totalMeta3) * 100).toFixed(1) : 0}%
                  </span>
                </td>
                <td className="text-right py-3 px-2">
                  <span className={totalExecuted >= totalMeta3 ? 'text-green-600' : 'text-red-600'}>
                    {totalMeta3 > 0 ? ((totalExecuted / totalMeta3) * 100).toFixed(1) : 0}%
                  </span>
                </td>
                <td className="text-right py-3 px-2">
                  {formatCurrency(totalExecuted - totalMeta3)}
                </td>
                <td className="text-center py-3 px-2">
                  {totalExecuted >= totalMeta3 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
