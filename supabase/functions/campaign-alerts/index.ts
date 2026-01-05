import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Campaign {
  id: string;
  name: string;
  end_date: string;
  alert_days_before: number | null;
  goal_value: number | null;
  goal_metric: string | null;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting campaign alerts check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    // Fetch active campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("is_active", true)
      .eq("is_template", false)
      .gte("end_date", todayStr);

    if (campaignsError) {
      console.error("Error fetching campaigns:", campaignsError);
      throw campaignsError;
    }

    console.log(`Found ${campaigns?.length || 0} active campaigns`);

    const alertsCreated: string[] = [];

    for (const campaign of campaigns || []) {
      const endDate = new Date(campaign.end_date);
      endDate.setHours(0, 0, 0, 0);
      const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const alertDays = campaign.alert_days_before || 3;

      console.log(`Campaign "${campaign.name}": ${daysRemaining} days remaining, alert threshold: ${alertDays}`);

      // Check if we should send a deadline alert
      if (daysRemaining <= alertDays && daysRemaining >= 0) {
        // Check if we already sent this alert today
        const { data: existingAlert } = await supabase
          .from("campaign_alerts")
          .select("id")
          .eq("campaign_id", campaign.id)
          .eq("alert_type", "deadline_approaching")
          .gte("sent_at", todayStr)
          .limit(1);

        if (!existingAlert || existingAlert.length === 0) {
          console.log(`Creating deadline alert for "${campaign.name}"`);

          // Create campaign alert record
          await supabase.from("campaign_alerts").insert({
            campaign_id: campaign.id,
            alert_type: "deadline_approaching",
            message: `A campanha "${campaign.name}" termina em ${daysRemaining} dia(s)!`,
          });

          // Get all active users to notify
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id");

          // Create notifications for all users
          if (profiles && profiles.length > 0) {
            const notifications = profiles.map((profile) => ({
              user_id: profile.user_id,
              title: "⏰ Prazo de Campanha",
              message: daysRemaining === 0 
                ? `Último dia da campanha "${campaign.name}"! Corra para completar suas ações.`
                : `A campanha "${campaign.name}" termina em ${daysRemaining} dia(s). Verifique seu progresso!`,
              type: "campaign_deadline",
            }));

            const { error: notifError } = await supabase
              .from("notifications")
              .insert(notifications);

            if (notifError) {
              console.error("Error creating notifications:", notifError);
            } else {
              console.log(`Created ${notifications.length} notifications for deadline alert`);
              alertsCreated.push(`Deadline: ${campaign.name}`);
            }
          }
        }
      }

      // Check campaign start alert (when campaign starts today)
      const startDate = new Date(campaign.start_date);
      startDate.setHours(0, 0, 0, 0);
      if (startDate.getTime() === today.getTime()) {
        const { data: existingStartAlert } = await supabase
          .from("campaign_alerts")
          .select("id")
          .eq("campaign_id", campaign.id)
          .eq("alert_type", "campaign_started")
          .limit(1);

        if (!existingStartAlert || existingStartAlert.length === 0) {
          console.log(`Creating start alert for "${campaign.name}"`);

          await supabase.from("campaign_alerts").insert({
            campaign_id: campaign.id,
            alert_type: "campaign_started",
            message: `A campanha "${campaign.name}" começou hoje!`,
          });

          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id");

          if (profiles && profiles.length > 0) {
            const notifications = profiles.map((profile) => ({
              user_id: profile.user_id,
              title: "🚀 Nova Campanha!",
              message: `A campanha "${campaign.name}" começou hoje! Confira o checklist de ações.`,
              type: "campaign_started",
            }));

            await supabase.from("notifications").insert(notifications);
            alertsCreated.push(`Started: ${campaign.name}`);
          }
        }
      }

      // Check for low progress (if we have goal tracking)
      if (campaign.goal_value && daysRemaining > 0) {
        // Get campaign progress
        const { data: actions } = await supabase
          .from("campaign_actions")
          .select("id")
          .eq("campaign_id", campaign.id);

        if (actions && actions.length > 0) {
          const totalActions = actions.length;
          
          // Get completion progress
          const { data: progress } = await supabase
            .from("campaign_checklist_progress")
            .select("action_id, user_id")
            .eq("campaign_id", campaign.id)
            .eq("completed", true);

          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id");

          if (profiles && profiles.length > 0) {
            const totalPossible = totalActions * profiles.length;
            const completedCount = progress?.length || 0;
            const progressPercent = totalPossible > 0 ? (completedCount / totalPossible) * 100 : 0;
            
            // Calculate expected progress based on time elapsed
            const startDate = new Date(campaign.start_date);
            const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            const elapsedDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            const expectedProgress = totalDays > 0 ? (elapsedDays / totalDays) * 100 : 0;

            // If progress is significantly behind (less than 50% of expected), alert admins
            if (progressPercent < expectedProgress * 0.5 && elapsedDays >= 3) {
              // Only send once per day
              const { data: existingBehindAlert } = await supabase
                .from("campaign_alerts")
                .select("id")
                .eq("campaign_id", campaign.id)
                .eq("alert_type", "goal_behind")
                .gte("sent_at", todayStr)
                .limit(1);

              if (!existingBehindAlert || existingBehindAlert.length === 0) {
                console.log(`Creating behind alert for "${campaign.name}" - Progress: ${progressPercent.toFixed(1)}%, Expected: ${expectedProgress.toFixed(1)}%`);

                await supabase.from("campaign_alerts").insert({
                  campaign_id: campaign.id,
                  alert_type: "goal_behind",
                  message: `A campanha "${campaign.name}" está com progresso abaixo do esperado (${progressPercent.toFixed(0)}%)`,
                });

                // Notify only admins about low progress
                const { data: admins } = await supabase
                  .from("user_roles")
                  .select("user_id")
                  .eq("role", "admin");

                if (admins && admins.length > 0) {
                  const adminNotifications = admins.map((admin) => ({
                    user_id: admin.user_id,
                    title: "⚠️ Campanha Atrasada",
                    message: `A campanha "${campaign.name}" está com apenas ${progressPercent.toFixed(0)}% de progresso. Esperado: ${expectedProgress.toFixed(0)}%.`,
                    type: "campaign_behind",
                  }));

                  await supabase.from("notifications").insert(adminNotifications);
                  alertsCreated.push(`Behind: ${campaign.name}`);
                }
              }
            }
          }
        }
      }
    }

    console.log(`Campaign alerts check complete. Alerts created: ${alertsCreated.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${campaigns?.length || 0} campaigns`,
        alertsCreated,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in campaign-alerts function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
