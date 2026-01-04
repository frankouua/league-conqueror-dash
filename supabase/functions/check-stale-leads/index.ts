import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configurable intervals for stale lead checks
const INTERVALS = {
  "2h": { hours: 2, priority: "urgent", emoji: "🚨" },
  "24h": { hours: 24, priority: "high", emoji: "⚠️" },
  "48h": { hours: 48, priority: "critical", emoji: "🔴" },
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get interval from request body or default to all intervals
    let checkInterval = "all";
    try {
      const body = await req.json();
      checkInterval = body.interval || "all";
    } catch {
      // No body or invalid JSON, use default
    }

    console.log(`Starting stale leads check for interval: ${checkInterval}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let notificationsCreated = 0;
    const results: Record<string, { found: number; notified: number }> = {};

    // Determine which intervals to check
    const intervalsToCheck = checkInterval === "all" 
      ? Object.keys(INTERVALS) 
      : [checkInterval];

    for (const intervalKey of intervalsToCheck) {
      const interval = INTERVALS[intervalKey as keyof typeof INTERVALS];
      if (!interval) continue;

      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - interval.hours);
      const cutoffISO = cutoffTime.toISOString();

      // For non-48h checks, we also need a minimum time to avoid double-notifying
      // e.g., for 2h check, only check leads between 2h and 3h old
      const maxTime = new Date();
      maxTime.setHours(maxTime.getHours() - (interval.hours + 1));
      const maxTimeISO = maxTime.toISOString();

      console.log(`Checking ${intervalKey} interval: leads created between ${maxTimeISO} and ${cutoffISO}`);

      // Find leads that are stale for this specific interval
      let query = supabase
        .from("referral_leads")
        .select("id, team_id, referred_name, referrer_name, assigned_to, status, last_contact_at, created_at")
        .in("status", ["nova", "em_contato"])
        .or(`last_contact_at.is.null,last_contact_at.lt.${cutoffISO}`);

      // For specific interval checks (not 48h), only get leads in that time window
      if (intervalKey !== "48h") {
        query = query
          .lt("created_at", cutoffISO)
          .gte("created_at", maxTimeISO);
      } else {
        // For 48h, get all leads older than 48h
        query = query.lt("created_at", cutoffISO);
      }

      const { data: staleLeads, error: leadsError } = await query;

      if (leadsError) {
        console.error(`Error fetching stale leads for ${intervalKey}:`, leadsError);
        continue;
      }

      results[intervalKey] = { found: staleLeads?.length || 0, notified: 0 };
      console.log(`Found ${staleLeads?.length || 0} leads for ${intervalKey} check`);

      if (!staleLeads || staleLeads.length === 0) continue;

      for (const lead of staleLeads) {
        // Check if we already sent a notification for this lead with this interval
        const notificationWindow = new Date();
        notificationWindow.setHours(notificationWindow.getHours() - interval.hours);

        const { data: existingNotification } = await supabase
          .from("notifications")
          .select("id")
          .eq("type", intervalKey === "2h" ? "lead_reminder_2h" : intervalKey === "24h" ? "lead_reminder_24h" : "stale_lead")
          .like("message", `%${lead.id}%`)
          .gte("created_at", notificationWindow.toISOString())
          .maybeSingle();

        if (existingNotification) {
          console.log(`Notification already exists for lead ${lead.id} at ${intervalKey}, skipping`);
          continue;
        }

        // Calculate hours since last contact or creation
        const lastActivity = lead.last_contact_at || lead.created_at;
        const hoursSinceActivity = Math.floor(
          (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60)
        );

        let notificationType: string;
        let title: string;
        let urgencyText: string;

        switch (intervalKey) {
          case "2h":
            notificationType = "lead_reminder_2h";
            title = "🚨 URGENTE: Indicação aguardando contato";
            urgencyText = `Já se passaram ${hoursSinceActivity}h! Entre em contato AGORA.`;
            break;
          case "24h":
            notificationType = "lead_reminder_24h";
            title = "⚠️ Lembrete: Indicação sem contato há 24h";
            urgencyText = `Lead esfriando! ${hoursSinceActivity}h sem contato.`;
            break;
          default:
            notificationType = "stale_lead";
            title = "🔴 CRÍTICO: Indicação parada há 48h+";
            urgencyText = `Risco de perder o lead! ${hoursSinceActivity}h sem resposta.`;
        }

        // Create notification for assigned user or team
        const notification = {
          team_id: lead.assigned_to ? null : lead.team_id,
          user_id: lead.assigned_to,
          type: notificationType,
          title,
          message: `${urgencyText} ${lead.referred_name} (indicado por ${lead.referrer_name}). CAC Zero - não perca essa oportunidade! [LEAD_ID:${lead.id}]`,
        };

        const { error: notifError } = await supabase
          .from("notifications")
          .insert(notification);

        if (notifError) {
          console.error(`Error creating notification for lead ${lead.id}:`, notifError);
        } else {
          results[intervalKey].notified++;
          notificationsCreated++;
          console.log(`Created ${intervalKey} notification for lead ${lead.id}`);
        }
      }
    }

    console.log(`Stale leads check complete. Created ${notificationsCreated} notifications.`, results);

    return new Response(
      JSON.stringify({ 
        message: "Stale leads check complete", 
        interval: checkInterval,
        results,
        totalNotificationsCreated: notificationsCreated 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in check-stale-leads function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
