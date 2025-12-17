import { useState, useEffect } from "react";
import { Users, Shield, ShieldCheck, Loader2, Trash2, KeyRound, UserX } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  team_id: string | null;
  teams: { name: string } | null;
}

interface Team {
  id: string;
  name: string;
}

interface UserWithRole extends Profile {
  role: "member" | "admin";
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [sendingResetId, setSendingResetId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);

    // Fetch teams
    const { data: teamsData } = await supabase.from("teams").select("id, name");
    if (teamsData) setTeams(teamsData);

    // Fetch profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("*, teams(name)")
      .order("full_name");

    if (profilesError) {
      toast({
        title: "Erro ao carregar usuários",
        description: profilesError.message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Fetch roles separately
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("user_id, role");

    // Combine data
    const rolesMap = new Map<string, "member" | "admin">();
    if (rolesData) {
      rolesData.forEach((r) => {
        rolesMap.set(r.user_id, r.role as "member" | "admin");
      });
    }

    const usersWithRoles: UserWithRole[] = (profilesData as Profile[]).map((p) => ({
      ...p,
      role: rolesMap.get(p.user_id) || "member",
    }));

    setUsers(usersWithRoles);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTeamChange = async (userId: string, newTeamId: string) => {
    setUpdatingId(userId);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ team_id: newTeamId || null })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Equipe atualizada",
        description: "A equipe do usuário foi alterada com sucesso",
      });

      // Update local state
      setUsers(
        users.map((u) =>
          u.user_id === userId
            ? {
                ...u,
                team_id: newTeamId || null,
                teams: teams.find((t) => t.id === newTeamId) || null,
              }
            : u
        )
      );
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: "member" | "admin") => {
    setUpdatingId(userId);

    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Função atualizada",
        description: `Usuário agora é ${newRole === "admin" ? "Coordenador" : "Membro"}`,
      });

      // Update local state
      setUsers(
        users.map((u) =>
          u.user_id === userId ? { ...u, role: newRole } : u
        )
      );
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemoveAccess = async (userId: string) => {
    setUpdatingId(userId);

    try {
      // Remove from team (set team_id to null)
      const { error } = await supabase
        .from("profiles")
        .update({ team_id: null })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Acesso removido",
        description: "O usuário foi removido do time e não terá mais acesso aos dados",
      });

      // Update local state
      setUsers(
        users.map((u) =>
          u.user_id === userId
            ? { ...u, team_id: null, teams: null }
            : u
        )
      );
    } catch (error: any) {
      toast({
        title: "Erro ao remover acesso",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleResetPassword = async (email: string) => {
    setSendingResetId(email);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("admin-reset-password", {
        body: { email },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: "Email enviado",
        description: `Um email de redefinição de senha foi enviado para ${email}`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar email",
        description: error.message || "Não foi possível enviar o email de redefinição",
        variant: "destructive",
      });
    } finally {
      setSendingResetId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-card rounded-2xl p-6 border border-border">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-card rounded-2xl p-6 border border-border">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-info/10">
          <Users className="w-6 h-6 text-info" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Gerenciar Usuários</h3>
          <p className="text-muted-foreground text-sm">
            {users.length} usuários cadastrados • {users.filter(u => u.team_id).length} ativos em times
          </p>
        </div>
      </div>

      {users.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          Nenhum usuário cadastrado ainda
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Nome</TableHead>
                <TableHead className="text-muted-foreground">Email</TableHead>
                <TableHead className="text-muted-foreground">Função</TableHead>
                <TableHead className="text-muted-foreground">Equipe</TableHead>
                <TableHead className="text-muted-foreground text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const isUpdating = updatingId === user.user_id;
                const isSendingReset = sendingResetId === user.email;
                const hasNoTeam = !user.team_id;

                return (
                  <TableRow key={user.id} className="border-border">
                    <TableCell className="text-foreground font-medium">
                      <div className="flex items-center gap-2">
                        {user.role === "admin" ? (
                          <ShieldCheck className="w-4 h-4 text-primary" />
                        ) : (
                          <Shield className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span>{user.full_name}</span>
                        {hasNoTeam && (
                          <Badge variant="secondary" className="text-xs">
                            Sem acesso
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(value) =>
                          handleRoleChange(user.user_id, value as "member" | "admin")
                        }
                        disabled={isUpdating}
                      >
                        <SelectTrigger className="w-[140px] bg-secondary border-border text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem
                            value="member"
                            className="text-foreground hover:bg-secondary focus:bg-secondary"
                          >
                            Membro
                          </SelectItem>
                          <SelectItem
                            value="admin"
                            className="text-foreground hover:bg-secondary focus:bg-secondary"
                          >
                            Coordenador
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.team_id || "none"}
                        onValueChange={(value) =>
                          handleTeamChange(user.user_id, value === "none" ? "" : value)
                        }
                        disabled={isUpdating}
                      >
                        <SelectTrigger className="w-[160px] bg-secondary border-border text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem
                            value="none"
                            className="text-muted-foreground hover:bg-secondary focus:bg-secondary"
                          >
                            Sem equipe
                          </SelectItem>
                          {teams.map((team) => (
                            <SelectItem
                              key={team.id}
                              value={team.id}
                              className="text-foreground hover:bg-secondary focus:bg-secondary"
                            >
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Reset Password Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResetPassword(user.email)}
                          disabled={isSendingReset}
                          className="text-info hover:text-info hover:bg-info/10"
                        >
                          {isSendingReset ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <KeyRound className="w-4 h-4" />
                          )}
                        </Button>

                        {/* Remove Access Button */}
                        {user.team_id && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isUpdating}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <UserX className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-card border-border">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-foreground">
                                  Remover acesso do usuário?
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-muted-foreground">
                                  {user.full_name} será removido do time e não terá mais 
                                  acesso aos dados da competição. Esta ação pode ser revertida 
                                  adicionando o usuário a um time novamente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-secondary border-border text-foreground hover:bg-secondary/80">
                                  Cancelar
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveAccess(user.user_id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remover Acesso
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
