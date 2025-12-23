import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Users, User, Send, Clock, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const AdminAnnouncements = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetType, setTargetType] = useState<"all" | "team" | "individual">("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("");

  // Fetch teams
  const { data: teams } = useQuery({
    queryKey: ["teams-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch profiles
  const { data: profiles } = useQuery({
    queryKey: ["profiles-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*, teams(name)").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch recent announcements
  const { data: recentAnnouncements } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("type", "admin_announcement")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  // Send announcement mutation
  const sendAnnouncement = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      if (!title.trim() || !message.trim()) throw new Error("Preencha todos os campos");

      const notifications: Array<{
        type: string;
        title: string;
        message: string;
        user_id?: string | null;
        team_id?: string | null;
      }> = [];

      if (targetType === "all") {
        // Send to all users - create one notification per user
        if (profiles) {
          for (const profile of profiles) {
            notifications.push({
              type: "admin_announcement",
              title: title.trim(),
              message: message.trim(),
              user_id: profile.user_id,
              team_id: null,
            });
          }
        }
      } else if (targetType === "team" && selectedTeam) {
        // Send to all users in the team
        const teamProfiles = profiles?.filter(p => p.team_id === selectedTeam) || [];
        for (const profile of teamProfiles) {
          notifications.push({
            type: "admin_announcement",
            title: title.trim(),
            message: message.trim(),
            user_id: profile.user_id,
            team_id: selectedTeam,
          });
        }
      } else if (targetType === "individual" && selectedUser) {
        // Send to specific user
        notifications.push({
          type: "admin_announcement",
          title: title.trim(),
          message: message.trim(),
          user_id: selectedUser,
          team_id: null,
        });
      }

      if (notifications.length === 0) {
        throw new Error("Nenhum destinatário selecionado");
      }

      const { error } = await supabase.from("notifications").insert(notifications);
      if (error) throw error;

      return notifications.length;
    },
    onSuccess: (count) => {
      toast({
        title: "Aviso enviado!",
        description: `Enviado para ${count} pessoa(s)`,
      });
      setTitle("");
      setMessage("");
      setTargetType("all");
      setSelectedTeam("");
      setSelectedUser("");
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete announcement mutation
  const deleteAnnouncement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Aviso removido" });
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
    },
  });

  const getTargetLabel = (notification: any) => {
    if (notification.team_id && teams) {
      const team = teams.find(t => t.id === notification.team_id);
      return team?.name || "Equipe";
    }
    if (notification.user_id && profiles) {
      const profile = profiles.find(p => p.user_id === notification.user_id);
      return profile?.full_name || "Usuário";
    }
    return "Todos";
  };

  return (
    <div className="space-y-6">
      {/* Send Announcement Form */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            Enviar Aviso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título do Aviso</Label>
            <Input
              id="title"
              placeholder="Ex: Reunião importante amanhã"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              placeholder="Digite a mensagem do aviso..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">{message.length}/500</p>
          </div>

          <div className="space-y-3">
            <Label>Destinatários</Label>
            <RadioGroup value={targetType} onValueChange={(v) => setTargetType(v as any)} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="flex items-center gap-1 cursor-pointer">
                  <Users className="w-4 h-4" />
                  Todos
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="team" id="team" />
                <Label htmlFor="team" className="flex items-center gap-1 cursor-pointer">
                  <Users className="w-4 h-4" />
                  Equipe
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="individual" id="individual" />
                <Label htmlFor="individual" className="flex items-center gap-1 cursor-pointer">
                  <User className="w-4 h-4" />
                  Individual
                </Label>
              </div>
            </RadioGroup>

            {targetType === "team" && (
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a equipe" />
                </SelectTrigger>
                <SelectContent>
                  {teams?.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {targetType === "individual" && (
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a pessoa" />
                </SelectTrigger>
                <SelectContent>
                  {profiles?.map((profile) => (
                    <SelectItem key={profile.user_id} value={profile.user_id}>
                      {profile.full_name} {profile.teams?.name ? `(${profile.teams.name})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Button
            onClick={() => sendAnnouncement.mutate()}
            disabled={sendAnnouncement.isPending || !title.trim() || !message.trim()}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            {sendAnnouncement.isPending ? "Enviando..." : "Enviar Aviso"}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Announcements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Avisos Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentAnnouncements && recentAnnouncements.length > 0 ? (
            <div className="space-y-3">
              {recentAnnouncements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="p-3 rounded-lg border bg-card/50 flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{announcement.title}</p>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {getTargetLabel(announcement)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{announcement.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(announcement.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive hover:text-destructive"
                    onClick={() => deleteAnnouncement.mutate(announcement.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">Nenhum aviso enviado ainda</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnnouncements;
