import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Award, AlertTriangle, Loader2 } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
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

const cardSchema = z.object({
  teamId: z.string().min(1, "Selecione uma equipe"),
  type: z.enum(["blue", "white", "yellow", "red"], {
    required_error: "Selecione o tipo de cartão",
  }),
  reason: z.string().min(10, "Motivo deve ter no mínimo 10 caracteres"),
  date: z.date({ required_error: "Selecione uma data" }),
});

type CardFormData = z.infer<typeof cardSchema>;

interface Team {
  id: string;
  name: string;
}

const cardTypes = {
  blue: { label: "Cartão Azul", points: 20, color: "text-info", bgColor: "bg-info/10", description: "Inovação" },
  white: { label: "Cartão Branco", points: 10, color: "text-foreground", bgColor: "bg-foreground/10", description: "Excelência" },
  yellow: { label: "Cartão Amarelo", points: -15, color: "text-warning", bgColor: "bg-warning/10", description: "Atenção" },
  red: { label: "Cartão Vermelho", points: -40, color: "text-destructive", bgColor: "bg-destructive/10", description: "Falta Grave" },
};

const CardForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      reason: "",
    },
  });

  useEffect(() => {
    const fetchTeams = async () => {
      const { data } = await supabase.from("teams").select("id, name");
      if (data) setTeams(data);
    };
    fetchTeams();
  }, []);

  const selectedType = form.watch("type");

  const onSubmit = async (data: CardFormData) => {
    if (!user) return;

    setIsLoading(true);

    try {
      const cardInfo = cardTypes[data.type];

      const { error } = await supabase.from("cards").insert({
        team_id: data.teamId,
        applied_by: user.id,
        type: data.type,
        reason: data.reason,
        points: cardInfo.points,
        date: format(data.date, "yyyy-MM-dd"),
      });

      if (error) throw error;

      const teamName = teams.find(t => t.id === data.teamId)?.name;

      toast({
        title: "Cartão Aplicado!",
        description: `${cardInfo.label} aplicado à ${teamName} (${cardInfo.points > 0 ? "+" : ""}${cardInfo.points} pts)`,
      });

      form.reset();
    } catch (error: any) {
      toast({
        title: "Erro ao aplicar cartão",
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
        <div className="p-3 rounded-xl bg-primary/10">
          <Award className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Aplicar Cartão</h3>
          <p className="text-muted-foreground text-sm">
            Bonificações e penalidades para as equipes
          </p>
        </div>
      </div>

      {/* Card Types Preview */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {Object.entries(cardTypes).map(([key, value]) => (
          <div
            key={key}
            className={cn(
              "p-3 rounded-lg border transition-all cursor-pointer",
              selectedType === key
                ? `${value.bgColor} border-current ${value.color}`
                : "border-border hover:border-muted-foreground"
            )}
            onClick={() => form.setValue("type", key as any)}
          >
            <div className="flex items-center gap-2">
              {value.points > 0 ? (
                <Award className={cn("w-4 h-4", value.color)} />
              ) : (
                <AlertTriangle className={cn("w-4 h-4", value.color)} />
              )}
              <span className={cn("font-semibold text-sm", value.color)}>
                {value.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {value.description} ({value.points > 0 ? "+" : ""}{value.points} pts)
            </p>
          </div>
        ))}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="teamId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Equipe</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-secondary border-border text-foreground">
                      <SelectValue placeholder="Selecione a equipe" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-card border-border">
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
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Tipo de Cartão</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-secondary border-border text-foreground">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-card border-border">
                    {Object.entries(cardTypes).map(([key, value]) => (
                      <SelectItem
                        key={key}
                        value={key}
                        className="text-foreground hover:bg-secondary focus:bg-secondary"
                      >
                        <span className={value.color}>
                          {value.label} ({value.points > 0 ? "+" : ""}{value.points} pts)
                        </span>
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
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Motivo</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Descreva o motivo do cartão..."
                    {...field}
                    className="bg-secondary border-border text-foreground resize-none"
                    rows={4}
                  />
                </FormControl>
                <FormDescription className="text-muted-foreground">
                  Mínimo de 10 caracteres
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

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-gold-shine text-primary-foreground font-bold hover:opacity-90"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Aplicando...
              </span>
            ) : (
              "Aplicar Cartão"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default CardForm;
