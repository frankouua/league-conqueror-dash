import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FormPayload {
  // Identificação do paciente
  name?: string;
  nome?: string;
  patient_name?: string;
  
  email?: string;
  patient_email?: string;
  
  phone?: string;
  telefone?: string;
  whatsapp?: string;
  patient_phone?: string;
  
  cpf?: string;
  patient_cpf?: string;
  
  prontuario?: string;
  patient_prontuario?: string;
  
  // Tipo do formulário
  form_type?: string;
  form_slug?: string;
  
  // NPS específico
  nps_score?: number;
  score?: number;
  nota?: number;
  
  // Respostas genéricas
  responses?: Record<string, any>;
  answers?: any[];
  
  // Metadata
  source?: string;
  form_source?: string;
  
  // Typeform específico
  form_response?: {
    answers?: any[];
    definition?: {
      fields?: any[];
    };
  };
  
  // Campos extras
  [key: string]: any;
}

// Normalizar telefone brasileiro
function normalizePhone(phone: string | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11) return `55${cleaned}`;
  if (cleaned.length === 13 && cleaned.startsWith("55")) return cleaned;
  if (cleaned.length === 10) return `55${cleaned}`;
  return cleaned.length >= 10 ? cleaned : null;
}

// Normalizar CPF
function normalizeCPF(cpf: string | undefined): string | null {
  if (!cpf) return null;
  const cleaned = cpf.replace(/\D/g, "");
  return cleaned.length === 11 ? cleaned : null;
}

// Extrair respostas do Typeform
function extractTypeformResponses(payload: FormPayload): Record<string, any> {
  if (!payload.form_response?.answers) return {};
  
  const responses: Record<string, any> = {};
  const fields = payload.form_response.definition?.fields || [];
  
  payload.form_response.answers.forEach((answer: any) => {
    const field = fields.find((f: any) => f.id === answer.field?.id);
    const fieldName = field?.title || answer.field?.id || 'unknown';
    
    let value: any;
    switch (answer.type) {
      case 'text':
        value = answer.text;
        break;
      case 'email':
        value = answer.email;
        break;
      case 'phone_number':
        value = answer.phone_number;
        break;
      case 'number':
        value = answer.number;
        break;
      case 'choice':
        value = answer.choice?.label;
        break;
      case 'choices':
        value = answer.choices?.labels || [];
        break;
      case 'boolean':
        value = answer.boolean;
        break;
      case 'date':
        value = answer.date;
        break;
      default:
        value = answer[answer.type] || answer;
    }
    
    responses[fieldName] = value;
  });
  
  return responses;
}

