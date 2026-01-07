import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle2 } from "lucide-react";
import { calculatePaceMetrics } from "@/lib/paceAnalysis";
import brasaoLioness from "@/assets/brasao-lioness-team.png";
import brasaoTroia from "@/assets/brasao-troia-team.png";

interface DepartmentGoal {
  name: string;
  goal: number;
  sold: number;
}

interface TeamProgressData {
  teamId: string;
  teamName: string;
  departments: DepartmentGoal[];
  totalGoal: number;
  totalSold: number;
}

interface TeamProgressTableProps {
  teamsData: TeamProgressData[];
  currentDay: number;
  totalDaysInMonth: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCompact = (value: number) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toFixed(0);
};

const TeamProgressTable = ({ teamsData, currentDay, totalDaysInMonth }: TeamProgressTableProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {teamsData.map((team) => {
        const teamLogo = team.teamName.toLowerCase().includes("lioness")
          ? brasaoLioness
          : brasaoTroia;

        const totalPaceMetrics = calculatePaceMetrics(
          team.totalGoal,
          team.totalSold,
          currentDay,
          totalDaysInMonth
        );

        return (
          <Card key={team.teamId} className="bg-gradient-card border-border overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <img
                  src={teamLogo}
                  alt={team.teamName}
                  className="w-10 h-10 object-contain"
                />
                <div className="flex-1">
                  <CardTitle className="text-lg font-bold text-foreground">
                    {team.teamName}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">
                      Total: {formatCurrency(team.totalSold)} / {formatCurrency(team.totalGoal)}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${totalPaceMetrics.bgColor} ${totalPaceMetrics.textColor} ${totalPaceMetrics.borderColor}`}
                    >
                      {totalPaceMetrics.isAbove ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      {totalPaceMetrics.formattedDiff}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="text-xs font-semibold text-muted-foreground w-[30%]">
                        Categoria
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground text-right">
                        Meta
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground text-right">
                        Vendido
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground text-right">
                        Esperado
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground text-right">
                        Falta
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground text-center w-[80px]">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {team.departments.map((dept, idx) => {
                      const paceMetrics = calculatePaceMetrics(
                        dept.goal,
                        dept.sold,
                        currentDay,
                        totalDaysInMonth
                      );
                      const remaining = Math.max(0, dept.goal - dept.sold);
                      const progress = dept.goal > 0 ? (dept.sold / dept.goal) * 100 : 0;

                      return (
                        <TableRow
                          key={dept.name}
                          className={`border-border/30 ${
                            idx % 2 === 0 ? "bg-muted/5" : ""
                          }`}
                        >
                          <TableCell className="py-2">
                            <span className="text-xs font-medium text-foreground truncate block max-w-[120px]" title={dept.name}>
                              {dept.name}
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <span className="text-xs text-muted-foreground font-mono">
                              {formatCompact(dept.goal)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <span className="text-xs font-semibold text-foreground font-mono">
                              {formatCompact(dept.sold)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <span className="text-xs text-muted-foreground font-mono">
                              {formatCompact(paceMetrics.expected)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <span
                              className={`text-xs font-mono ${
                                remaining === 0
                                  ? "text-success font-semibold"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {remaining === 0 ? "✓" : formatCompact(remaining)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center py-2">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 ${paceMetrics.bgColor} ${paceMetrics.textColor} ${paceMetrics.borderColor}`}
                            >
                              {paceMetrics.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {/* Total Row */}
                    <TableRow className="border-t-2 border-primary/30 bg-primary/5 font-semibold">
                      <TableCell className="py-2">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          TOTAL
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-2">
                        <span className="text-xs font-bold text-foreground font-mono">
                          {formatCompact(team.totalGoal)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-2">
                        <span className="text-xs font-bold text-primary font-mono">
                          {formatCompact(team.totalSold)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-2">
                        <span className="text-xs font-bold text-muted-foreground font-mono">
                          {formatCompact(totalPaceMetrics.expected)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-2">
                        <span
                          className={`text-xs font-bold font-mono ${
                            team.totalGoal - team.totalSold <= 0
                              ? "text-success"
                              : "text-foreground"
                          }`}
                        >
                          {team.totalGoal - team.totalSold <= 0
                            ? "✓ Meta!"
                            : formatCompact(team.totalGoal - team.totalSold)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 font-bold ${totalPaceMetrics.bgColor} ${totalPaceMetrics.textColor} ${totalPaceMetrics.borderColor}`}
                        >
                          {totalPaceMetrics.formattedDiff}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Progress bar visual */}
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progresso: {((team.totalSold / team.totalGoal) * 100).toFixed(1)}%</span>
                  <span>Dia {currentDay}/{totalDaysInMonth}</span>
                </div>
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  {/* Expected progress indicator */}
                  <div
                    className="absolute top-0 h-full w-0.5 bg-foreground/50 z-10"
                    style={{ left: `${(currentDay / totalDaysInMonth) * 100}%` }}
                  />
                  {/* Actual progress */}
                  <div
                    className={`h-full rounded-full transition-all ${
                      totalPaceMetrics.isAbove
                        ? "bg-success"
                        : totalPaceMetrics.percentDiff >= -10
                        ? "bg-amber-500"
                        : "bg-destructive"
                    }`}
                    style={{ width: `${Math.min(100, (team.totalSold / team.totalGoal) * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-success" /> Vendido
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-0.5 bg-foreground/50" /> Esperado (dia)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default TeamProgressTable;
