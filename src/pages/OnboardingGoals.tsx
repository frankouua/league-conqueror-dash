import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Trophy, Users, Briefcase } from "lucide-react";
import { CLINIC_GOALS } from "@/constants/clinicGoals";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Metas por departamento (valores de referência)
const DEPARTMENT_GOALS = [
  { department: "Cirurgia Plástica", meta1: 1785662, meta2: 1964228, meta3: 2142795 },
  { department: "Consulta Cirurgia Plástica", meta1: 43505, meta2: 47856, meta3: 52206 },
  { department: "Pós Operatório", meta1: 76134, meta2: 83747, meta3: 91361 },
  { department: "Soroterapia / Protocolos Nutricionais", meta1: 314418, meta2: 345860, meta3: 377300 },
  { department: "Harmonização Facial e Corporal", meta1: 175740, meta2: 193314, meta3: 210888 },
  { department: "Spa e Estética", meta1: 3996, meta2: 4396, meta3: 4795 },
  { department: "Unique Travel Experience", meta1: 29572, meta2: 32529, meta3: 35487 },
  { department: "Luxskin", meta1: 70973, meta2: 78070, meta3: 85168 },
];

const TOTALS = {
  meta1: CLINIC_GOALS.META_1,
  meta2: CLINIC_GOALS.META_2,
  meta3: CLINIC_GOALS.META_3,
};

// Mapeamento de posição para nome amigável
const POSITION_LABELS: Record<string, string> = {
  sdr: "SDR",
  comercial_1_captacao: "Social Selling",
  comercial_2_closer: "Closer",
  comercial_3_experiencia: "Customer Success",
  comercial_4_farmer: "Farmer",
};

// Mapeamento de posição para área comercial
const POSITION_AREA: Record<string, string> = {
  sdr: "Comercial 1 - SDR",
  comercial_1_captacao: "Comercial 1 - Social Selling",
  comercial_2_closer: "Comercial 2 - Closer",
  comercial_3_experiencia: "Comercial 3 - Customer Success",
  comercial_4_farmer: "Comercial 4 - Farmer",
};

