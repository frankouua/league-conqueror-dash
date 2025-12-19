import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
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

interface IndividualTeamFieldsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  countsFieldName?: string;
  attributedFieldName?: string;
  hideTeamContribution?: boolean;
}

export const IndividualTeamFields = ({ 
  form, 
  countsFieldName = "countsForIndividual",
  attributedFieldName = "attributedToUserId",
  hideTeamContribution = false
}: IndividualTeamFieldsProps) => {
  const { user, profile, role } = useAuth();
  const isAdmin = role === "admin";

  const { data: teamMembers } = useQuery({
    queryKey: ["team-members", profile?.team_id],
    queryFn: async () => {
      if (!profile?.team_id) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("team_id", profile.team_id)
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: isAdmin && !!profile?.team_id,
  });

  const watchAttributedTo = form.watch(attributedFieldName);

  return (
    <>
      {/* Admin: Select team member or team contribution */}
      {isAdmin && (
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
                    <SelectValue placeholder="Eu mesmo (padrão)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="__self__">Eu mesmo</SelectItem>
                  {!hideTeamContribution && (
                    <SelectItem value="team" className="text-primary font-medium">
                      🏆 Contribuição geral do time
                    </SelectItem>
                  )}
                  {teamMembers?.filter(m => m.user_id !== user?.id).map((member) => (
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
                  Conta para minha meta individual
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

export const getEffectiveInsertData = (
  userId: string,
  attributedToUserId: string | undefined,
  countsForIndividual: boolean,
  isAdmin: boolean
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
    counts_for_individual: effectiveCountsForIndividual,
    attributed_to_user_id: normalizedAttributed && normalizedAttributed !== "team" 
      ? normalizedAttributed 
      : null,
    registered_by_admin: isAdmin && normalizedAttributed ? true : false,
  };
};
