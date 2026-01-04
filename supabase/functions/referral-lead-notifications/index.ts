import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeadNotificationPayload {
  event_type: "new_lead" | "status_change" | "assignment_change" | "contact_reminder";
  lead_id: string;
  lead_name: string;
  referrer_name: string;
  team_id: string;
  old_status?: string;
  new_status?: string;
  assigned_to?: string;
  registered_by?: string;
}

// Status labels for notifications
const STATUS_LABELS: Record<string, string> = {
  nova: "Nova",
  em_contato: "Em Contato",
  sem_interesse: "Sem Interesse",
  agendou: "Agendou Consulta",
  consultou: "Consultou",
  operou: "Operou",
  pos_venda: "Pós-Venda",
  relacionamento: "Relacionamento",
  ganho: "Ganho",
  perdido: "Perdido",
};

// Important status changes that deserve special notifications
const MILESTONE_STATUSES = ["agendou", "consultou", "operou", "ganho"];
const ALERT_STATUSES = ["sem_interesse", "perdido"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: LeadNotificationPayload = await req.json();
    console.log("Received payload:", payload);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const notifications: Array<{
      team_id?: string;
      user_id?: string;
      type: string;
      title: string;
      message: string;
    }> = [];

    // Fetch team info
    const { data: teamData } = await supabase
      .from("teams")
      .select("name")
      .eq("id", payload.team_id)
      .single();

    const teamName = teamData?.name || "Equipe";

    // Fetch all team members for team-wide notifications
    const { data: teamMembers } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .eq("team_id", payload.team_id);

    switch (payload.event_type) {
      case "new_lead": {
        // Notify all team members about new lead
        const registeredByName = await getProfileName(supabase, payload.registered_by);
        
        // Notify the whole team
        notifications.push({
          team_id: payload.team_id,
          type: "new_referral",
          title: "🆕 Nova Indicação Recebida!",
          message: `${payload.lead_name} foi indicado(a) por ${payload.referrer_name}. Registrado por ${registeredByName}. CAC Zero - entre em contato o mais rápido possível! [LEAD_ID:${payload.lead_id}]`,
        });

        // If someone is assigned, notify them specifically
        if (payload.assigned_to) {
          notifications.push({
            user_id: payload.assigned_to,
            type: "lead_assigned",
            title: "📋 Indicação atribuída a você",
            message: `Você é responsável pela indicação de ${payload.lead_name} (indicado por ${payload.referrer_name}). Entre em contato agora! [LEAD_ID:${payload.lead_id}]`,
          });
        }
        break;
      }

      case "status_change": {
        const oldLabel = STATUS_LABELS[payload.old_status || ""] || payload.old_status;
        const newLabel = STATUS_LABELS[payload.new_status || ""] || payload.new_status;

        // Check if it's a milestone status (positive progress)
        if (payload.new_status && MILESTONE_STATUSES.includes(payload.new_status)) {
          let emoji = "📈";
          let celebrationText = "";

          switch (payload.new_status) {
            case "agendou":
              emoji = "📅";
              celebrationText = "Consulta agendada!";
              break;
            case "consultou":
              emoji = "🏥";
              celebrationText = "Consulta realizada!";
              break;
            case "operou":
              emoji = "🎉";
              celebrationText = "Cirurgia realizada! Ponto computado para a equipe!";
              break;
            case "ganho":
              emoji = "🏆";
              celebrationText = "Lead conquistado! Parabéns!";
              break;
          }

          // Notify whole team about milestones
          notifications.push({
            team_id: payload.team_id,
            type: "lead_milestone",
            title: `${emoji} ${celebrationText}`,
            message: `${payload.lead_name} (indicação de ${payload.referrer_name}) avançou: ${oldLabel} → ${newLabel}. [LEAD_ID:${payload.lead_id}]`,
          });
        }

        // Alert for negative statuses
        if (payload.new_status && ALERT_STATUSES.includes(payload.new_status)) {
          notifications.push({
            team_id: payload.team_id,
            type: "lead_alert",
            title: `⚠️ Indicação ${newLabel}`,
            message: `${payload.lead_name} (indicação de ${payload.referrer_name}) mudou para ${newLabel}. Analisar motivo e tentar recuperar. [LEAD_ID:${payload.lead_id}]`,
          });
        }

        // Always notify the assigned person about status changes
        if (payload.assigned_to && payload.new_status !== payload.old_status) {
          notifications.push({
            user_id: payload.assigned_to,
            type: "lead_status_update",
            title: `📊 Status atualizado: ${payload.lead_name}`,
            message: `Mudança de ${oldLabel} para ${newLabel}. [LEAD_ID:${payload.lead_id}]`,
          });
        }
        break;
      }

      case "assignment_change": {
        if (payload.assigned_to) {
          notifications.push({
            user_id: payload.assigned_to,
            type: "lead_assigned",
            title: "📋 Nova indicação atribuída a você",
            message: `Você agora é responsável por ${payload.lead_name} (indicado por ${payload.referrer_name}). Entre em contato! [LEAD_ID:${payload.lead_id}]`,
          });
        }
        break;
      }

      case "contact_reminder": {
        // Reminder to contact the lead (can be triggered by scheduler)
        if (payload.assigned_to) {
          notifications.push({
            user_id: payload.assigned_to,
            type: "lead_reminder",
            title: "⏰ Lembrete: Entrar em contato",
            message: `Não esqueça de entrar em contato com ${payload.lead_name} (indicação de ${payload.referrer_name}). [LEAD_ID:${payload.lead_id}]`,
          });
        } else {
          // Notify whole team if no one is assigned
          notifications.push({
            team_id: payload.team_id,
            type: "lead_reminder",
            title: "⏰ Indicação sem responsável",
            message: `${payload.lead_name} (indicação de ${payload.referrer_name}) ainda não tem responsável e precisa de contato. [LEAD_ID:${payload.lead_id}]`,
          });
        }
        break;
      }
    }

    // Insert all notifications
    let createdCount = 0;
    for (const notif of notifications) {
      const { error } = await supabase.from("notifications").insert(notif);
      if (error) {
        console.error("Error creating notification:", error);
      } else {
        createdCount++;
      }
    }

    console.log(`Created ${createdCount} notifications`);

    return new Response(
      JSON.stringify({ success: true, notificationsCreated: createdCount }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in referral-lead-notifications:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

async function getProfileName(supabase: any, userId?: string): Promise<string> {
  if (!userId) return "Desconhecido";
  
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", userId)
    .single();
  
  return data?.full_name?.split(" ")[0] || "Usuário";
}
