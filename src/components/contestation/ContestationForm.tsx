import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, Loader2, Clock } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  { value: "revenue", label: "Faturamento" },
  { value: "nps", label: "NPS" },
  { value: "testimonial", label: "Depoimento" },
  { value: "referral", label: "Indicação" },
  { value: "card", label: "Cartão" },
  { value: "special_event", label: "Evento Especial" },
  { value: "other", label: "Outro" },
];

const contestationSchema = z.object({
  title: z.string().min(5, "Título deve ter no mínimo 5 caracteres").max(100),
  description: z.string().min(20, "Descrição deve ter no mínimo 20 caracteres").max(1000),
  category: z.string().min(1, "Selecione uma categoria"),
});

type ContestationFormData = z.infer<typeof contestationSchema>;

interface ContestationFormProps {
  onSuccess?: () => void;
}

const ContestationForm = ({ onSuccess }: ContestationFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const form = useForm<ContestationFormData>({
    resolver: zodResolver(contestationSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
    },
  });

  const onSubmit = async (data: ContestationFormData) => {
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
      const { error } = await supabase.from("contestations").insert({
        team_id: profile.team_id,
        user_id: user.id,
        title: data.title.trim(),
        description: data.description.trim(),
        category: data.category,
      });

      if (error) throw error;

      toast({
        title: "Contestação enviada!",
        description: "Sua contestação foi registrada e será analisada em até 48 horas.",
      });

      form.reset();
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Erro ao enviar contestação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000);

  return (
    <div className="bg-gradient-card rounded-2xl p-6 border border-border">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-warning/10">
          <AlertCircle className="w-6 h-6 text-warning" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Nova Contestação</h3>
          <p className="text-muted-foreground text-sm">
            Conteste pontuações ou decisões
          </p>
        </div>
      </div>

      <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 text-warning">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">Prazo de 48 horas</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Contestações devem ser feitas em até 48 horas após o registro original.
          Prazo para esta contestação: {format(deadline, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Categoria</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-card border-border">
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
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
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Título</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Resumo da contestação"
                    {...field}
                    className="bg-secondary border-border text-foreground"
                  />
                </FormControl>
                <FormDescription className="text-muted-foreground text-xs">
                  Máximo 100 caracteres
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Descrição Detalhada</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Descreva detalhadamente o motivo da contestação, incluindo datas, valores e evidências..."
                    {...field}
                    className="bg-secondary border-border text-foreground resize-none"
                    rows={5}
                  />
                </FormControl>
                <FormDescription className="text-muted-foreground text-xs">
                  Mínimo 20 caracteres. Seja claro e objetivo.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-warning text-warning-foreground font-bold hover:bg-warning/90"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
              </span>
            ) : (
              "Enviar Contestação"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default ContestationForm;
