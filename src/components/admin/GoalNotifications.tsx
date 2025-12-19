import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Bell, CheckCircle, Target, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const GoalNotifications = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Buscar usuários com equipe que não preencheram metas
  const { data: usersWithoutGoals, isLoading } = useQuery({
    queryKey: ["users-without-goals", currentMonth, currentYear],
    queryFn: async () => {
      // Buscar todos os perfis com equipe
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, team_id, teams(name)")
        .not("team_id", "is", null);

      if (profilesError) throw profilesError;

      // Buscar metas já definidas para o mês atual
      const { data: existingGoals, error: goalsError } = await supabase
        .from("individual_goals")
        .select("user_id")
        .eq("month", currentMonth)
        .eq("year", currentYear);

      if (goalsError) throw goalsError;

      const usersWithGoals = new Set(existingGoals?.map(g => g.user_id) || []);

      // Filtrar usuários que não têm metas
      return profiles?.filter(p => !usersWithGoals.has(p.user_id)) || [];
    },
  });

  // Enviar notificação para um usuário
  const sendNotificationMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          type: "goal_reminder",
          title: "📊 Defina suas Metas Individuais",
          message: `Você ainda não definiu suas metas para ${currentMonth}/${currentYear}. Acesse a página de metas para contribuir com a meta da sua equipe!`,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast({
        title: "Notificação enviada!",
        description: "O usuário foi notificado para preencher suas metas.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar notificação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Enviar notificação para todos
  const sendAllNotificationsMutation = useMutation({
    mutationFn: async () => {
      if (!usersWithoutGoals?.length) return;

      const notifications = usersWithoutGoals.map(user => ({
        user_id: user.user_id,
        type: "goal_reminder",
        title: "📊 Defina suas Metas Individuais",
        message: `Você ainda não definiu suas metas para ${currentMonth}/${currentYear}. Acesse a página de metas para contribuir com a meta da sua equipe!`,
      }));

      const { error } = await supabase
        .from("notifications")
        .insert(notifications);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast({
        title: "Notificações enviadas!",
        description: `${usersWithoutGoals?.length} usuário(s) foram notificados.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar notificações",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Lembrete de Metas Individuais
        </CardTitle>
        <CardDescription>
          Notifique colaboradores que ainda não definiram suas metas para {currentMonth}/{currentYear}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {usersWithoutGoals && usersWithoutGoals.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {usersWithoutGoals.length} usuário(s) sem metas definidas
                </span>
              </div>
              <Button
                onClick={() => sendAllNotificationsMutation.mutate()}
                disabled={sendAllNotificationsMutation.isPending}
                size="sm"
              >
                <Bell className="w-4 h-4 mr-2" />
                {sendAllNotificationsMutation.isPending ? "Enviando..." : "Notificar Todos"}
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {usersWithoutGoals.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{user.full_name}</p>
                    <Badge variant="outline" className="text-xs">
                      {(user.teams as any)?.name || "Sem equipe"}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => sendNotificationMutation.mutate(user.user_id)}
                    disabled={sendNotificationMutation.isPending}
                  >
                    <Bell className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
            <p className="font-medium text-green-600">Todos os colaboradores definiram suas metas!</p>
            <p className="text-sm text-muted-foreground">
              Não há usuários pendentes para notificar.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoalNotifications;