import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Shield } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { UseFormReturn } from "react-hook-form";
import brasaoLioness from "@/assets/brasao-lioness-team.png";
import brasaoTroia from "@/assets/brasao-troia-team.png";

interface IndividualTeamFieldsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  countsFieldName?: string;
  attributedFieldName?: string;
  hideTeamContribution?: boolean;
  onTeamChange?: (teamId: string) => void;
}

export const IndividualTeamFields = ({ 
  form, 
  countsFieldName = "countsForIndividual",
  attributedFieldName = "attributedToUserId",
  hideTeamContribution = false,
  onTeamChange
}: IndividualTeamFieldsProps) => {
  const { user, profile, role } = useAuth();
  const isAdmin = role === "admin";
  
  // Admin can select any team
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>(profile?.team_id || undefined);

  // Fetch all teams for admin
  const { data: teams } = useQuery({
    queryKey: ["all-teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch team members based on selected team
  const { data: teamMembers } = useQuery({
    queryKey: ["team-members", selectedTeamId],
    queryFn: async () => {
      if (!selectedTeamId) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("team_id", selectedTeamId)
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTeamId,
  });

  // Update parent when team changes
  useEffect(() => {
    if (selectedTeamId && onTeamChange) {
      onTeamChange(selectedTeamId);
    }
  }, [selectedTeamId, onTeamChange]);

  // Reset attributed user when team changes
  useEffect(() => {
    if (isAdmin && selectedTeamId !== profile?.team_id) {
      form.setValue(attributedFieldName, "__self__");
    }
  }, [selectedTeamId, isAdmin, form, attributedFieldName, profile?.team_id]);

  const watchAttributedTo = form.watch(attributedFieldName);

  const getTeamLogo = (teamName: string) => {
    if (teamName.toLowerCase().includes("lioness")) return brasaoLioness;
    if (teamName.toLowerCase().includes("tr")) return brasaoTroia;
    return null;
  };

  return (
    <>
      {/* Admin: Select team first */}
      {isAdmin && (
        <div className="space-y-4 p-4 rounded-lg border border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2 text-primary font-medium">
            <Shield className="w-4 h-4" />
            Modo Administrador
          </div>
          
          <FormItem>
            <FormLabel className="text-foreground">Selecionar Time</FormLabel>
            <Select 
              value={selectedTeamId || ""} 
              onValueChange={(value) => setSelectedTeamId(value)}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Selecione o time" />
              </SelectTrigger>
              <SelectContent>
                {teams?.map((team) => {
                  const logo = getTeamLogo(team.name);
                  return (
                    <SelectItem key={team.id} value={team.id}>
                      <div className="flex items-center gap-2">
                        {logo && (
                          <img src={logo} alt={team.name} className="w-5 h-5 object-contain" />
                        )}
                        {team.name}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <FormDescription className="text-xs">
              Selecione o time para o qual deseja registrar
            </FormDescription>
          </FormItem>

          <FormField
            control={form.control}
            name={attributedFieldName}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Atribuir a
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value || "__self__"}>
                  <FormControl>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Selecione o membro" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__self__">Eu mesmo (admin)</SelectItem>
                    {!hideTeamContribution && (
                      <SelectItem value="team" className="text-primary font-medium">
                        🏆 Contribuição geral do time
                      </SelectItem>
                    )}
                    {teamMembers?.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs">
                  {watchAttributedTo === "team" 
                    ? "Não conta para meta individual de ninguém"
                    : watchAttributedTo && watchAttributedTo !== "__self__"
                      ? "Será atribuído ao membro selecionado"
                      : "Selecione um membro ou deixe como contribuição do time"}
                </FormDescription>
              </FormItem>
            )}
          />
        </div>
      )}

      {/* Checkbox for individual goal - only show if not "team" contribution */}
      {watchAttributedTo !== "team" && (
        <FormField
          control={form.control}
          name={countsFieldName}
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-border p-4 bg-secondary/30">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-foreground cursor-pointer">
                  Conta para meta individual
                </FormLabel>
                <FormDescription className="text-xs">
                  {field.value 
                    ? "Este registro será contabilizado na meta pessoal"
                    : "Este registro conta apenas para o time, não para meta individual"}
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
      )}
    </>
  );
};

// Export selected team ID getter for forms
export const useAdminTeamSelection = () => {
  const { profile, role } = useAuth();
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>(profile?.team_id || undefined);
  
  return {
    selectedTeamId: role === "admin" ? selectedTeamId : profile?.team_id,
    setSelectedTeamId,
    isAdmin: role === "admin"
  };
};

export const getEffectiveInsertData = (
  userId: string,
  attributedToUserId: string | undefined,
  countsForIndividual: boolean,
  isAdmin: boolean,
  selectedTeamId?: string
) => {
  // Normalize: "__self__" or empty means "myself"
  const normalizedAttributed = attributedToUserId === "__self__" || !attributedToUserId 
    ? undefined 
    : attributedToUserId;
  
  const effectiveUserId = normalizedAttributed && normalizedAttributed !== "team" 
    ? normalizedAttributed 
    : userId;
  
  const effectiveCountsForIndividual = normalizedAttributed === "team" 
    ? false 
    : countsForIndividual;

  return {
    effectiveUserId,
    effectiveTeamId: selectedTeamId,
    counts_for_individual: effectiveCountsForIndividual,
    attributed_to_user_id: normalizedAttributed && normalizedAttributed !== "team" 
      ? normalizedAttributed 
      : null,
    registered_by_admin: isAdmin && (normalizedAttributed || selectedTeamId) ? true : false,
  };
};
