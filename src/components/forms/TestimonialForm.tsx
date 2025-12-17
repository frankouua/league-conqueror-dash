import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Star, Loader2 } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const testimonialSchema = z.object({
  type: z.enum(["google", "video", "gold"], {
    required_error: "Selecione o tipo de depoimento",
  }),
  link: z.string().optional(),
  patientName: z.string().optional(),
  date: z.date({ required_error: "Selecione uma data" }),
});

type TestimonialFormData = z.infer<typeof testimonialSchema>;

const testimonialTypes = {
  google: { label: "Google Review 5★", points: 10 },
  video: { label: "Depoimento em Vídeo", points: 20 },
  gold: { label: "Depoimento Ouro", points: 40 },
};

const TestimonialForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const form = useForm<TestimonialFormData>({
    resolver: zodResolver(testimonialSchema),
    defaultValues: {
      link: "",
      patientName: "",
    },
  });

  const onSubmit = async (data: TestimonialFormData) => {
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
      const { error } = await supabase.from("testimonial_records").insert({
        team_id: profile.team_id,
        user_id: user.id,
        type: data.type,
        link: data.link || null,
        patient_name: data.patientName || null,
        date: format(data.date, "yyyy-MM-dd"),
      });

      if (error) throw error;

      const points = testimonialTypes[data.type].points;

      toast({
        title: "Sucesso!",
        description: `${testimonialTypes[data.type].label} registrado (+${points} pontos)`,
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
        <div className="p-3 rounded-xl bg-primary/10">
          <Star className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Depoimentos</h3>
          <p className="text-muted-foreground text-sm">
            Google: 10pts | Vídeo: 20pts | Ouro: 40pts
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Tipo de Depoimento</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-secondary border-border text-foreground">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-card border-border">
                    {Object.entries(testimonialTypes).map(([key, value]) => (
                      <SelectItem
                        key={key}
                        value={key}
                        className="text-foreground hover:bg-secondary focus:bg-secondary"
                      >
                        {value.label} ({value.points} pts)
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
            name="link"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Link (opcional)</FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder="https://..."
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
            name="patientName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Nome do Paciente (opcional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Nome do paciente"
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
              "Registrar Depoimento"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default TestimonialForm;
