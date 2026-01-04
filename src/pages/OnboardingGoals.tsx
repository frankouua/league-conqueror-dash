import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Target, Trophy, TrendingUp, DollarSign, Info, Users } from "lucide-react";
import { CLINIC_GOALS } from "@/constants/clinicGoals";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Metas por departamento (valores de referência)
const DEPARTMENT_GOALS = [
  { department: "Cirurgia Plástica", meta1: 1785662, meta2: 1928515, meta3: 2142795 },
  { department: "Consulta Cirurgia Plástica", meta1: 43505, meta2: 46986, meta3: 52206 },
  { department: "Pós Operatório", meta1: 76134, meta2: 82225, meta3: 91361 },
  { department: "Soroterapia / Protocolos Nutricionais", meta1: 314417, meta2: 339570, meta3: 377300 },
  { department: "Harmonização Facial e Corporal", meta1: 175740, meta2: 189799, meta3: 210888 },
  { department: "Spa e Estética", meta1: 3996, meta2: 4316, meta3: 4795 },
  { department: "Unique Travel Experience", meta1: 29572, meta2: 31938, meta3: 35487 },
  { department: "Luxskin", meta1: 70973, meta2: 76651, meta3: 85168 },
];

const TOTALS = {
  meta1: CLINIC_GOALS.META_1,
  meta2: CLINIC_GOALS.META_2,
  meta3: CLINIC_GOALS.META_3,
};