const OnboardingGoals = () => {
  const { user, profile, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Buscar metas predefinidas de todos os comerciais com informação do time
  const { data: predefinedGoals, isLoading: goalsLoading } = useQuery({
    queryKey: ["all-predefined-goals", currentMonth, currentYear],
    queryFn: async () => {
      // Buscar metas predefinidas
      const { data: goals, error } = await supabase
        .from("predefined_goals")
        .select("*")
        .eq("month", currentMonth)
        .eq("year", currentYear)
        .order("position", { ascending: true })
        .order("first_name", { ascending: true });

      if (error) throw error;

      // Buscar profiles com team info para os usuários vinculados
      const matchedUserIds = goals?.filter(g => g.matched_user_id).map(g => g.matched_user_id) || [];
      
      let profilesWithTeams: Record<string, string> = {};
      
      if (matchedUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, team_id, teams(name)")
          .in("user_id", matchedUserIds);

        if (profiles) {
          for (const p of profiles) {
            const teamName = (p.teams as any)?.name || null;
            if (teamName) {
              profilesWithTeams[p.user_id] = teamName;
            }
          }
        }
      }

      // Adicionar nome do time a cada meta
      return goals?.map(goal => ({
        ...goal,
        team_name: goal.matched_user_id ? profilesWithTeams[goal.matched_user_id] : null
      })) || [];
    },
  });

  // Agrupar vendedores por área comercial
  const groupedGoals = predefinedGoals?.reduce((acc, goal) => {
    const area = POSITION_AREA[goal.position] || goal.position;
    if (!acc[area]) {
      acc[area] = [];
    }
    acc[area].push(goal);
    return acc;
  }, {} as Record<string, typeof predefinedGoals>);

  // Redirecionar se não estiver logado
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const handleGoToDashboard = () => {
    navigate("/");
  };

  if (authLoading || goalsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <Header />
      <div className="container mx-auto max-w-5xl py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-gradient-gold-shine shadow-gold mb-4">
            <Trophy className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">
            Bem-vindo à Copa Unique League!
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Confira as metas individuais de cada comercial e as metas por departamento para {currentMonth}/{currentYear}.
          </p>
        </div>

        {/* Tabela de Referência por Departamento */}
        <Card className="mb-8 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Metas por Departamento (Referência)
            </CardTitle>
            <CardDescription>
              Metas gerais da clínica por grupo de procedimento
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

        {/* Metas por Área Comercial e Vendedor */}
        <Card className="mb-8 border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Metas Individuais por Comercial
            </CardTitle>
            <CardDescription>
              Metas de cada vendedor(a) organizadas por área comercial
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {groupedGoals && Object.entries(groupedGoals).map(([area, sellers]) => (
              <div key={area} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-lg text-primary">{area}</h3>
                  <Badge variant="secondary" className="ml-2">
                    {sellers?.length || 0} {sellers?.length === 1 ? 'vendedor' : 'vendedores'}
                  </Badge>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-bold">Vendedor(a)</TableHead>
                        <TableHead className="font-bold">Time</TableHead>
                        <TableHead className="text-right font-bold text-green-600">Meta 1</TableHead>
                        <TableHead className="text-right font-bold text-yellow-600">Meta 2</TableHead>
                        <TableHead className="text-right font-bold text-primary">Meta 3</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sellers?.map((seller) => (
                        <TableRow 
                          key={seller.id} 
                          className={`hover:bg-muted/50 ${
                            profile?.full_name?.toLowerCase().startsWith(seller.first_name.toLowerCase()) 
                              ? 'bg-primary/10 border-l-4 border-l-primary' 
                              : ''
                          }`}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {seller.first_name}
                              {profile?.full_name?.toLowerCase().startsWith(seller.first_name.toLowerCase()) && (
                                <Badge className="bg-primary text-primary-foreground text-xs">Você</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {seller.team_name ? (
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  seller.team_name.toLowerCase().includes('lioness') 
                                    ? 'border-amber-500 text-amber-500' 
                                    : 'border-emerald-500 text-emerald-500'
                                }`}
                              >
                                {seller.team_name}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">Não vinculado</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-green-600 font-semibold">
                            {formatCurrency(Number(seller.meta1_goal))}
                          </TableCell>
                          <TableCell className="text-right text-yellow-600 font-semibold">
                            {formatCurrency(Number(seller.meta2_goal))}
                          </TableCell>
                          <TableCell className="text-right text-primary font-semibold">
                            {formatCurrency(Number(seller.meta3_goal))}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Subtotal da área */}
                      <TableRow className="bg-muted/30 font-bold border-t-2">
                        <TableCell colSpan={2}>Subtotal {area.split(' - ')[0]}</TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCurrency(sellers?.reduce((sum, s) => sum + Number(s.meta1_goal), 0) || 0)}
                        </TableCell>
                        <TableCell className="text-right text-yellow-600">
                          {formatCurrency(sellers?.reduce((sum, s) => sum + Number(s.meta2_goal), 0) || 0)}
                        </TableCell>
                        <TableCell className="text-right text-primary">
                          {formatCurrency(sellers?.reduce((sum, s) => sum + Number(s.meta3_goal), 0) || 0)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}

            {/* Total Geral */}
            {predefinedGoals && predefinedGoals.length > 0 && (
              <div className="mt-6 p-4 bg-gradient-gold-shine/10 rounded-lg border border-primary/30">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Vendedores</p>
                    <p className="text-2xl font-bold text-primary">{predefinedGoals.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Meta 1</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(predefinedGoals.reduce((sum, g) => sum + Number(g.meta1_goal), 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Meta 2</p>
                    <p className="text-lg font-bold text-yellow-600">
                      {formatCurrency(predefinedGoals.reduce((sum, g) => sum + Number(g.meta2_goal), 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Meta 3</p>
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(predefinedGoals.reduce((sum, g) => sum + Number(g.meta3_goal), 0))}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botão para ir ao Dashboard */}
        <div className="flex justify-center">
          <Button
            onClick={handleGoToDashboard}
            className="bg-gradient-gold-shine text-primary-foreground font-bold hover:opacity-90 px-8 py-6 text-lg"
          >
            Ir para o Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingGoals;
