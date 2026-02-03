import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, XCircle, Loader2, Building2, User, Scissors } from "lucide-react";
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
import type { Database } from "@/integrations/supabase/types";

type CancellationReason = Database["public"]["Enums"]["cancellation_reason"];

const SALES_DEPARTMENT_OPTIONS = [
  { value: "cirurgia_plastica", label: "Cirurgia Plástica" },
  { value: "consulta_cirurgia_plastica", label: "Consulta Cirurgia Plástica" },
  { value: "pos_operatorio", label: "Pós Operatório" },
  { value: "soroterapia_protocolos", label: "Soroterapia / Protocolos Nutricionais" },
  { value: "harmonizacao_facial_corporal", label: "Harmonização Facial e Corporal" },
  { value: "spa_estetica", label: "Spa e Estética" },
  { value: "unique_travel", label: "Unique Travel Experience" },
  { value: "luxskin", label: "Luxskin" },
] as const;

const CANCELLATION_REASONS: { value: CancellationReason; label: string }[] = [
  { value: "financial", label: "Financeiro" },
  { value: "health", label: "Saúde" },
  { value: "dissatisfaction", label: "Insatisfação" },
  { value: "changed_mind", label: "Mudou de ideia" },
  { value: "competitor", label: "Concorrência" },
  { value: "scheduling", label: "Agenda" },
  { value: "personal", label: "Pessoal" },
  { value: "other", label: "Outro" },
];

const cancellationSchema = z.object({
  amount: z.string().min(1, "Informe o valor do cancelamento"),
  date: z.date({ required_error: "Selecione uma data" }),
  patientName: z.string().min(2, "Informe o nome do paciente"),
  procedureName: z.string().min(2, "Informe o procedimento"),
  reason: z.string().min(1, "Selecione o motivo"),
  reasonDetails: z.string().optional(),
  department: z.string().optional(),
});

type CancellationFormData = z.infer<typeof cancellationSchema>;

const CancellationForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const form = useForm<CancellationFormData>({
    resolver: zodResolver(cancellationSchema),
    defaultValues: {
      amount: "",
      patientName: "",
      procedureName: "",
      reason: "",
      reasonDetails: "",
      department: undefined,
    },
  });

  const onSubmit = async (data: CancellationFormData) => {
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

      // Insert into cancellations table with proper structure
      const { error } = await supabase.from("cancellations").insert({
        team_id: profile.team_id,
        user_id: user.id,
        contract_value: amount,
        cancellation_request_date: format(data.date, "yyyy-MM-dd"),
        patient_name: data.patientName,
        procedure_name: data.procedureName,
        reason: data.reason as CancellationReason,
        reason_details: data.reasonDetails || null,
        status: "cancelled_no_fine",
      });

      if (error) throw error;

      // Calculate points deducted (1 point per R$ 1,000)
      const pointsDeducted = Math.floor(amount / 1000);

      toast({
        title: "Cancelamento registrado",
        description: `R$ ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} abatido${pointsDeducted > 0 ? ` (-${pointsDeducted} pontos)` : ""}`,
        variant: "destructive",
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
    <div className="bg-gradient-card rounded-2xl p-6 border border-destructive/30">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-destructive/10">
          <XCircle className="w-6 h-6 text-destructive" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Cancelamento</h3>
          <p className="text-muted-foreground text-sm">
            Registre cancelamentos de cirurgias ou faturamento
          </p>
        </div>
      </div>

      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
        <p className="text-sm text-destructive">
          <strong>Atenção:</strong> O valor será abatido do faturamento total da equipe 
          e os pontos serão deduzidos proporcionalmente (1 ponto a cada R$ 1.000).
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="patientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Nome do Paciente
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Maria Silva"
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
              name="procedureName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground flex items-center gap-2">
                    <Scissors className="w-4 h-4" />
                    Procedimento
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Rinoplastia"
                      {...field}
                      className="bg-secondary border-border text-foreground"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Valor do Cancelamento (R$)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="100.000,00"
                    {...field}
                    className="bg-secondary border-border text-foreground"
                  />
                </FormControl>
                <FormDescription className="text-muted-foreground">
                  Informe o valor que será abatido
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Motivo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue placeholder="Selecione o motivo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CANCELLATION_REASONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
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
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SALES_DEPARTMENT_OPTIONS.map((dept) => (
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
          </div>

          <FormField
            control={form.control}
            name="reasonDetails"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Detalhes (opcional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Ex: Paciente relatou dificuldades financeiras..."
                    {...field}
                    className="bg-secondary border-border text-foreground resize-none"
                    rows={2}
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
                <FormLabel className="text-foreground">Data do Cancelamento</FormLabel>
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
            variant="destructive"
            className="w-full font-bold"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Registrando...
              </span>
            ) : (
              "Registrar Cancelamento"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default CancellationForm;
