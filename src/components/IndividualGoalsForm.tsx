import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Target, Save, Building2, User, TrendingUp, AlertTriangle, CheckCircle2, BarChart3 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { DEPARTMENTS } from "@/constants/departments";

interface DepartmentGoal {
  department_name: string;
  department_key: string;
  meta1: string;
  meta2: string;
  meta3: string;
  realized: number;
}

interface IndividualGoalsFormProps {
  month: number;
  year: number;
}

export default function IndividualGoalsForm({ month, year }: IndividualGoalsFormProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("by-department");

  // Initialize state with all departments
  const [goals, setGoals] = useState<DepartmentGoal[]>(
    DEPARTMENTS.map((dept) => ({
      department_name: dept.name,
      department_key: dept.key,
      meta1: "",
      meta2: "",
      meta3: "",
      realized: 0,
    }))
  );

  // Fetch existing goals for this user/month/year
  const { data: existingGoals, isLoading } = useQuery({
    queryKey: ["individual-goals-by-dept", user?.id, month, year],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("individual_goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("month", month)
        .eq("year", year)
        .not("department_name", "is", null);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch revenue records for this month/year
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

  const { data: revenueRecords } = useQuery({
    queryKey: ["revenue-by-dept", user?.id, month, year],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("revenue_records")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch all profiles for "Por Vendedora" view
  const { data: profiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch all individual goals for all users
  const { data: allGoals } = useQuery({
    queryKey: ["all-individual-goals", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("individual_goals")
        .select("*")
        .eq("month", month)
        .eq("year", year)
        .not("department_name", "is", null);
      if (error) throw error;
      return data;
    },
  });

  // Calculate realized amount for a department by key
  const getRealized = (deptKey: string, userId?: string) => {
    const records = revenueRecords?.filter((r) => {
      const matchesDept = r.department === deptKey;
      if (userId) {
        return matchesDept && (r.user_id === userId || r.attributed_to_user_id === userId);
      }
      return matchesDept;
    });
    return records?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
  };

  // Update state when existing goals are fetched
  useEffect(() => {
    setGoals((prev) =>
      prev.map((g) => {
        const existing = existingGoals?.find(
          (eg) => eg.department_name === g.department_name
        );
        const realized = getRealized(g.department_key, user?.id);
        return {
          ...g,
          meta1: existing?.revenue_goal?.toString() || "",
          meta2: existing?.meta2_goal?.toString() || "",
          meta3: existing?.meta3_goal?.toString() || "",
          realized,
        };
      })
    );
  }, [existingGoals, revenueRecords, user?.id]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !profile?.team_id) {
        throw new Error("Usuário não autenticado");
      }

      const goalsToSave = goals.filter((g) => g.meta1 || g.meta2 || g.meta3);

      for (const goal of goalsToSave) {
        const payload = {
          user_id: user.id,
          team_id: profile.team_id,
          month,
          year,
          department_name: goal.department_name,
          revenue_goal: parseFloat(goal.meta1.replace(/\./g, "").replace(",", ".")) || 0,
          meta2_goal: parseFloat(goal.meta2.replace(/\./g, "").replace(",", ".")) || 0,
          meta3_goal: parseFloat(goal.meta3.replace(/\./g, "").replace(",", ".")) || 0,
        };

        const existing = existingGoals?.find(
          (eg) => eg.department_name === goal.department_name
        );

        if (existing) {
          const { error } = await supabase
            .from("individual_goals")
            .update(payload)
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("individual_goals")
            .insert(payload);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["individual-goals"] });
      queryClient.invalidateQueries({ queryKey: ["individual-goals-by-dept"] });
      queryClient.invalidateQueries({ queryKey: ["all-individual-goals"] });
      toast({ title: "Metas salvas com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar metas",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateGoal = (
    deptIndex: number,
    field: "meta1" | "meta2" | "meta3",
    value: string
  ) => {
    setGoals((prev) =>
      prev.map((g, i) => (i === deptIndex ? { ...g, [field]: value } : g))
    );
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const parseGoalValue = (value: string) =>
    parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;

  // Calculate progress and status for a goal
  const getProgressStatus = (realized: number, meta1: number, meta2: number, meta3: number) => {
    if (meta3 <= 0 && meta2 <= 0 && meta1 <= 0) {
      return { percent: 0, status: "none", label: "Sem meta", color: "text-muted-foreground" };
    }

    // Calculate progress based on Meta 3 (our focus)
    const targetMeta = meta3 > 0 ? meta3 : meta2 > 0 ? meta2 : meta1;
    const percent = targetMeta > 0 ? Math.round((realized / targetMeta) * 100) : 0;

    if (meta3 > 0 && realized >= meta3) {
      return { percent: Math.min(percent, 100), status: "meta3", label: "Meta 3 ✓", color: "text-primary" };
    }
    if (meta2 > 0 && realized >= meta2) {
      return { percent: Math.min(percent, 100), status: "meta2", label: "Meta 2 ✓", color: "text-success" };
    }
    if (meta1 > 0 && realized >= meta1) {
      return { percent: Math.min(percent, 100), status: "meta1", label: "Meta 1 ✓", color: "text-success" };
    }
    
    return { percent, status: "pending", label: `${percent}%`, color: "text-warning" };
  };

  // Calculate totals
  const totals = goals.reduce(
    (acc, g) => ({
      meta1: acc.meta1 + parseGoalValue(g.meta1),
      meta2: acc.meta2 + parseGoalValue(g.meta2),
      meta3: acc.meta3 + parseGoalValue(g.meta3),
      realized: acc.realized + g.realized,
    }),
    { meta1: 0, meta2: 0, meta3: 0, realized: 0 }
  );

  const totalProgress = getProgressStatus(totals.realized, totals.meta1, totals.meta2, totals.meta3);

  // Calculate data for "Por Vendedora" view
  const getSalesPersonData = () => {
    if (!profiles || !allGoals) return [];

    return profiles.map((p) => {
      const userGoals = allGoals.filter((g) => g.user_id === p.user_id);
      const totalMeta1 = userGoals.reduce((sum, g) => sum + Number(g.revenue_goal || 0), 0);
      const totalMeta2 = userGoals.reduce((sum, g) => sum + Number(g.meta2_goal || 0), 0);
      const totalMeta3 = userGoals.reduce((sum, g) => sum + Number(g.meta3_goal || 0), 0);
      
      // Calculate realized for this user
      const userRevenue = revenueRecords?.filter(
        (r) => r.user_id === p.user_id || r.attributed_to_user_id === p.user_id
      );
      const realized = userRevenue?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;

      const progress = getProgressStatus(realized, totalMeta1, totalMeta2, totalMeta3);

      return {
        userId: p.user_id,
        name: p.full_name,
        meta1: totalMeta1,
        meta2: totalMeta2,
        meta3: totalMeta3,
        realized,
        remaining: Math.max((totalMeta3 || totalMeta2 || totalMeta1) - realized, 0),
        progress,
      };
    }).filter((p) => p.meta1 > 0 || p.meta2 > 0 || p.meta3 > 0 || p.realized > 0)
      .sort((a, b) => b.realized - a.realized);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Carregando metas...</p>
        </CardContent>
      </Card>
    );
  }

  const salesPersonData = getSalesPersonData();

  return (
    <Card className="border-primary/30">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Acompanhamento de Metas
        </CardTitle>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-2"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? "Salvando..." : "Salvar Metas"}
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full max-w-lg mx-auto grid-cols-3">
            <TabsTrigger value="by-department" className="gap-2">
              <Building2 className="w-4 h-4" />
              Por Departamento
            </TabsTrigger>
            <TabsTrigger value="chart" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Gráfico
            </TabsTrigger>
            <TabsTrigger value="by-saleswoman" className="gap-2">
              <User className="w-4 h-4" />
              Por Vendedora
            </TabsTrigger>
          </TabsList>

          {/* POR DEPARTAMENTO */}
          <TabsContent value="by-department" className="space-y-4">
            <div className="bg-primary/10 rounded-lg p-3 text-center">
              <p className="font-semibold text-primary">
                VENDEDORA: {profile?.full_name?.toUpperCase() || "---"}
              </p>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-bold min-w-[220px]">Departamento</TableHead>
                    <TableHead className="text-center font-bold w-[120px]">META 1</TableHead>
                    <TableHead className="text-center font-bold w-[120px]">META 2</TableHead>
                    <TableHead className="text-center font-bold w-[120px]">META 3</TableHead>
                    <TableHead className="text-center font-bold text-success w-[120px]">REALIZADO</TableHead>
                    <TableHead className="text-center font-bold text-destructive w-[120px]">FALTAM</TableHead>
                    <TableHead className="text-center font-bold w-[100px]">PROGRESSO</TableHead>
                    <TableHead className="text-center font-bold w-[100px]">STATUS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {goals.map((goal, index) => {
                    const meta1 = parseGoalValue(goal.meta1);
                    const meta2 = parseGoalValue(goal.meta2);
                    const meta3 = parseGoalValue(goal.meta3);
                    const targetMeta = meta3 > 0 ? meta3 : meta2 > 0 ? meta2 : meta1;
                    const remaining = Math.max(targetMeta - goal.realized, 0);
                    const progress = getProgressStatus(goal.realized, meta1, meta2, meta3);

                    return (
                      <TableRow key={goal.department_name} className="hover:bg-muted/30">
                        <TableCell className="font-medium text-sm">
                          {goal.department_name}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            placeholder="0"
                            value={goal.meta1}
                            onChange={(e) => updateGoal(index, "meta1", e.target.value)}
                            className="text-center text-sm h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            placeholder="0"
                            value={goal.meta2}
                            onChange={(e) => updateGoal(index, "meta2", e.target.value)}
                            className="text-center text-sm h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            placeholder="0"
                            value={goal.meta3}
                            onChange={(e) => updateGoal(index, "meta3", e.target.value)}
                            className="text-center text-sm h-8 border-primary/50"
                          />
                        </TableCell>
                        <TableCell className="text-center text-success font-medium">
                          {formatCurrency(goal.realized)}
                        </TableCell>
                        <TableCell className="text-center text-destructive font-medium">
                          {formatCurrency(remaining)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={progress.color}>{progress.percent}%</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={progress.status === "meta3" ? "default" : progress.status.includes("meta") ? "secondary" : "outline"}
                            className={`text-xs ${
                              progress.status === "meta3" ? "bg-primary" :
                              progress.status === "meta2" || progress.status === "meta1" ? "bg-success text-success-foreground" :
                              progress.status === "pending" ? "bg-warning/20 text-warning border-warning" :
                              ""
                            }`}
                          >
                            {progress.status === "none" ? (
                              <span className="flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                0%
                              </span>
                            ) : progress.status === "pending" ? (
                              <span className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                {progress.percent}%
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                {progress.label}
                              </span>
                            )}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* TOTAL ROW */}
                  <TableRow className="bg-primary/10 font-bold border-t-2 border-primary/30">
                    <TableCell className="font-bold">TOTAL</TableCell>
                    <TableCell className="text-center">{formatCurrency(totals.meta1)}</TableCell>
                    <TableCell className="text-center">{formatCurrency(totals.meta2)}</TableCell>
                    <TableCell className="text-center text-primary">{formatCurrency(totals.meta3)}</TableCell>
                    <TableCell className="text-center text-success">{formatCurrency(totals.realized)}</TableCell>
                    <TableCell className="text-center text-destructive">
                      {formatCurrency(Math.max((totals.meta3 || totals.meta2 || totals.meta1) - totals.realized, 0))}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={totalProgress.color}>{totalProgress.percent}%</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="default"
                        className={`${
                          totalProgress.status === "meta3" ? "bg-primary" :
                          totalProgress.status.includes("meta") ? "bg-success" :
                          "bg-warning/20 text-warning border-warning"
                        }`}
                      >
                        {totalProgress.status === "pending" ? (
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {totalProgress.percent}%
                          </span>
                        ) : (
                          totalProgress.label
                        )}
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* GRÁFICO */}
          <TabsContent value="chart" className="space-y-4">
            <div className="bg-primary/10 rounded-lg p-3 text-center mb-4">
              <p className="font-semibold text-primary">
                META 3 vs REALIZADO - {profile?.full_name?.toUpperCase() || "---"}
              </p>
            </div>

            {/* Chart */}
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={goals.map((g) => {
                    const meta3 = parseGoalValue(g.meta3);
                    const shortName = g.department_name.replace(/^\d+\s*-\s*/, "").substring(0, 15);
                    return {
                      name: shortName,
                      fullName: g.department_name,
                      meta3,
                      realized: g.realized,
                      percent: meta3 > 0 ? Math.round((g.realized / meta3) * 100) : 0,
                    };
                  })}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis 
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        return payload[0].payload.fullName;
                      }
                      return label;
                    }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="meta3" 
                    name="Meta 3" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                    opacity={0.7}
                  />
                  <Bar 
                    dataKey="realized" 
                    name="Realizado" 
                    radius={[4, 4, 0, 0]}
                  >
                    {goals.map((g, index) => {
                      const meta3 = parseGoalValue(g.meta3);
                      const percent = meta3 > 0 ? (g.realized / meta3) * 100 : 0;
                      let color = "hsl(var(--destructive))";
                      if (percent >= 100) color = "hsl(var(--success))";
                      else if (percent >= 70) color = "hsl(var(--warning))";
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <Card className="bg-primary/10 border-primary/30">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">Meta 3 Total</p>
                  <p className="text-xl font-bold text-primary">{formatCurrency(totals.meta3)}</p>
                </CardContent>
              </Card>
              <Card className="bg-success/10 border-success/30">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">Realizado</p>
                  <p className="text-xl font-bold text-success">{formatCurrency(totals.realized)}</p>
                </CardContent>
              </Card>
              <Card className="bg-destructive/10 border-destructive/30">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">Faltam</p>
                  <p className="text-xl font-bold text-destructive">
                    {formatCurrency(Math.max(totals.meta3 - totals.realized, 0))}
                  </p>
                </CardContent>
              </Card>
              <Card className={`${totalProgress.status === "meta3" ? "bg-primary/20 border-primary" : totalProgress.status.includes("meta") ? "bg-success/20 border-success" : "bg-warning/20 border-warning"}`}>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">Progresso</p>
                  <p className={`text-xl font-bold ${totalProgress.color}`}>
                    {totalProgress.percent}%
                  </p>
                  <Badge 
                    className={`mt-1 ${
                      totalProgress.status === "meta3" ? "bg-primary" :
                      totalProgress.status.includes("meta") ? "bg-success" :
                      "bg-warning"
                    }`}
                  >
                    {totalProgress.label}
                  </Badge>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* POR VENDEDORA */}
          <TabsContent value="by-saleswoman" className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-bold min-w-[200px]">Vendedora</TableHead>
                    <TableHead className="text-center font-bold w-[120px]">META 1</TableHead>
                    <TableHead className="text-center font-bold w-[120px]">META 2</TableHead>
                    <TableHead className="text-center font-bold w-[120px]">META 3</TableHead>
                    <TableHead className="text-center font-bold text-success w-[120px]">REALIZADO</TableHead>
                    <TableHead className="text-center font-bold text-destructive w-[120px]">FALTAM</TableHead>
                    <TableHead className="text-center font-bold w-[100px]">PROGRESSO</TableHead>
                    <TableHead className="text-center font-bold w-[100px]">STATUS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesPersonData.map((person) => (
                    <TableRow key={person.userId} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{person.name}</TableCell>
                      <TableCell className="text-center">{formatCurrency(person.meta1)}</TableCell>
                      <TableCell className="text-center">{formatCurrency(person.meta2)}</TableCell>
                      <TableCell className="text-center text-primary font-medium">{formatCurrency(person.meta3)}</TableCell>
                      <TableCell className="text-center text-success font-medium">{formatCurrency(person.realized)}</TableCell>
                      <TableCell className="text-center text-destructive font-medium">{formatCurrency(person.remaining)}</TableCell>
                      <TableCell className="text-center">
                        <span className={person.progress.color}>{person.progress.percent}%</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={person.progress.status === "meta3" ? "default" : person.progress.status.includes("meta") ? "secondary" : "outline"}
                          className={`text-xs ${
                            person.progress.status === "meta3" ? "bg-primary" :
                            person.progress.status === "meta2" || person.progress.status === "meta1" ? "bg-success text-success-foreground" :
                            person.progress.status === "pending" ? "bg-warning/20 text-warning border-warning" :
                            ""
                          }`}
                        >
                          {person.progress.status === "none" ? (
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              0%
                            </span>
                          ) : person.progress.status === "pending" ? (
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              {person.progress.percent}%
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              {person.progress.label}
                            </span>
                          )}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {salesPersonData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhuma vendedora com metas cadastradas para este mês.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