const OnboardingGoals = () => {
  const { user, profile, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const [goalForm, setGoalForm] = useState({
    meta1: "",
    meta2: "",
    meta3: "",
  });

  // Buscar soma das metas da equipe
  const { data: teamGoalsSum } = useQuery({
    queryKey: ["team-goals-sum", profile?.team_id, currentMonth, currentYear],
    queryFn: async () => {
      if (!profile?.team_id) return null;

      const { data, error } = await supabase
        .from("individual_goals")
        .select("revenue_goal, meta2_goal, meta3_goal")
        .eq("team_id", profile.team_id)
        .eq("month", currentMonth)
        .eq("year", currentYear);

      if (error) throw error;

      const sum = {
        meta1: data?.reduce((acc, g) => acc + (Number(g.revenue_goal) || 0), 0) || 0,
        meta2: data?.reduce((acc, g) => acc + (Number(g.meta2_goal) || 0), 0) || 0,
        meta3: data?.reduce((acc, g) => acc + (Number(g.meta3_goal) || 0), 0) || 0,
        count: data?.length || 0,
      };

      return sum;
    },
    enabled: !!profile?.team_id,
    refetchInterval: 5000, // Atualiza a cada 5 segundos
  });

  // Redirecionar se não estiver logado
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Não redirecionar mais - permitir que todos vejam a página de metas

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const parseCurrencyInput = (value: string) => {
    return parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;
  };

  const saveGoalsMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !profile?.team_id) {
        throw new Error("Usuário não autenticado ou sem equipe");
      }

      const payload = {
        user_id: user.id,
        team_id: profile.team_id,
        month: currentMonth,
        year: currentYear,
        revenue_goal: parseCurrencyInput(goalForm.meta1),
        meta2_goal: parseCurrencyInput(goalForm.meta2),
        meta3_goal: parseCurrencyInput(goalForm.meta3),
        nps_goal: 0,
        testimonials_goal: 0,
        referrals_goal: 0,
      };

      const { error } = await supabase
        .from("individual_goals")
        .insert(payload);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ 
        title: "Metas definidas com sucesso!", 
        description: "Bem-vindo à Copa Unique League!" 
      });
      navigate("/");
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao salvar metas", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!goalForm.meta1 || !goalForm.meta2 || !goalForm.meta3) {
      toast({
        title: "Preencha todas as metas",
        description: "Você precisa definir valores para Meta 1, Meta 2 e Meta 3",
        variant: "destructive",
      });
      return;
    }

    saveGoalsMutation.mutate();
  };

  const handleSkip = () => {
    navigate("/");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-gradient-gold-shine shadow-gold mb-4">
            <Trophy className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">
            Bem-vindo à Copa Unique League!
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Para começar, defina suas metas individuais de faturamento. 
            A somatória das metas de todos os colaboradores formará a meta da equipe.
          </p>
        </div>

        {/* Card de Soma da Equipe */}
        {teamGoalsSum && (
          <Card className="mb-8 border-green-500/30 bg-green-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-green-500" />
                Soma das Metas da Sua Equipe (Tempo Real)
              </CardTitle>
              <CardDescription>
                {teamGoalsSum.count} colaborador(es) já definiram suas metas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-background/50">
                  <p className="text-xs text-muted-foreground mb-1">Soma Meta 1</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(teamGoalsSum.meta1)}</p>
                  <p className="text-xs text-muted-foreground">
                    de {formatCurrency(TOTALS.meta1)}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-background/50">
                  <p className="text-xs text-muted-foreground mb-1">Soma Meta 2</p>
                  <p className="text-lg font-bold text-yellow-600">{formatCurrency(teamGoalsSum.meta2)}</p>
                  <p className="text-xs text-muted-foreground">
                    de {formatCurrency(TOTALS.meta2)}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-background/50">
                  <p className="text-xs text-muted-foreground mb-1">Soma Meta 3</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(teamGoalsSum.meta3)}</p>
                  <p className="text-xs text-muted-foreground">
                    de {formatCurrency(TOTALS.meta3)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabela de Referência */}
        <Card className="mb-8 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Metas por Departamento (Referência)
            </CardTitle>
            <CardDescription>
              Use esses valores como referência para definir sua contribuição individual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary/10">
                    <TableHead className="font-bold">Departamento</TableHead>
                    <TableHead className="text-right font-bold">Meta 1</TableHead>
                    <TableHead className="text-right font-bold">Meta 2</TableHead>
                    <TableHead className="text-right font-bold">Meta 3</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DEPARTMENT_GOALS.map((dept, index) => (
                    <TableRow key={index} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{dept.department}</TableCell>
                      <TableCell className="text-right">{formatCurrency(dept.meta1)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(dept.meta2)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(dept.meta3)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-primary/20 font-bold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right">{formatCurrency(TOTALS.meta1)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(TOTALS.meta2)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(TOTALS.meta3)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Formulário de Metas Individuais */}
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Defina Suas Metas Individuais
            </CardTitle>
            <CardDescription className="flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
              <span>
                Informe o valor que você pretende contribuir para cada meta. 
                A soma de todos os colaboradores deve atingir ou superar os totais acima.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="meta1" className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    Minha Meta 1
                  </Label>
                  <Input
                    id="meta1"
                    type="text"
                    placeholder="Ex: 50.000"
                    value={goalForm.meta1}
                    onChange={(e) => setGoalForm({ ...goalForm, meta1: e.target.value })}
                    className="text-lg"
                  />
                  <p className="text-xs text-muted-foreground">Meta base</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meta2" className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-yellow-500" />
                    Minha Meta 2
                  </Label>
                  <Input
                    id="meta2"
                    type="text"
                    placeholder="Ex: 60.000"
                    value={goalForm.meta2}
                    onChange={(e) => setGoalForm({ ...goalForm, meta2: e.target.value })}
                    className="text-lg"
                  />
                  <p className="text-xs text-muted-foreground">Meta intermediária</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meta3" className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    Minha Meta 3
                  </Label>
                  <Input
                    id="meta3"
                    type="text"
                    placeholder="Ex: 75.000"
                    value={goalForm.meta3}
                    onChange={(e) => setGoalForm({ ...goalForm, meta3: e.target.value })}
                    className="text-lg"
                  />
                  <p className="text-xs text-muted-foreground">Meta desafio</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-gold-shine text-primary-foreground font-bold hover:opacity-90"
                  disabled={saveGoalsMutation.isPending}
                >
                  {saveGoalsMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Salvando...
                    </span>
                  ) : (
                    "Salvar Minhas Metas"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSkip}
                  className="sm:w-auto"
                >
                  Definir Depois
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OnboardingGoals;
