import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Zap, Target, Loader2 } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const BOOSTERS = [
  { value: "chuva_fechamentos", label: "Chuva de Fechamentos", description: "Multiplica pontos de fechamentos", defaultMultiplier: 1.5 },
  { value: "liga_lealdade", label: "Liga da Lealdade", description: "Bônus por fidelização", defaultPoints: 30 },
];

const TURNING_POINTS = [
  { value: "dia_virada", label: "Dia da Virada", description: "Pontos extras em dia especial", defaultPoints: 50 },
  { value: "missao_bruna", label: "Missão Bruna", description: "Desafio especial cumprido", defaultPoints: 40 },
  { value: "var", label: "VAR", description: "Revisão de pontuação", defaultPoints: 0 },
];

const specialEventSchema = z.object({
  teamId: z.string().min(1, "Selecione uma equipe"),
  category: z.enum(["booster", "turning_point"], { required_error: "Selecione uma categoria" }),
  eventType: z.string().min(1, "Selecione um tipo de evento"),
  points: z.string().optional(),
  multiplier: z.string().optional(),
  description: z.string().max(500).optional(),
  date: z.date({ required_error: "Selecione uma data" }),
});

type SpecialEventFormData = z.infer<typeof specialEventSchema>;

const SpecialEventsForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<SpecialEventFormData>({
    resolver: zodResolver(specialEventSchema),
    defaultValues: {
      teamId: "",
      category: undefined,
      eventType: "",
      points: "0",
      multiplier: "1.0",
      description: "",
    },
  });

  const category = form.watch("category");
  const eventType = form.watch("eventType");

  useEffect(() => {
    const fetchTeams = async () => {
      const { data } = await supabase.from("teams").select("id, name").order("name");
      if (data) setTeams(data);
    };
    fetchTeams();
  }, []);

  useEffect(() => {
    if (category && eventType) {
      const events = category === "booster" ? BOOSTERS : TURNING_POINTS;
      const selectedEvent = events.find(e => e.value === eventType);
      if (selectedEvent) {
        if ('defaultPoints' in selectedEvent) {
          form.setValue("points", String(selectedEvent.defaultPoints));
        }
        if ('defaultMultiplier' in selectedEvent) {
          form.setValue("multiplier", String(selectedEvent.defaultMultiplier));
        }
      }
    }
  }, [category, eventType, form]);

  const onSubmit = async (data: SpecialEventFormData) => {
    if (!user) return;

    setIsLoading(true);

    try {
      const points = parseInt(data.points || "0") || 0;
      const multiplier = parseFloat(data.multiplier || "1.0") || 1.0;

      const { error } = await supabase.from("special_events").insert({
        team_id: data.teamId,
        category: data.category,
        event_type: data.eventType,
        points,
        multiplier,
        description: data.description?.trim() || null,
        date: format(data.date, "yyyy-MM-dd"),
        applied_by: user.id,
      });

      if (error) throw error;

      const events = data.category === "booster" ? BOOSTERS : TURNING_POINTS;
      const eventLabel = events.find(e => e.value === data.eventType)?.label || data.eventType;
      const teamName = teams.find(t => t.id === data.teamId)?.name || "Equipe";

      toast({
        title: "Evento aplicado!",
        description: `${eventLabel} aplicado para ${teamName}${points ? ` (+${points} pts)` : ""}`,
      });

      form.reset();
    } catch (error: any) {
      toast({
        title: "Erro ao aplicar evento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const currentEvents = category === "booster" ? BOOSTERS : category === "turning_point" ? TURNING_POINTS : [];

  return (
    <div className="bg-gradient-card rounded-2xl p-6 border border-border">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-primary/10">
          <Zap className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Boosters & Turning Points</h3>
          <p className="text-muted-foreground text-sm">
            Aplique eventos especiais às equipes
          </p>
        </div>
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
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Selecione a equipe" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-card border-border">
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
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
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Categoria</FormLabel>
                <Select onValueChange={(value) => { field.onChange(value); form.setValue("eventType", ""); }} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="booster">
                      <span className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        Booster
                      </span>
                    </SelectItem>
                    <SelectItem value="turning_point">
                      <span className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-blue-500" />
                        Turning Point
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {category && (
            <FormField
              control={form.control}
              name="eventType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Tipo de Evento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue placeholder="Selecione o evento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-card border-border">
                      {currentEvents.map((event) => (
                        <SelectItem key={event.value} value={event.value}>
                          <div className="flex flex-col">
                            <span>{event.label}</span>
                            <span className="text-xs text-muted-foreground">{event.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="points"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Pontos</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      className="bg-secondary border-border text-foreground"
                    />
                  </FormControl>
                  <FormDescription className="text-muted-foreground text-xs">
                    Pontos extras
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="multiplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Multiplicador</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      placeholder="1.0"
                      {...field}
                      className="bg-secondary border-border text-foreground"
                    />
                  </FormControl>
                  <FormDescription className="text-muted-foreground text-xs">
                    Ex: 1.5 = +50%
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Descrição (opcional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Motivo ou detalhes do evento..."
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
              "Aplicar Evento"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default SpecialEventsForm;
