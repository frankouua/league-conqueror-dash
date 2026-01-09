import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
}

interface FormTemplate {
  id: string;
  name: string;
  slug: string;
  description: string;
  form_type: string;
  fields: FormField[];
}

interface FormLink {
  id: string;
  template_id: string;
  patient_name: string | null;
  patient_email: string | null;
  patient_phone: string | null;
  patient_cpf: string | null;
  patient_prontuario: string | null;
  lead_id: string | null;
  is_active: boolean;
  expires_at: string | null;
  max_submissions: number;
  current_submissions: number;
}

export function PatientFormViewer() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const formSlug = searchParams.get("form");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [formLink, setFormLink] = useState<FormLink | null>(null);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadForm();
  }, [token, formSlug]);

  const loadForm = async () => {
    try {
      setLoading(true);
      setError(null);

      if (token) {
        // Carregar via link único
        const { data: link, error: linkError } = await supabase
          .from("form_links")
          .select("*")
          .eq("token", token)
          .single();

        if (linkError || !link) {
          setError("Link de formulário inválido ou expirado.");
          return;
        }

        if (!link.is_active) {
          setError("Este formulário não está mais ativo.");
          return;
        }

        if (link.expires_at && new Date(link.expires_at) < new Date()) {
          setError("Este link expirou.");
          return;
        }

        if (link.max_submissions && link.current_submissions >= link.max_submissions) {
          setError("O limite de respostas para este formulário foi atingido.");
          return;
        }

        setFormLink(link);

        const { data: tmpl, error: tmplError } = await supabase
          .from("form_templates")
          .select("*")
          .eq("id", link.template_id)
          .single();

        if (tmplError || !tmpl) {
          setError("Formulário não encontrado.");
          return;
        }

        // Parse fields JSON
        const parsedTemplate = {
          ...tmpl,
          fields: typeof tmpl.fields === 'string' ? JSON.parse(tmpl.fields) : tmpl.fields
        };
        setTemplate(parsedTemplate);
      } else if (formSlug) {
        // Carregar direto por slug
        const { data: tmpl, error: tmplError } = await supabase
          .from("form_templates")
          .select("*")
          .eq("slug", formSlug)
          .eq("is_active", true)
          .single();

        if (tmplError || !tmpl) {
          setError("Formulário não encontrado.");
          return;
        }

        const parsedTemplate = {
          ...tmpl,
          fields: typeof tmpl.fields === 'string' ? JSON.parse(tmpl.fields) : tmpl.fields
        };
        setTemplate(parsedTemplate);
      } else {
        setError("Nenhum formulário especificado.");
      }
    } catch (err: any) {
      console.error("Error loading form:", err);
      setError("Erro ao carregar formulário.");
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setResponses(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!template) return;

    // Validar campos obrigatórios
    for (const field of template.fields) {
      if (field.required && !responses[field.name]) {
        toast.error(`O campo "${field.label}" é obrigatório.`);
        return;
      }
    }

    try {
      setSubmitting(true);

      // Detectar NPS score
      let npsScore = null;
      if (template.form_type === "nps" && responses.nps_score !== undefined) {
        npsScore = Number(responses.nps_score);
      }

      // Criar resposta
      const { error: insertError } = await supabase.from("form_responses").insert({
        template_id: template.id,
        patient_name: formLink?.patient_name,
        patient_email: formLink?.patient_email,
        patient_phone: formLink?.patient_phone,
        patient_cpf: formLink?.patient_cpf,
        patient_prontuario: formLink?.patient_prontuario,
        lead_id: formLink?.lead_id,
        form_type: template.form_type,
        form_source: "sistema",
        responses,
        nps_score: npsScore
      });

      if (insertError) throw insertError;

      // Atualizar contador do link
      if (formLink) {
        await supabase
          .from("form_links")
          .update({ current_submissions: (formLink.current_submissions || 0) + 1 })
          .eq("id", formLink.id);
      }

      setSubmitted(true);
      toast.success("Formulário enviado com sucesso!");
    } catch (err: any) {
      console.error("Error submitting form:", err);
      toast.error("Erro ao enviar formulário. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = responses[field.name] ?? "";

    switch (field.type) {
      case "text":
      case "email":
      case "phone":
        return (
          <Input
            type={field.type === "phone" ? "tel" : field.type}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.label}
            required={field.required}
          />
        );

      case "textarea":
        return (
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.label}
            required={field.required}
            rows={4}
          />
        );

      case "checkbox":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.name}
              checked={!!value}
              onCheckedChange={(checked) => handleFieldChange(field.name, checked)}
            />
            <label htmlFor={field.name} className="text-sm cursor-pointer">
              {field.label}
            </label>
          </div>
        );

      case "select":
        return (
          <RadioGroup
            value={value}
            onValueChange={(v) => handleFieldChange(field.name, v)}
          >
            {field.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${field.name}-${option}`} />
                <Label htmlFor={`${field.name}-${option}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "multiselect":
        const selectedOptions = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.name}-${option}`}
                  checked={selectedOptions.includes(option)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleFieldChange(field.name, [...selectedOptions, option]);
                    } else {
                      handleFieldChange(field.name, selectedOptions.filter((o: string) => o !== option));
                    }
                  }}
                />
                <label htmlFor={`${field.name}-${option}`} className="text-sm cursor-pointer">
                  {option}
                </label>
              </div>
            ))}
          </div>
        );

      case "nps":
      case "scale":
        const min = field.min ?? 0;
        const max = field.max ?? 10;
        const numbers = Array.from({ length: max - min + 1 }, (_, i) => i + min);
        
        return (
          <div className="space-y-3">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Nada provável</span>
              <span>Muito provável</span>
            </div>
            <div className="flex gap-1 justify-center flex-wrap">
              {numbers.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleFieldChange(field.name, num)}
                  className={cn(
                    "w-10 h-10 rounded-lg border-2 font-semibold transition-all",
                    value === num
                      ? num <= 6
                        ? "bg-red-500 border-red-500 text-white"
                        : num <= 8
                        ? "bg-amber-500 border-amber-500 text-white"
                        : "bg-green-500 border-green-500 text-white"
                      : "border-muted hover:border-primary hover:bg-muted"
                  )}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.label}
            required={field.required}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Obrigado!</h2>
            <p className="text-muted-foreground">
              Sua resposta foi enviada com sucesso. Agradecemos seu feedback!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!template) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{template.name}</CardTitle>
            {template.description && (
              <CardDescription>{template.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {template.fields.map((field, index) => (
                <div key={field.name} className="space-y-2">
                  {field.type !== "checkbox" && (
                    <Label className="flex items-center gap-1">
                      {field.label}
                      {field.required && <span className="text-destructive">*</span>}
                    </Label>
                  )}
                  {renderField(field)}
                </div>
              ))}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Resposta
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}