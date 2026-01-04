import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Trophy, Crown } from "lucide-react";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MonthlyData {
  month: string;
  monthLabel: string;
  Lioness: number;
  Tróia: number;
  winner: string;
}

const TEAM_COLORS = {
  Lioness: "hsl(45, 93%, 47%)", // Golden
  Tróia: "hsl(0, 72%, 51%)", // Red
};

export const MonthlyTeamRankingChart = () => {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMonthlyRankings = async () => {
      setIsLoading(true);
      try {
        const { data: teams } = await supabase
          .from("teams")
          .select("id, name");

        if (!teams) return;

        const months: MonthlyData[] = [];
        const now = new Date();

        // Get last 6 months
        for (let i = 5; i >= 0; i--) {
          const monthDate = subMonths(now, i);
          const start = startOfMonth(monthDate);
          const end = endOfMonth(monthDate);
          const startStr = start.toISOString().split("T")[0];
          const endStr = end.toISOString().split("T")[0];

          const [{ data: revenue }, { data: cancellations }] = await Promise.all([
            supabase
              .from("revenue_records")
              .select("team_id, amount")
              .gte("date", startStr)
              .lte("date", endStr),
            supabase
              .from("cancellations")
              .select("team_id, contract_value")
              .gte("cancellation_request_date", startStr)
              .lte("cancellation_request_date", endStr)
              .in("status", ["cancelled_with_fine", "cancelled_no_fine", "credit_used"]),
          ]);

          const teamPoints: Record<string, number> = {};

          for (const team of teams) {
            const teamRevenue = revenue?.filter(r => r.team_id === team.id) || [];
            const teamCancellations = cancellations?.filter(c => c.team_id === team.id) || [];
            
            const grossRevenue = teamRevenue.reduce((sum, r) => sum + Number(r.amount), 0);
            const cancelledAmount = teamCancellations.reduce((sum, c) => sum + Number(c.contract_value), 0);
            const netRevenue = grossRevenue - cancelledAmount;
            
            // Points = R$1000 = 1 point
            teamPoints[team.name] = Math.floor(Math.max(0, netRevenue) / 1000);
          }

          const lionessPoints = teamPoints["Lioness"] || 0;
          const troiaPoints = teamPoints["Tróia"] || 0;

          months.push({
            month: format(monthDate, "yyyy-MM"),
            monthLabel: format(monthDate, "MMM", { locale: ptBR }).toUpperCase(),
            Lioness: lionessPoints,
            Tróia: troiaPoints,
            winner: lionessPoints > troiaPoints ? "Lioness" : troiaPoints > lionessPoints ? "Tróia" : "Empate",
          });
        }

        setMonthlyData(months);
      } catch (error) {
        console.error("Error fetching monthly rankings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMonthlyRankings();
  }, []);

  const lionessWins = monthlyData.filter(m => m.winner === "Lioness").length;
  const troiaWins = monthlyData.filter(m => m.winner === "Tróia").length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Ranking Mensal dos Times
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Ranking Mensal dos Times
          </div>
          <div className="flex gap-4 text-sm font-normal">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span className="text-yellow-600">Lioness: {lionessWins}</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-red-500" />
              <span className="text-red-600">Tróia: {troiaWins}</span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData} barGap={8}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="monthLabel" 
              tick={{ fill: 'hsl(var(--foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              label={{ 
                value: 'Pontos', 
                angle: -90, 
                position: 'insideLeft',
                fill: 'hsl(var(--foreground))'
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number, name: string) => [
                `${value.toLocaleString("pt-BR")} pts`,
                name
              ]}
              labelFormatter={(label) => `Mês: ${label}`}
            />
            <Legend />
            <Bar 
              dataKey="Lioness" 
              fill={TEAM_COLORS.Lioness}
              radius={[4, 4, 0, 0]}
              name="Lioness"
            />
            <Bar 
              dataKey="Tróia" 
              fill={TEAM_COLORS.Tróia}
              radius={[4, 4, 0, 0]}
              name="Tróia"
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Monthly winners badges */}
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {monthlyData.map((month) => (
            <div
              key={month.month}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                month.winner === "Lioness"
                  ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                  : month.winner === "Tróia"
                  ? "bg-red-100 text-red-800 border border-red-300"
                  : "bg-gray-100 text-gray-600 border border-gray-300"
              }`}
            >
              {month.winner !== "Empate" && <Trophy className="h-3 w-3" />}
              <span>{month.monthLabel}:</span>
              <span className="font-bold">{month.winner}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