// Detectar score NPS das respostas
function detectNPSScore(payload: FormPayload, responses: Record<string, any>): number | null {
  // Direto do payload
  if (payload.nps_score !== undefined) return Number(payload.nps_score);
  if (payload.score !== undefined) return Number(payload.score);
  if (payload.nota !== undefined) return Number(payload.nota);
  
  // Das respostas
  for (const [key, value] of Object.entries(responses)) {
    const keyLower = key.toLowerCase();
    if (
      keyLower.includes('nps') || 
      keyLower.includes('nota') || 
      keyLower.includes('score') ||
      keyLower.includes('recomendar') ||
      keyLower.includes('probabilidade')
    ) {
      const num = Number(value);
      if (!isNaN(num) && num >= 0 && num <= 10) {
        return num;
      }
    }
  }
  
  return null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const formSlug = url.searchParams.get("form") || url.searchParams.get("type");
    
    // Parse payload
    let payload: FormPayload;
    const contentType = req.headers.get("content-type") || "";
    
    if (contentType.includes("application/json")) {
      payload = await req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      payload = Object.fromEntries(formData.entries()) as FormPayload;
    } else {
      try {
        payload = await req.json();
      } catch {
        const text = await req.text();
        try {
          payload = JSON.parse(text);
        } catch {
          payload = { raw_data: text };
        }
      }
    }

    console.log("Received form payload:", JSON.stringify(payload, null, 2));

    // Inicializar Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extrair dados do paciente
    const patientName = payload.name || payload.nome || payload.patient_name || null;
    const patientEmail = payload.email || payload.patient_email || null;
    const patientPhone = normalizePhone(
      payload.phone || payload.telefone || payload.whatsapp || payload.patient_phone
    );
    const patientCPF = normalizeCPF(payload.cpf || payload.patient_cpf);
    const patientProntuario = payload.prontuario || payload.patient_prontuario || null;
    
    // Determinar tipo do formulário
    const formType = formSlug || payload.form_type || payload.form_slug || "custom";
    
    // Determinar fonte
    const formSource = payload.form_response 
      ? "typeform" 
      : payload.source || payload.form_source || "webhook";
    
    // Extrair respostas
    let responses: Record<string, any>;
    if (payload.form_response) {
      // Typeform
      responses = extractTypeformResponses(payload);
    } else if (payload.responses) {
      responses = payload.responses;
    } else if (payload.answers && Array.isArray(payload.answers)) {
      responses = { answers: payload.answers };
    } else {
      // Usar todos os campos exceto os de identificação
      const excludeKeys = [
        'name', 'nome', 'patient_name', 'email', 'patient_email',
        'phone', 'telefone', 'whatsapp', 'patient_phone',
        'cpf', 'patient_cpf', 'prontuario', 'patient_prontuario',
        'form_type', 'form_slug', 'source', 'form_source', 'form_response'
      ];
      responses = {};
      for (const [key, value] of Object.entries(payload)) {
        if (!excludeKeys.includes(key)) {
          responses[key] = value;
        }
      }
    }
    
    // Detectar NPS score
    const npsScore = detectNPSScore(payload, responses);
    
    // Buscar template do formulário
    const { data: template } = await supabase
      .from("form_templates")
      .select("*")
      .eq("slug", formType)
      .single();
    
    // Criar resposta do formulário
    const { data: formResponse, error: insertError } = await supabase
      .from("form_responses")
      .insert({
        template_id: template?.id || null,
        patient_name: patientName,
        patient_email: patientEmail,
        patient_phone: patientPhone,
        patient_cpf: patientCPF,
        patient_prontuario: patientProntuario,
        form_type: formType,
        form_source: formSource,
        responses,
        nps_score: npsScore,
        metadata: {
          user_agent: req.headers.get("user-agent"),
          ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
          received_at: new Date().toISOString(),
          raw_payload: payload
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting form response:", insertError);
      throw insertError;
    }

    console.log("Form response created:", formResponse?.id);

    // Se deve notificar equipe e lead foi vinculado, criar notificação
    if (template?.notify_team && formResponse?.lead_id) {
      const { data: lead } = await supabase
        .from("crm_leads")
        .select("assigned_to, name")
        .eq("id", formResponse.lead_id)
        .single();
      
      if (lead?.assigned_to) {
        await supabase.from("crm_notifications").insert({
          user_id: lead.assigned_to,
          notification_type: "form_response",
          title: `Nova resposta: ${template.name}`,
          message: `${lead.name || patientName || "Paciente"} respondeu o formulário "${template.name}"`,
          lead_id: formResponse.lead_id,
          metadata: {
            form_response_id: formResponse.id,
            form_type: formType,
            nps_score: npsScore
          }
        });
      }
    }

    // Se deve criar tarefa
    if (template?.create_task && formResponse?.lead_id) {
      const { data: lead } = await supabase
        .from("crm_leads")
        .select("assigned_to")
        .eq("id", formResponse.lead_id)
        .single();
      
      if (lead?.assigned_to) {
        const taskTitle = template.task_template?.title || `Analisar resposta: ${template.name}`;
        const taskDescription = template.task_template?.description || 
          `Paciente respondeu o formulário ${template.name}. Verificar respostas e tomar ações necessárias.`;
        
        const { data: task } = await supabase.from("crm_tasks").insert({
          lead_id: formResponse.lead_id,
          assigned_to: lead.assigned_to,
          created_by: lead.assigned_to,
          title: taskTitle,
          description: taskDescription,
          task_type: "form_review",
          priority: npsScore !== null && npsScore <= 6 ? "high" : "medium",
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }).select().single();

        if (task) {
          await supabase
            .from("form_responses")
            .update({ task_created_id: task.id })
            .eq("id", formResponse.id);
        }
      }
    }

    // Se for NPS detrator, criar alerta urgente
    if (npsScore !== null && npsScore <= 6) {
      console.log("Detractor NPS detected, creating urgent alert");
      
      // Notificar todos os admins
      const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .eq("is_admin", true);
      
      if (admins) {
        for (const admin of admins) {
          await supabase.from("crm_notifications").insert({
            user_id: admin.id,
            notification_type: "nps_detractor",
            title: "⚠️ NPS Detrator Detectado",
            message: `${patientName || "Paciente"} deu nota ${npsScore} no NPS. Ação imediata necessária!`,
            lead_id: formResponse?.lead_id,
            metadata: {
              form_response_id: formResponse?.id,
              nps_score: npsScore,
              feedback: responses.feedback || responses.comentario || null
            }
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Form response received successfully",
        data: {
          id: formResponse?.id,
          form_type: formType,
          lead_id: formResponse?.lead_id,
          nps_score: npsScore,
          nps_category: formResponse?.nps_category
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error processing form webhook:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});