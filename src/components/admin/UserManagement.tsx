import { useState, useEffect, useMemo } from "react";
import { Users, Shield, ShieldCheck, Loader2, KeyRound, UserX, Filter, UserCheck, UserMinus, Clock, CheckCircle2, XCircle } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  comercial_1_captacao: "Comercial 1 - Social Selling",
  comercial_2_closer: "Comercial 2 - Closer",
  comercial_3_experiencia: "Comercial 3 - Customer Success",
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
  is_approved: boolean;
  last_access_at: string | null;
  access_count: number | null;
  teams: { name: string } | null;
}

interface Team {
  id: string;
  name: string;
}

interface UserWithRole extends Profile {
  role: "member" | "admin";
}

interface ApprovalRequest {
  id: string;
  user_id: string;
  requested_at: string;
  status: string;
  profiles: {
    full_name: string;
    email: string;
  };
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
  const [rejectReason, setRejectReason] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending approval requests
  const { data: pendingRequests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ['pending-approval-requests'],
    queryFn: async () => {
      const { data: requests, error } = await supabase
        .from('user_approval_requests')
        .select('*')
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });
      
      if (error) throw error;
      if (!requests || requests.length === 0) return [];
      
      // Fetch profiles separately
      const userIds = requests.map(r => r.user_id);
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);
      
      if (profileError) throw profileError;
      
      // Combine data
      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]));
      
      return requests.map(r => ({
        ...r,
        profiles: profilesMap.get(r.user_id) || { full_name: 'Usuário', email: '' }
      })) as ApprovalRequest[];
    },
  });

  // Approve user mutation
  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('approve_user', { _user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Usuário aprovado!", description: "O usuário agora tem acesso ao sistema." });
      queryClient.invalidateQueries({ queryKey: ['pending-approval-requests'] });
      fetchData();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao aprovar", description: error.message, variant: "destructive" });
    },
  });

  // Reject user mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const { error } = await supabase.rpc('reject_user', { _user_id: userId, _reason: reason || null });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Usuário rejeitado", description: "O acesso foi negado." });
      queryClient.invalidateQueries({ queryKey: ['pending-approval-requests'] });
      setRejectReason("");
    },
    onError: (error: any) => {
      toast({ title: "Erro ao rejeitar", description: error.message, variant: "destructive" });
    },
  });

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

  const handleDepartmentChange = async (userId: string, newDepartment: string) => {
    setUpdatingId(userId);

    try {
      const departmentValue = newDepartment === "none" ? null : newDepartment as DepartmentType;
      const { error } = await supabase
        .from("profiles")
        .update({ department: departmentValue })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Departamento atualizado",
        description: "O departamento do usuário foi alterado com sucesso",
      });

      // Update local state
      setUsers(
        users.map((u) =>
          u.user_id === userId
            ? { ...u, department: (newDepartment === "none" ? null : newDepartment) as DepartmentType | null }
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

  const handlePositionChange = async (userId: string, newPosition: string) => {
    setUpdatingId(userId);

    try {
      const positionValue = newPosition === "none" ? null : newPosition as PositionType;
      const { error } = await supabase
        .from("profiles")
        .update({ position: positionValue })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Cargo atualizado",
        description: "O cargo do usuário foi alterado com sucesso",
      });

      // Update local state
      setUsers(
        users.map((u) =>
          u.user_id === userId
            ? { ...u, position: (newPosition === "none" ? null : newPosition) as PositionType | null }
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
    <div className="space-y-6">
      {/* Pending Approvals Section */}
      {pendingRequests.length > 0 && (
        <Card className="border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <Clock className="w-5 h-5" />
              Usuários Aguardando Aprovação
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-600">
                {pendingRequests.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div 
                  key={request.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-background border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-medium">{request.profiles.full_name}</p>
                      <p className="text-sm text-muted-foreground">{request.profiles.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Solicitado {formatDistanceToNow(new Date(request.requested_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate(request.user_id)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      className="gap-2 bg-green-600 hover:bg-green-700"
                    >
                      {approveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Aprovar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                        >
                          <XCircle className="h-4 w-4" />
                          Rejeitar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Rejeitar acesso?</AlertDialogTitle>
                          <AlertDialogDescription>
                            O usuário {request.profiles.full_name} não terá acesso ao sistema.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="py-4">
                          <Textarea
                            placeholder="Motivo da rejeição (opcional)"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                          />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setRejectReason("")}>
                            Cancelar
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => rejectMutation.mutate({ userId: request.user_id, reason: rejectReason })}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Confirmar Rejeição
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main User Management */}
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
                <TableHead className="text-muted-foreground">Departamento</TableHead>
                <TableHead className="text-muted-foreground">Cargo</TableHead>
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
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {user.last_access_at ? (
                              <span title={`${user.access_count || 0} acessos`}>
                                Último acesso: {formatDistanceToNow(new Date(user.last_access_at), { addSuffix: true, locale: ptBR })}
                              </span>
                            ) : (
                              <span className="text-amber-500">Nunca acessou</span>
                            )}
                          </div>
                        </div>
                        {hasNoTeam && (
                          <Badge variant="secondary" className="text-xs">
                            Sem acesso
                          </Badge>
                        )}
                        {!user.is_approved && (
                          <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30">
                            Pendente
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.department || "none"}
                        onValueChange={(value) => handleDepartmentChange(user.user_id, value)}
                        disabled={isUpdating}
                      >
                        <SelectTrigger className="w-[140px] bg-secondary border-border text-foreground">
                          <SelectValue placeholder="Selecionar" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="none" className="text-muted-foreground">
                            Nenhum
                          </SelectItem>
                          <SelectItem value="comercial">Comercial</SelectItem>
                          <SelectItem value="atendimento">Atendimento</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="administrativo">Administrativo</SelectItem>
                          <SelectItem value="clinico">Clínico</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.position || "none"}
                        onValueChange={(value) => handlePositionChange(user.user_id, value)}
                        disabled={isUpdating}
                      >
                        <SelectTrigger className="w-[180px] bg-secondary border-border text-foreground">
                          <SelectValue placeholder="Selecionar" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="none" className="text-muted-foreground">
                            Nenhum
                          </SelectItem>
                          <SelectItem value="comercial_1_captacao">Social Selling</SelectItem>
                          <SelectItem value="comercial_2_closer">Closer</SelectItem>
                          <SelectItem value="comercial_3_experiencia">Customer Success</SelectItem>
                          <SelectItem value="comercial_4_farmer">Farmer</SelectItem>
                          <SelectItem value="sdr">SDR</SelectItem>
                          <SelectItem value="coordenador">Coordenador</SelectItem>
                          <SelectItem value="gerente">Gerente</SelectItem>
                          <SelectItem value="assistente">Assistente</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
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
    </div>
  );
};

export default UserManagement;
