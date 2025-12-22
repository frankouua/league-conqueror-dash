import { useState, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Heart, Instagram, Award, Loader2 } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
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
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { IndividualTeamFields, getEffectiveInsertData } from "./IndividualTeamFields";

const otherIndicatorsSchema = z.object({
  unilovers: z.string().optional(),
  ambassadors: z.string().optional(),
  instagramMentions: z.string().optional(),
  date: z.date({ required_error: "Selecione uma data" }),
  countsForIndividual: z.boolean().default(true),
  attributedToUserId: z.string().optional(),
});

type OtherIndicatorsFormData = z.infer<typeof otherIndicatorsSchema>;

const OtherIndicatorsForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [adminSelectedTeamId, setAdminSelectedTeamId] = useState<string | undefined>();
  const { user, profile, role } = useAuth();
  const { toast } = useToast();
  const isAdmin = role === "admin";

  const form = useForm<OtherIndicatorsFormData>({
    resolver: zodResolver(otherIndicatorsSchema),
    defaultValues: {
      unilovers: "",
      ambassadors: "",
      instagramMentions: "",
      countsForIndividual: true,
      attributedToUserId: "",
    },
  });

  const handleTeamChange = useCallback((teamId: string) => {
    setAdminSelectedTeamId(teamId);
  }, []);

  const onSubmit = async (data: OtherIndicatorsFormData) => {
    const effectiveTeamId = isAdmin && adminSelectedTeamId ? adminSelectedTeamId : profile?.team_id;
    
    if (!user || !effectiveTeamId) {
      toast({
        title: "Erro",
        description: isAdmin ? "Selecione um time" : "Você precisa estar logado e vinculado a uma equipe",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const unilovers = parseInt(data.unilovers || "0") || 0;
      const ambassadors = parseInt(data.ambassadors || "0") || 0;
      const instagramMentions = parseInt(data.instagramMentions || "0") || 0;

      if (unilovers === 0 && ambassadors === 0 && instagramMentions === 0) {
        toast({
          title: "Atenção",
          description: "Preencha pelo menos um indicador",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (unilovers < 0 || ambassadors < 0 || instagramMentions < 0) {
        toast({
          title: "Erro",
          description: "Valores não podem ser negativos",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const insertData = getEffectiveInsertData(
        user.id,
        data.attributedToUserId,
        data.countsForIndividual,
        isAdmin,
        effectiveTeamId
      );

      const { error } = await supabase.from("other_indicators").insert({
        team_id: effectiveTeamId,
        user_id: insertData.effectiveUserId,
        unilovers,
        ambassadors,
        instagram_mentions: instagramMentions,
        date: format(data.date, "yyyy-MM-dd"),
        counts_for_individual: insertData.counts_for_individual,
        attributed_to_user_id: insertData.attributed_to_user_id,
        registered_by_admin: insertData.registered_by_admin,
      });

      if (error) throw error;

      const points = unilovers * 5 + ambassadors * 50 + instagramMentions * 2;

      toast({
        title: "Sucesso!",
        description: `Indicadores registrados (+${points} pontos)`,
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
        <div className="p-3 rounded-xl bg-pink-500/10">
          <Heart className="w-6 h-6 text-pink-500" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Outros Indicadores</h3>
          <p className="text-muted-foreground text-sm">
            UniLovers, Embaixadoras e Instagram
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="unilovers"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-500" />
                  Cadastros UniLovers
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    {...field}
                    className="bg-secondary border-border text-foreground"
                  />
                </FormControl>
                <FormDescription className="text-muted-foreground">
                  5 pontos cada
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ambassadors"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" />
                  Pacientes Embaixadoras
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    {...field}
                    className="bg-secondary border-border text-foreground"
                  />
                </FormControl>
                <FormDescription className="text-muted-foreground">
                  50 pontos cada
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="instagramMentions"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground flex items-center gap-2">
                  <Instagram className="w-4 h-4 text-purple-500" />
                  Menções no Instagram @uniquecpi
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    {...field}
                    className="bg-secondary border-border text-foreground"
                  />
                </FormControl>
                <FormDescription className="text-muted-foreground">
                  2 pontos cada
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

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

          <IndividualTeamFields form={form} onTeamChange={handleTeamChange} />

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
              "Registrar Indicadores"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default OtherIndicatorsForm;
