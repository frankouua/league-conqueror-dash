import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ThumbsUp, Loader2 } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { IndividualTeamFields, getEffectiveInsertData } from "./IndividualTeamFields";

const npsSchema = z.object({
  score: z.enum(["9", "10"], {
    required_error: "Selecione a nota NPS",
  }),
  citedMember: z.boolean().default(false),
  memberName: z.string().optional(),
  date: z.date({ required_error: "Selecione uma data" }),
  countsForIndividual: z.boolean().default(true),
  attributedToUserId: z.string().optional(),
});

type NPSFormData = z.infer<typeof npsSchema>;

const NPSForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user, profile, role } = useAuth();
  const { toast } = useToast();
  const isAdmin = role === "admin";

  const form = useForm<NPSFormData>({
    resolver: zodResolver(npsSchema),
    defaultValues: {
      citedMember: false,
      memberName: "",
      countsForIndividual: true,
      attributedToUserId: "",
    },
  });

  const citedMember = form.watch("citedMember");

  const onSubmit = async (data: NPSFormData) => {
    if (!user || !profile?.team_id) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado e vinculado a uma equipe",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const score = parseInt(data.score);

      const insertData = getEffectiveInsertData(
        user.id,
        data.attributedToUserId,
        data.countsForIndividual,
        isAdmin
      );

      const { error } = await supabase.from("nps_records").insert({
        team_id: profile.team_id,
        user_id: insertData.effectiveUserId,
        score,
        cited_member: data.citedMember,
        member_name: data.citedMember ? data.memberName || null : null,
        date: format(data.date, "yyyy-MM-dd"),
        counts_for_individual: insertData.counts_for_individual,
        attributed_to_user_id: insertData.attributed_to_user_id,
        registered_by_admin: insertData.registered_by_admin,
      });

      if (error) throw error;

      let points = score === 9 ? 3 : 5;
      if (data.citedMember) points += 10;

      toast({
        title: "Sucesso!",
        description: `NPS ${score} registrado (+${points} pontos)`,
      });

      form.reset();
    } catch (error: any) {
      toast({
        title: "Erro ao registrar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-card rounded-2xl p-6 border border-border">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-success/10">
          <ThumbsUp className="w-6 h-6 text-success" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">NPS</h3>
          <p className="text-muted-foreground text-sm">
            NPS 9: 3pts | NPS 10: 5pts | Citação: +10pts
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="score"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Nota NPS</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-secondary border-border text-foreground">
                      <SelectValue placeholder="Selecione a nota" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-card border-border">
                    <SelectItem
                      value="9"
                      className="text-foreground hover:bg-secondary focus:bg-secondary"
                    >
                      NPS 9 (3 pontos)
                    </SelectItem>
                    <SelectItem
                      value="10"
                      className="text-foreground hover:bg-secondary focus:bg-secondary"
                    >
                      NPS 10 (5 pontos)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="citedMember"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-border p-4 bg-secondary/30">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-foreground">
                    Paciente citou membro da equipe
                  </FormLabel>
                  <FormDescription className="text-muted-foreground">
                    +10 pontos de bônus se o paciente citou nominalmente
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {citedMember && (
            <FormField
              control={form.control}
              name="memberName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Nome do Membro Citado</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nome do membro da equipe"
                      {...field}
                      className="bg-secondary border-border text-foreground"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-foreground">Data</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-secondary border-border",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? (
                          format(field.value, "dd/MM/yyyy", { locale: ptBR })
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <IndividualTeamFields form={form} />

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-gold-shine text-primary-foreground font-bold hover:opacity-90"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Registrando...
              </span>
            ) : (
              "Registrar NPS"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default NPSForm;
