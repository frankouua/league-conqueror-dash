import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STALE_HOURS = 48;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting stale leads check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate the cutoff time (48 hours ago)
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - STALE_HOURS);
    const cutoffISO = cutoffTime.toISOString();

    console.log(`Checking for leads without contact since: ${cutoffISO}`);

    // Find leads that are stale (active status and no recent contact)
    const { data: staleLeads, error: leadsError } = await supabase
      .from("referral_leads")
      .select("id, team_id, referred_name, referrer_name, assigned_to, status, last_contact_at, created_at")
      .in("status", ["nova", "em_contato"])
      .or(`last_contact_at.is.null,last_contact_at.lt.${cutoffISO}`);

    if (leadsError) {
      console.error("Error fetching stale leads:", leadsError);
      throw leadsError;
    }

    console.log(`Found ${staleLeads?.length || 0} potentially stale leads`);

    if (!staleLeads || staleLeads.length === 0) {
      return new Response(
        JSON.stringify({ message: "No stale leads found", count: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // For each stale lead, check if notification already exists (to avoid duplicates)
    let notificationsCreated = 0;

    for (const lead of staleLeads) {
      // Check if we already sent a notification for this lead in the last 24 hours
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);

      const { data: existingNotification } = await supabase
        .from("notifications")
        .select("id")
        .eq("type", "stale_lead")
        .like("message", `%${lead.id}%`)
        .gte("created_at", oneDayAgo.toISOString())
        .maybeSingle();

      if (existingNotification) {
        console.log(`Notification already exists for lead ${lead.id}, skipping`);
        continue;
      }

      // Calculate hours since last contact or creation
      const lastActivity = lead.last_contact_at || lead.created_at;
      const hoursSinceActivity = Math.floor(
        (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60)
      );

      // Create notification
      const notification = {
        team_id: lead.team_id,
        user_id: lead.assigned_to, // Will be null if no one assigned
        type: "stale_lead",
        title: "⚠️ Indicação sem contato",
        message: `A indicação de ${lead.referred_name} (por ${lead.referrer_name}) está há ${hoursSinceActivity}h sem contato. [ID: ${lead.id}]`,
      };

      const { error: notifError } = await supabase
        .from("notifications")
        .insert(notification);

      if (notifError) {
        console.error(`Error creating notification for lead ${lead.id}:`, notifError);
      } else {
        notificationsCreated++;
        console.log(`Created notification for lead ${lead.id}`);
      }
    }

    console.log(`Stale leads check complete. Created ${notificationsCreated} notifications.`);

    return new Response(
      JSON.stringify({ 
        message: "Stale leads check complete", 
        staleLeadsFound: staleLeads.length,
        notificationsCreated 
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
