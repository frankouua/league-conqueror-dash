import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, DollarSign, Loader2, Building2 } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
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

const DEPARTMENT_OPTIONS = [
  { value: "comercial", label: "Comercial" },
  { value: "atendimento", label: "Atendimento" },
  { value: "marketing", label: "Marketing" },
  { value: "administrativo", label: "Administrativo" },
  { value: "clinico", label: "Clínico" },
] as const;

const revenueSchema = z.object({
  amount: z.string().min(1, "Informe o valor do faturamento"),
  date: z.date({ required_error: "Selecione uma data" }),
  notes: z.string().optional(),
  department: z.enum(["comercial", "atendimento", "marketing", "administrativo", "clinico"]).optional(),
  countsForIndividual: z.boolean().default(true),
  attributedToUserId: z.string().optional(),
});

type RevenueFormData = z.infer<typeof revenueSchema>;

const RevenueForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user, profile, role } = useAuth();
  const { toast } = useToast();
  const isAdmin = role === "admin";

  const form = useForm<RevenueFormData>({
    resolver: zodResolver(revenueSchema),
    defaultValues: {
      amount: "",
      notes: "",
      department: undefined,
      countsForIndividual: true,
      attributedToUserId: "",
    },
  });

  const onSubmit = async (data: RevenueFormData) => {
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
      // Parse amount (handles Brazilian format like 1.500.000,50)
      const cleanAmount = data.amount
        .replace(/\./g, "")
        .replace(",", ".");
      const amount = parseFloat(cleanAmount);

      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Erro",
          description: "Valor inválido",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const insertData = getEffectiveInsertData(
        user.id,
        data.attributedToUserId,
        data.countsForIndividual,
        isAdmin
      );

      const { error } = await supabase.from("revenue_records").insert({
        team_id: profile.team_id,
        user_id: insertData.effectiveUserId,
        amount,
        date: format(data.date, "yyyy-MM-dd"),
        notes: data.notes || null,
        department: data.department || null,
        counts_for_individual: insertData.counts_for_individual,
        attributed_to_user_id: insertData.attributed_to_user_id,
        registered_by_admin: insertData.registered_by_admin,
      });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: `Faturamento de R$ ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} registrado`,
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
          <DollarSign className="w-6 h-6 text-success" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Faturamento</h3>
          <p className="text-muted-foreground text-sm">
            Cada R$ 10.000 = 1 ponto
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Valor (R$)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="1.500.000,00"
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

          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Departamento (opcional)
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Selecione o departamento" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DEPARTMENT_OPTIONS.map((dept) => (
                      <SelectItem key={dept.value} value={dept.value}>
                        {dept.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Observações (opcional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Adicione observações sobre este registro..."
                    {...field}
                    className="bg-secondary border-border text-foreground resize-none"
                    rows={3}
                  />
                </FormControl>
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
              "Registrar Faturamento"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default RevenueForm;
