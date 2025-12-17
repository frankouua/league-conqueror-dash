import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp } from "lucide-react";

export interface ChartData {
  month: string;
  team1: number;
  team2: number;
}

interface EvolutionChartProps {
  data: ChartData[];
  team1Name: string;
  team2Name: string;
}

const EvolutionChart = ({ data, team1Name, team2Name }: EvolutionChartProps) => {
  return (
    <div className="bg-gradient-card rounded-2xl p-6 border border-border">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-primary/10">
          <TrendingUp className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Evolução de Pontos</h3>
          <p className="text-muted-foreground text-sm">
            Comparação mensal entre equipes
          </p>
        </div>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(0 0% 18%)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              stroke="hsl(0 0% 60%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(0 0% 60%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(0 0% 8%)",
                border: "1px solid hsl(0 0% 18%)",
                borderRadius: "12px",
                padding: "12px",
              }}
              labelStyle={{ color: "hsl(0 0% 98%)", fontWeight: "bold" }}
              itemStyle={{ color: "hsl(0 0% 60%)" }}
            />
            <Legend
              wrapperStyle={{
                paddingTop: "20px",
              }}
            />
            <Line
              type="monotone"
              dataKey="team1"
              name={team1Name}
              stroke="hsl(43 65% 52%)"
              strokeWidth={3}
              dot={{ fill: "hsl(43 65% 52%)", strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: "hsl(43 65% 52%)" }}
            />
            <Line
              type="monotone"
              dataKey="team2"
              name={team2Name}
              stroke="hsl(217 91% 60%)"
              strokeWidth={3}
              dot={{ fill: "hsl(217 91% 60%)", strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: "hsl(217 91% 60%)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default EvolutionChart;
