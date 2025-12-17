import { useState, useEffect, useMemo } from "react";
import { Users, Shield, ShieldCheck, Loader2, Trash2, KeyRound, UserX, Filter, Briefcase, BadgeCheck } from "lucide-react";
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

type DepartmentType = 'comercial' | 'atendimento' | 'marketing' | 'administrativo' | 'clinico';
type PositionType = 'comercial_1_captacao' | 'comercial_2_closer' | 'comercial_3_experiencia' | 'comercial_4_farmer' | 'sdr' | 'coordenador' | 'gerente' | 'assistente' | 'outro';

const DEPARTMENT_LABELS: Record<string, string> = {
  comercial: "Comercial",
  atendimento: "Atendimento",
  marketing: "Marketing",
  administrativo: "Administrativo",
  clinico: "Clínico",
};

const POSITION_LABELS: Record<string, string> = {
  comercial_1_captacao: "Comercial 1 - Captação",
  comercial_2_closer: "Comercial 2 - Closer",
  comercial_3_experiencia: "Comercial 3 - Experiência",
  comercial_4_farmer: "Comercial 4 - Farmer",
  sdr: "SDR",
  coordenador: "Coordenador",
  gerente: "Gerente",
  assistente: "Assistente",
  outro: "Outro",
};

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  team_id: string | null;
  department: DepartmentType | null;
  position: PositionType | null;
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
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [filterPosition, setFilterPosition] = useState<string>("all");
  const [filterTeam, setFilterTeam] = useState<string>("all");
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);

    // Fetch teams
    const { data: teamsData } = await supabase.from("teams").select("id, name");
    if (teamsData) setTeams(teamsData);

    // Fetch profiles with department and position
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

  // Filtered users based on filters
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (filterDepartment !== "all" && user.department !== filterDepartment) return false;
      if (filterPosition !== "all" && user.position !== filterPosition) return false;
      if (filterTeam !== "all") {
        if (filterTeam === "none" && user.team_id !== null) return false;
        if (filterTeam !== "none" && user.team_id !== filterTeam) return false;
      }
      return true;
    });
  }, [users, filterDepartment, filterPosition, filterTeam]);

  // Get unique departments and positions from users
  const availableDepartments = useMemo(() => {
    const deps = new Set(users.map(u => u.department).filter(Boolean));
    return Array.from(deps) as DepartmentType[];
  }, [users]);

  const availablePositions = useMemo(() => {
    const pos = new Set(users.map(u => u.position).filter(Boolean));
    return Array.from(pos) as PositionType[];
  }, [users]);

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

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 rounded-lg bg-muted/30 border border-border">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filtros:</span>
        </div>
        
        <Select value={filterTeam} onValueChange={setFilterTeam}>
          <SelectTrigger className="w-[160px] bg-background border-border">
            <SelectValue placeholder="Equipe" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">Todas equipes</SelectItem>
            <SelectItem value="none">Sem equipe</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterDepartment} onValueChange={setFilterDepartment}>
          <SelectTrigger className="w-[160px] bg-background border-border">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">Todos departamentos</SelectItem>
            {availableDepartments.map((dep) => (
              <SelectItem key={dep} value={dep}>
                {DEPARTMENT_LABELS[dep] || dep}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPosition} onValueChange={setFilterPosition}>
          <SelectTrigger className="w-[180px] bg-background border-border">
            <SelectValue placeholder="Cargo" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">Todos cargos</SelectItem>
            {availablePositions.map((pos) => (
              <SelectItem key={pos} value={pos}>
                {POSITION_LABELS[pos] || pos}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filterTeam !== "all" || filterDepartment !== "all" || filterPosition !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterTeam("all");
              setFilterDepartment("all");
              setFilterPosition("all");
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            Limpar filtros
          </Button>
        )}

        <span className="ml-auto text-sm text-muted-foreground">
          {filteredUsers.length} de {users.length} usuários
        </span>
      </div>

      {filteredUsers.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          {users.length === 0 ? "Nenhum usuário cadastrado ainda" : "Nenhum usuário encontrado com os filtros selecionados"}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Nome</TableHead>
                <TableHead className="text-muted-foreground hidden md:table-cell">Dept/Cargo</TableHead>
                <TableHead className="text-muted-foreground">Função</TableHead>
                <TableHead className="text-muted-foreground">Equipe</TableHead>
                <TableHead className="text-muted-foreground text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
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
                        <div>
                          <span className="block">{user.full_name}</span>
                          <span className="text-xs text-muted-foreground md:hidden">
                            {user.position && (POSITION_LABELS[user.position] || user.position)}
                          </span>
                        </div>
                        {hasNoTeam && (
                          <Badge variant="secondary" className="text-xs">
                            Sem acesso
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-col gap-1">
                        {user.department && (
                          <Badge variant="outline" className="w-fit text-xs gap-1">
                            <Briefcase className="w-3 h-3" />
                            {DEPARTMENT_LABELS[user.department] || user.department}
                          </Badge>
                        )}
                        {user.position && (
                          <Badge variant="secondary" className="w-fit text-xs gap-1">
                            <BadgeCheck className="w-3 h-3" />
                            {POSITION_LABELS[user.position] || user.position}
                          </Badge>
                        )}
                        {!user.department && !user.position && (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </div>
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
