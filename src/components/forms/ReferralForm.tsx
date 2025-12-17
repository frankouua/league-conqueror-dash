import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Users, Loader2 } from "lucide-react";
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

const referralSchema = z.object({
  collected: z.string().min(1, "Informe o número de indicações"),
  toConsultation: z.string().optional(),
  toSurgery: z.string().optional(),
  patientName: z.string().optional(),
  date: z.date({ required_error: "Selecione uma data" }),
});

type ReferralFormData = z.infer<typeof referralSchema>;

const ReferralForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const form = useForm<ReferralFormData>({
    resolver: zodResolver(referralSchema),
    defaultValues: {
      collected: "",
      toConsultation: "",
      toSurgery: "",
      patientName: "",
    },
  });

  const onSubmit = async (data: ReferralFormData) => {
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
      const collected = parseInt(data.collected) || 0;
      const toConsultation = parseInt(data.toConsultation || "0") || 0;
      const toSurgery = parseInt(data.toSurgery || "0") || 0;

      if (collected < 0 || toConsultation < 0 || toSurgery < 0) {
        toast({
          title: "Erro",
          description: "Valores não podem ser negativos",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.from("referral_records").insert({
        team_id: profile.team_id,
        user_id: user.id,
        collected,
        to_consultation: toConsultation,
        to_surgery: toSurgery,
        patient_name: data.patientName || null,
        date: format(data.date, "yyyy-MM-dd"),
      });

      if (error) throw error;

      // Calculate points
      const points = collected * 5 + toConsultation * 15 + toSurgery * 30;

      toast({
        title: "Sucesso!",
        description: `Indicações registradas (+${points} pontos)`,
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
        <div className="p-3 rounded-xl bg-info/10">
          <Users className="w-6 h-6 text-info" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Indicações</h3>
          <p className="text-muted-foreground text-sm">
            Coletada: 5pts | Consulta: +15pts | Cirurgia: +30pts
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="collected"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Indicações Coletadas</FormLabel>
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
            name="toConsultation"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Viraram Consulta</FormLabel>
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
                  +15 pontos cada
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="toSurgery"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Viraram Cirurgia</FormLabel>
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
                  +30 pontos cada
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="patientName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Nome do Paciente (opcional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Nome do paciente indicado"
                    {...field}
                    className="bg-secondary border-border text-foreground"
                  />
                </FormControl>
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
              "Registrar Indicações"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default ReferralForm;
