import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Users,
  Target,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Trophy,
} from "lucide-react";

interface GoalTrackingDashboardProps {
  month: number;
  year: number;
}

// Mapping for department values to display names
const DEPARTMENT_DISPLAY_NAMES: Record<string, string> = {
  "cirurgia_plastica": "Cirurgia Plástica",
  "consulta_cirurgia_plastica": "Consulta Cirurgia Plástica",
  "pos_operatorio": "Pós Operatório",
  "soroterapia_protocolos": "Soroterapia / Protocolos Nutricionais",
  "harmonizacao_facial_corporal": "Harmonização Facial e Corporal",
  "spa_estetica": "Spa e Estética",
  "unique_travel": "Unique Travel Experience",
  "luxskin": "Luxskin",
};

const GoalTrackingDashboard = ({ month, year }: GoalTrackingDashboardProps) => {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

  // Fetch department goals
  const { data: departmentGoals } = useQuery({
    queryKey: ["department-goals-tracking", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("department_goals")
        .select("*")
        .eq("month", month)
        .eq("year", year)
        .order("meta1_goal", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch all revenue records with department
  const { data: revenueRecords } = useQuery({
    queryKey: ["revenue-tracking", month, year],
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

  // Fetch confirmed cancellations
  const { data: cancellations } = useQuery({
    queryKey: ["cancellations-tracking", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cancellations")
        .select("*")
        .gte("cancellation_request_date", startDate)
        .lte("cancellation_request_date", endDate)
        .in("status", ["cancelled_with_fine", "cancelled_no_fine", "credit_used"]);
      if (error) throw error;
      return data;
    },
  });

  // Fetch all profiles
  const { data: profiles } = useQuery({
    queryKey: ["profiles-tracking"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch individual goals
  const { data: individualGoals } = useQuery({
    queryKey: ["individual-goals-tracking", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("individual_goals")
        .select("*")
        .eq("month", month)
        .eq("year", year);
      if (error) throw error;
      return data;
    },
  });

  // Fetch teams
  const { data: teams } = useQuery({
    queryKey: ["teams-tracking"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("*");
      if (error) throw error;
      return data;
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getProgressPercent = (actual: number, goal: number) =>
    goal > 0 ? Math.min(Math.round((actual / goal) * 100), 100) : 0;

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return "text-success";
    if (percent >= 70) return "text-warning";
    return "text-destructive";
  };

  const getStatusBadge = (percent: number) => {
    if (percent >= 100) {
      return (
        <Badge className="bg-success text-success-foreground">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Atingida
        </Badge>
      );
    }
    if (percent >= 70) {
      return (
        <Badge variant="outline" className="text-warning border-warning">
          {percent}%
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-destructive border-destructive">
        <AlertTriangle className="w-3 h-3 mr-1" />
        {percent}%
      </Badge>
    );
  };

  // Calculate total cancelled amount
  const totalCancelledAmount = cancellations?.reduce((sum, c) => sum + Number(c.contract_value), 0) || 0;

  // Calculate revenue by department
  const getRevenueByDepartment = (departmentName: string) => {
    if (!revenueRecords) return 0;
    
    const matchingRecords = revenueRecords.filter(r => {
      const displayName = DEPARTMENT_DISPLAY_NAMES[r.department || ""] || "";
      return displayName === departmentName;
    });
    
    return matchingRecords.reduce((sum, r) => sum + Number(r.amount), 0);
  };

  // Calculate revenue by user
  const getRevenueByUser = (userId: string) => {
    if (!revenueRecords) return 0;
    return revenueRecords
      .filter(r => r.user_id === userId)
      .reduce((sum, r) => sum + Number(r.amount), 0);
  };

  // Department totals
  const totalMeta1 = departmentGoals?.reduce((sum, g) => sum + Number(g.meta1_goal), 0) || 0;
  const totalMeta2 = departmentGoals?.reduce((sum, g) => sum + Number(g.meta2_goal), 0) || 0;
  const totalMeta3 = departmentGoals?.reduce((sum, g) => sum + Number(g.meta3_goal), 0) || 0;
  const totalDeptRevenue = revenueRecords?.filter(r => r.department).reduce((sum, r) => sum + Number(r.amount), 0) || 0;
  
  // Individual totals - subtract cancellations from total revenue
  const totalIndividualGoal = individualGoals?.reduce((sum, g) => sum + Number(g.revenue_goal), 0) || 0;
  const grossRevenue = revenueRecords?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
  const totalRevenue = grossRevenue - totalCancelledAmount;

  // Get individual data with goals and actual
  const individualsData = profiles?.map(profile => {
    const goal = individualGoals?.find(g => g.user_id === profile.user_id);
    const actual = getRevenueByUser(profile.user_id);
    const goalValue = Number(goal?.revenue_goal) || 0;
    const team = teams?.find(t => t.id === profile.team_id);
    
    return {
      id: profile.user_id,
      name: profile.full_name,
      team: team?.name || "Sem equipe",
      teamId: profile.team_id,
      goal: goalValue,
      actual,
      remaining: Math.max(0, goalValue - actual),
      percent: getProgressPercent(actual, goalValue),
    };
  }).filter(p => p.goal > 0).sort((a, b) => b.percent - a.percent) || [];

  // Get department data with goals and actual
  const departmentsData = departmentGoals?.map(dept => {
    const actual = getRevenueByDepartment(dept.department_name);
    const meta1 = Number(dept.meta1_goal);
    
    return {
      id: dept.id,
      name: dept.department_name,
      meta1,
      meta2: Number(dept.meta2_goal),
      meta3: Number(dept.meta3_goal),
      actual,
      remaining: Math.max(0, meta1 - actual),
      percent: getProgressPercent(actual, meta1),
    };
  }).sort((a, b) => b.percent - a.percent) || [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Clinic */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5 text-primary" />
              <span className="font-semibold">Total Clínica</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Meta 1:</span>
                <span className="font-medium">{formatCurrency(totalMeta1)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Realizado:</span>
                <span className="font-medium text-success">{formatCurrency(totalRevenue)}</span>
              </div>
              <Progress value={getProgressPercent(totalRevenue, totalMeta1)} className="h-2" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Faltam:</span>
                <span className={`font-semibold ${totalRevenue >= totalMeta1 ? "text-success" : "text-destructive"}`}>
                  {totalRevenue >= totalMeta1 ? "Meta atingida!" : formatCurrency(totalMeta1 - totalRevenue)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meta 2 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-success" />
              <span className="font-semibold">Meta 2</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Meta:</span>
                <span className="font-medium">{formatCurrency(totalMeta2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Realizado:</span>
                <span className="font-medium text-success">{formatCurrency(totalRevenue)}</span>
              </div>
              <Progress value={getProgressPercent(totalRevenue, totalMeta2)} className="h-2" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Faltam:</span>
                <span className={`font-semibold ${totalRevenue >= totalMeta2 ? "text-success" : "text-warning"}`}>
                  {totalRevenue >= totalMeta2 ? "Meta atingida!" : formatCurrency(totalMeta2 - totalRevenue)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meta 3 */}
        <Card className={totalRevenue >= totalMeta3 ? "border-primary bg-gradient-gold-shine" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className={`w-5 h-5 ${totalRevenue >= totalMeta3 ? "text-primary-foreground" : "text-primary"}`} />
              <span className={`font-semibold ${totalRevenue >= totalMeta3 ? "text-primary-foreground" : ""}`}>Meta 3 (Suprema)</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className={totalRevenue >= totalMeta3 ? "text-primary-foreground/70" : "text-muted-foreground"}>Meta:</span>
                <span className={`font-medium ${totalRevenue >= totalMeta3 ? "text-primary-foreground" : ""}`}>{formatCurrency(totalMeta3)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className={totalRevenue >= totalMeta3 ? "text-primary-foreground/70" : "text-muted-foreground"}>Realizado:</span>
                <span className={`font-medium ${totalRevenue >= totalMeta3 ? "text-primary-foreground" : "text-success"}`}>{formatCurrency(totalRevenue)}</span>
              </div>
              <Progress value={getProgressPercent(totalRevenue, totalMeta3)} className="h-2" />
              <div className="flex justify-between text-sm">
                <span className={totalRevenue >= totalMeta3 ? "text-primary-foreground/70" : "text-muted-foreground"}>Faltam:</span>
                <span className={`font-semibold ${totalRevenue >= totalMeta3 ? "text-primary-foreground" : ""}`}>
                  {totalRevenue >= totalMeta3 ? "🏆 Meta atingida!" : formatCurrency(totalMeta3 - totalRevenue)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Department and Individual */}
      <Tabs defaultValue="departments" className="space-y-4">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
          <TabsTrigger value="departments" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Por Departamento
          </TabsTrigger>
          <TabsTrigger value="individuals" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Por Vendedora
          </TabsTrigger>
        </TabsList>

        {/* Departments Tab */}
        <TabsContent value="departments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Acompanhamento por Departamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Departamento</TableHead>
                      <TableHead className="text-right">Meta 1</TableHead>
                      <TableHead className="text-right">Realizado</TableHead>
                      <TableHead className="text-right">Faltam</TableHead>
                      <TableHead className="text-center">Progresso</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departmentsData.map((dept) => (
                      <TableRow key={dept.id}>
                        <TableCell className="font-medium">{dept.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(dept.meta1)}</TableCell>
                        <TableCell className="text-right text-success font-medium">
                          {formatCurrency(dept.actual)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${dept.remaining > 0 ? "text-destructive" : "text-success"}`}>
                          {dept.remaining > 0 ? formatCurrency(dept.remaining) : "✓"}
                        </TableCell>
                        <TableCell>
                          <div className="w-24 mx-auto">
                            <Progress value={dept.percent} className="h-2" />
                            <span className={`text-xs ${getProgressColor(dept.percent)}`}>{dept.percent}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{getStatusBadge(dept.percent)}</TableCell>
                      </TableRow>
                    ))}
                    {/* Total Row */}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalMeta1)}</TableCell>
                      <TableCell className="text-right text-success">{formatCurrency(totalDeptRevenue)}</TableCell>
                      <TableCell className={`text-right ${totalDeptRevenue >= totalMeta1 ? "text-success" : "text-destructive"}`}>
                        {totalDeptRevenue >= totalMeta1 ? "✓" : formatCurrency(totalMeta1 - totalDeptRevenue)}
                      </TableCell>
                      <TableCell>
                        <div className="w-24 mx-auto">
                          <Progress value={getProgressPercent(totalDeptRevenue, totalMeta1)} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(getProgressPercent(totalDeptRevenue, totalMeta1))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Individuals Tab */}
        <TabsContent value="individuals">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Acompanhamento por Vendedora
              </CardTitle>
            </CardHeader>
            <CardContent>
              {individualsData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-warning" />
                  <p>Nenhuma meta individual definida para este período.</p>
                  <p className="text-sm">As vendedoras precisam definir suas metas na página de Metas.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendedora</TableHead>
                        <TableHead>Equipe</TableHead>
                        <TableHead className="text-right">Meta</TableHead>
                        <TableHead className="text-right">Realizado</TableHead>
                        <TableHead className="text-right">Faltam</TableHead>
                        <TableHead className="text-center">Progresso</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {individualsData.map((person, index) => (
                        <TableRow key={person.id} className={index === 0 ? "bg-primary/5" : ""}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {index === 0 && <Trophy className="w-4 h-4 text-primary" />}
                              {person.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{person.team}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(person.goal)}</TableCell>
                          <TableCell className="text-right text-success font-medium">
                            {formatCurrency(person.actual)}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${person.remaining > 0 ? "text-destructive" : "text-success"}`}>
                            {person.remaining > 0 ? formatCurrency(person.remaining) : "✓"}
                          </TableCell>
                          <TableCell>
                            <div className="w-24 mx-auto">
                              <Progress value={person.percent} className="h-2" />
                              <span className={`text-xs ${getProgressColor(person.percent)}`}>{person.percent}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{getStatusBadge(person.percent)}</TableCell>
                        </TableRow>
                      ))}
                      {/* Total Row */}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={2}>TOTAL</TableCell>
                        <TableCell className="text-right">{formatCurrency(totalIndividualGoal)}</TableCell>
                        <TableCell className="text-right text-success">{formatCurrency(totalRevenue)}</TableCell>
                        <TableCell className={`text-right ${totalRevenue >= totalIndividualGoal ? "text-success" : "text-destructive"}`}>
                          {totalRevenue >= totalIndividualGoal ? "✓" : formatCurrency(totalIndividualGoal - totalRevenue)}
                        </TableCell>
                        <TableCell>
                          <div className="w-24 mx-auto">
                            <Progress value={getProgressPercent(totalRevenue, totalIndividualGoal)} className="h-2" />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(getProgressPercent(totalRevenue, totalIndividualGoal))}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GoalTrackingDashboard;
