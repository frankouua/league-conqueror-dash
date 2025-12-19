import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Target, Save } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Departamentos/Grupos de procedimento conforme a imagem
const DEPARTMENTS = [
  "01 - CIRURGIA PLÁSTICA",
  "02 - CONSULTA CIRURGIA PLÁSTICA",
  "03 - PÓS OPERATÓRIO",
  "04 - SOROTERAPIA / PROTOCOLOS NUTRICIONAIS",
  "08 - HARMONIZAÇÃO FACIAL E CORPORAL",
  "09 - SPA E ESTÉTICA",
  "UNIQUE TRAVEL EXPERIENCE",
  "LUXSKIN",
];

interface DepartmentGoal {
  department_name: string;
  meta1: string;
  meta2: string;
  meta3: string;
}

interface IndividualGoalsFormProps {
  month: number;
  year: number;
}

export default function IndividualGoalsForm({ month, year }: IndividualGoalsFormProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize state with all departments
  const [goals, setGoals] = useState<DepartmentGoal[]>(
    DEPARTMENTS.map((dept) => ({
      department_name: dept,
      meta1: "",
      meta2: "",
      meta3: "",
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

  // Update state when existing goals are fetched
  useEffect(() => {
    if (existingGoals && existingGoals.length > 0) {
      setGoals((prev) =>
        prev.map((g) => {
          const existing = existingGoals.find(
            (eg) => eg.department_name === g.department_name
          );
          if (existing) {
            return {
              ...g,
              meta1: existing.revenue_goal?.toString() || "",
              meta2: existing.meta2_goal?.toString() || "",
              meta3: existing.meta3_goal?.toString() || "",
            };
          }
          return g;
        })
      );
    }
  }, [existingGoals]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !profile?.team_id) {
        throw new Error("Usuário não autenticado");
      }

      // Filter only departments with at least one goal value
      const goalsToSave = goals.filter(
        (g) => g.meta1 || g.meta2 || g.meta3
      );

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

        // Check if exists
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

  // Calculate totals
  const totals = goals.reduce(
    (acc, g) => ({
      meta1: acc.meta1 + (parseFloat(g.meta1.replace(/\./g, "").replace(",", ".")) || 0),
      meta2: acc.meta2 + (parseFloat(g.meta2.replace(/\./g, "").replace(",", ".")) || 0),
      meta3: acc.meta3 + (parseFloat(g.meta3.replace(/\./g, "").replace(",", ".")) || 0),
    }),
    { meta1: 0, meta2: 0, meta3: 0 }
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Carregando metas...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Minhas Metas por Grupo de Procedimento
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
        <div className="bg-primary/10 rounded-lg p-3 mb-4 text-center">
          <p className="font-semibold text-primary">
            VENDEDORA: {profile?.full_name?.toUpperCase() || "---"}
          </p>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary/10">
                <TableHead className="font-bold text-primary min-w-[280px]">
                  Grupo de procedimento
                </TableHead>
                <TableHead className="text-center font-bold text-primary w-[150px]">
                  META 1
                </TableHead>
                <TableHead className="text-center font-bold text-primary w-[150px]">
                  META 2
                </TableHead>
                <TableHead className="text-center font-bold text-primary w-[150px]">
                  META 3
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {goals.map((goal, index) => (
                <TableRow key={goal.department_name} className="hover:bg-muted/50">
                  <TableCell className="font-medium text-sm">
                    {goal.department_name}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      placeholder="R$ 0,00"
                      value={goal.meta1}
                      onChange={(e) => updateGoal(index, "meta1", e.target.value)}
                      className="text-center text-sm h-9"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      placeholder="R$ 0,00"
                      value={goal.meta2}
                      onChange={(e) => updateGoal(index, "meta2", e.target.value)}
                      className="text-center text-sm h-9"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      placeholder="R$ 0,00"
                      value={goal.meta3}
                      onChange={(e) => updateGoal(index, "meta3", e.target.value)}
                      className="text-center text-sm h-9"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {/* Total Row */}
              <TableRow className="bg-primary/10 font-bold">
                <TableCell className="font-bold text-center">TOTAL</TableCell>
                <TableCell className="text-center text-success">
                  {formatCurrency(totals.meta1)}
                </TableCell>
                <TableCell className="text-center text-success">
                  {formatCurrency(totals.meta2)}
                </TableCell>
                <TableCell className="text-center text-primary">
                  {formatCurrency(totals.meta3)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
