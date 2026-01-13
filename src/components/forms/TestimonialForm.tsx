import { useState, useCallback, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Star, Loader2, Upload, X, Image } from "lucide-react";
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
import { IndividualTeamFields, getEffectiveInsertData } from "./IndividualTeamFields";

const testimonialSchema = z.object({
  type: z.enum(["google", "video", "gold", "whatsapp"], {
    required_error: "Selecione o tipo de depoimento",
  }),
  link: z.string().optional(),
  patientName: z.string().optional(),
  date: z.date({ required_error: "Selecione uma data" }),
  countsForIndividual: z.boolean().default(true),
  attributedToUserId: z.string().optional(),
});

type TestimonialFormData = z.infer<typeof testimonialSchema>;

const testimonialTypes = {
  whatsapp: { label: "Depoimento WhatsApp", points: 5 },
  google: { label: "Google Review 5★", points: 10 },
  video: { label: "Depoimento em Vídeo", points: 20 },
  gold: { label: "Depoimento Ouro", points: 40 },
};

const TestimonialForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [adminSelectedTeamId, setAdminSelectedTeamId] = useState<string | undefined>();
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, profile, role } = useAuth();
  const { toast } = useToast();
  const isAdmin = role === "admin";

  const form = useForm<TestimonialFormData>({
    resolver: zodResolver(testimonialSchema),
    defaultValues: {
      link: "",
      patientName: "",
      countsForIndividual: true,
      attributedToUserId: "",
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 5MB",
          variant: "destructive",
        });
        return;
      }
      
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Tipo de arquivo inválido",
          description: "Apenas imagens são permitidas",
          variant: "destructive",
        });
        return;
      }
      
      setEvidenceFile(file);
      const previewUrl = URL.createObjectURL(file);
      setEvidencePreview(previewUrl);
    }
  };

  const removeEvidence = () => {
    setEvidenceFile(null);
    if (evidencePreview) {
      URL.revokeObjectURL(evidencePreview);
      setEvidencePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadEvidence = async (): Promise<string | null> => {
    if (!evidenceFile || !user) return null;
    
    setIsUploading(true);
    try {
      const fileExt = evidenceFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("testimonial-evidence")
        .upload(fileName, evidenceFile);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from("testimonial-evidence")
        .getPublicUrl(fileName);
      
      return publicUrl;
    } catch (error: any) {
      console.error("Error uploading evidence:", error);
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleTeamChange = useCallback((teamId: string) => {
    setAdminSelectedTeamId(teamId);
  }, []);

  const onSubmit = async (data: TestimonialFormData) => {
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
      // Upload evidence if provided
      let evidenceUrl: string | null = null;
      if (evidenceFile) {
        evidenceUrl = await uploadEvidence();
      }

      const insertData = getEffectiveInsertData(
        user.id,
        data.attributedToUserId,
        data.countsForIndividual,
        isAdmin,
        effectiveTeamId
      );

      const { error } = await supabase.from("testimonial_records").insert({
        team_id: effectiveTeamId,
        user_id: insertData.effectiveUserId,
        type: data.type,
        link: data.link || null,
        patient_name: data.patientName || null,
        date: format(data.date, "yyyy-MM-dd"),
        counts_for_individual: insertData.counts_for_individual,
        attributed_to_user_id: insertData.attributed_to_user_id,
        registered_by_admin: insertData.registered_by_admin,
        evidence_url: evidenceUrl,
      });

      if (error) throw error;

      const points = testimonialTypes[data.type].points;

      toast({
        title: "Sucesso!",
        description: `${testimonialTypes[data.type].label} registrado (+${points} pontos)`,
      });

      form.reset();
      removeEvidence();
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
            WhatsApp: 5pts | Google: 10pts | Vídeo: 20pts | Ouro: 40pts
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

          {/* Campo de Upload de Evidência */}
          <div className="space-y-2">
            <FormLabel className="text-foreground">Evidência / Print (opcional)</FormLabel>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />
            
            {!evidencePreview ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-24 border-dashed border-2 bg-secondary/50 hover:bg-secondary flex flex-col items-center justify-center gap-2"
              >
                <Upload className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Clique para anexar print/evidência
                </span>
              </Button>
            ) : (
              <div className="relative rounded-lg overflow-hidden border border-border bg-secondary/50">
                <img 
                  src={evidencePreview} 
                  alt="Preview da evidência" 
                  className="w-full h-32 object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={removeEvidence}
                  className="absolute top-2 right-2 h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
                <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded bg-background/80 text-xs">
                  <Image className="w-3 h-3" />
                  <span>{evidenceFile?.name}</span>
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Anexe um print do depoimento como evidência (máx. 5MB)
            </p>
          </div>

          <IndividualTeamFields form={form} onTeamChange={handleTeamChange} />

          <Button
            type="submit"
            disabled={isLoading || isUploading}
            className="w-full bg-gradient-gold-shine text-primary-foreground font-bold hover:opacity-90"
          >
            {isLoading || isUploading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {isUploading ? "Enviando imagem..." : "Registrando..."}
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
