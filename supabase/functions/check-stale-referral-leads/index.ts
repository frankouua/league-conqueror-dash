import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting check for stale referral leads...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate 24 hours ago
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    const twentyFourHoursAgoISO = twentyFourHoursAgo.toISOString();

    // Calculate 2 hours ago (for urgent reminders)
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
    const twoHoursAgoISO = twoHoursAgo.toISOString();

    // Fetch leads that are "nova" (new) and haven't been contacted
    // OR leads that are "em_contato" but stale
    const { data: staleLeads, error: leadsError } = await supabase
      .from("referral_leads")
      .select("id, referred_name, referrer_name, team_id, assigned_to, status, created_at, last_contact_at, updated_at")
      .in("status", ["nova", "em_contato", "agendou"])
      .or(`last_contact_at.is.null,last_contact_at.lt.${twentyFourHoursAgoISO}`);

    if (leadsError) {
      console.error("Error fetching stale leads:", leadsError);
      throw leadsError;
    }

    console.log(`Found ${staleLeads?.length || 0} potentially stale leads`);

    const notifications: Array<{
      team_id?: string;
      user_id?: string;
      type: string;
      title: string;
      message: string;
    }> = [];

    const now = new Date();

    for (const lead of staleLeads || []) {
      // Determine how long since last contact
      const lastContact = lead.last_contact_at 
        ? new Date(lead.last_contact_at) 
        : new Date(lead.created_at);
      
      const hoursSinceContact = (now.getTime() - lastContact.getTime()) / (1000 * 60 * 60);

      // Skip if less than 2 hours (for new leads, give them time)
      if (lead.status === "nova" && hoursSinceContact < 2) {
        continue;
      }

      // For "em_contato" or "agendou", check if > 24h
      if ((lead.status === "em_contato" || lead.status === "agendou") && hoursSinceContact < 24) {
        continue;
      }

      // Check if we already sent a reminder recently (avoid spam)
      const { data: recentNotifications } = await supabase
        .from("notifications")
        .select("id")
        .eq("type", hoursSinceContact > 24 ? "lead_reminder_24h" : "lead_reminder_2h")
        .ilike("message", `%${lead.id}%`)
        .gte("created_at", new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString()) // 4 hours ago
        .limit(1);

      if (recentNotifications && recentNotifications.length > 0) {
        console.log(`Skipping lead ${lead.id} - reminder already sent recently`);
        continue;
      }

      // Determine notification type and urgency
      let notifType = "lead_reminder";
      let emoji = "⏰";
      let urgency = "";

      if (hoursSinceContact >= 48) {
        notifType = "lead_reminder_24h";
        emoji = "🚨";
        urgency = "URGENTE: ";
      } else if (hoursSinceContact >= 24) {
        notifType = "lead_reminder_24h";
        emoji = "⚠️";
        urgency = "";
      } else if (hoursSinceContact >= 2 && lead.status === "nova") {
        notifType = "lead_reminder_2h";
        emoji = "🔔";
        urgency = "";
      }

      const hoursText = hoursSinceContact >= 24 
        ? `${Math.floor(hoursSinceContact / 24)} dia(s)`
        : `${Math.floor(hoursSinceContact)} horas`;

      const statusLabels: Record<string, string> = {
        nova: "Nova",
        em_contato: "Em Contato",
        agendou: "Agendou"
      };
      const statusLabel = statusLabels[lead.status as string] || lead.status;

      if (lead.assigned_to) {
        // Notify the assigned person
        notifications.push({
          user_id: lead.assigned_to,
          type: notifType,
          title: `${emoji} ${urgency}Lead sem contato há ${hoursText}`,
          message: `${lead.referred_name} (indicação de ${lead.referrer_name}) está no status "${statusLabel}" sem contato há ${hoursText}. Entre em contato agora! [LEAD_ID:${lead.id}]`,
        });
      } else {
        // Notify the whole team
        notifications.push({
          team_id: lead.team_id,
          type: notifType,
          title: `${emoji} ${urgency}Lead sem responsável há ${hoursText}`,
          message: `${lead.referred_name} (indicação de ${lead.referrer_name}) está no status "${statusLabel}" SEM RESPONSÁVEL há ${hoursText}. Alguém precisa assumir! [LEAD_ID:${lead.id}]`,
        });
      }
    }

    // Insert notifications
    let createdCount = 0;
    for (const notif of notifications) {
      const { error } = await supabase.from("notifications").insert(notif);
      if (error) {
        console.error("Error creating notification:", error);
      } else {
        createdCount++;
      }
    }

    console.log(`Created ${createdCount} reminder notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        staleLeadsFound: staleLeads?.length || 0,
        notificationsSent: createdCount 
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );

  } catch (error: any) {
    console.error("Error in check-stale-referral-leads:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  }
});
