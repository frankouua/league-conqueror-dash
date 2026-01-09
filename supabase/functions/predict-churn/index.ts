import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Lead {
  id: string;
  name: string;
  last_activity_at: string | null;
  is_stale: boolean;
  assigned_to: string | null;
  temperature: string;
  interactions?: Array<{
    sentiment: string | null;
  }>;
}

interface PredictResult {
  leads_processed: number;
  high_risk_leads: number;
  critical_alerts_created: number;
  avg_churn_probability: number;
  details: Array<{
    lead_id: string;
    lead_name: string;
    churn_probability: number;
    help_score: number;
    risk_level: string;
  }>;
}

async function predictChurn(): Promise<PredictResult> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  console.log("[Predict Churn] Starting churn prediction analysis...");
  
  // Fetch all active leads with their interactions
  const { data: leads, error: leadsError } = await supabase
    .from("crm_leads")
    .select(`
      id,
      name,
      last_activity_at,
      is_stale,
      assigned_to,
      temperature,
      created_at,
      estimated_value,
      contract_value
    `)
    .is("won_at", null)
    .is("lost_at", null);

  if (leadsError) {
    console.error("[Predict Churn] Error fetching leads:", leadsError);
    throw leadsError;
  }

  console.log(`[Predict Churn] Found ${leads?.length || 0} active leads to analyze`);

  const result: PredictResult = {
    leads_processed: 0,
    high_risk_leads: 0,
    critical_alerts_created: 0,
    avg_churn_probability: 0,
    details: [],
  };

  let totalChurnProbability = 0;

  for (const lead of leads || []) {
    // Get interactions for this lead
    const { data: interactions } = await supabase
      .from("crm_lead_interactions")
      .select("sentiment")
      .eq("lead_id", lead.id);

    // Calculate days without contact
    const lastActivity = lead.last_activity_at 
      ? new Date(lead.last_activity_at) 
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago if no activity
    
    const daysWithoutContact = Math.floor(
      (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate sentiment metrics
    const numInteractions = interactions?.length || 0;
    const negativeInteractions = interactions?.filter(i => i.sentiment === "negative").length || 0;
    const positiveInteractions = interactions?.filter(i => i.sentiment === "positive").length || 0;
    const negativeSentimentPct = numInteractions > 0 
      ? negativeInteractions / numInteractions 
      : 0;
    const positiveSentimentPct = numInteractions > 0 
      ? positiveInteractions / numInteractions 
      : 0;

    // Calculate churn probability with weighted factors
    let churnProbability = 0;

    // Days without contact factor (max 0.4)
    if (daysWithoutContact > 60) {
      churnProbability += 0.4;
    } else if (daysWithoutContact > 30) {
      churnProbability += 0.25;
    } else if (daysWithoutContact > 14) {
      churnProbability += 0.1;
    }

    // Negative sentiment factor (max 0.25)
    if (negativeSentimentPct > 0.5) {
      churnProbability += 0.25;
    } else if (negativeSentimentPct > 0.3) {
      churnProbability += 0.15;
    }

    // Low engagement factor (max 0.15)
    if (numInteractions < 3) {
      churnProbability += 0.15;
    } else if (numInteractions < 5) {
      churnProbability += 0.08;
    }

    // Stale lead factor (max 0.15)
    if (lead.is_stale) {
      churnProbability += 0.15;
    }

    // Cold temperature factor (max 0.1)
    if (lead.temperature === "cold") {
      churnProbability += 0.1;
    }

    // Limit between 0 and 1
    churnProbability = Math.min(Math.max(churnProbability, 0), 1);

    // Calculate Help Score
    const daysSinceFirstContact = Math.floor(
      (Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    const totalValue = (lead.estimated_value || 0) + (lead.contract_value || 0);

    let helpScore = 0;
    // Days relationship (max 20 points)
    helpScore += Math.min(Math.floor(daysSinceFirstContact / 3), 20);
    // Number of interactions (max 30 points)
    helpScore += Math.min(numInteractions * 3, 30);
    // Positive sentiment (max 25 points)
    helpScore += Math.round(positiveSentimentPct * 100 * 0.25);
    // Value contribution (max 15 points)
    helpScore += Math.min(Math.round(totalValue / 1000), 15);
    // Temperature bonus (max 10 points)
    if (lead.temperature === "hot") helpScore += 10;
    else if (lead.temperature === "warm") helpScore += 5;
    // Limit between 0 and 100
    helpScore = Math.min(Math.max(helpScore, 0), 100);

    // Determine risk level
    const riskLevel = churnProbability >= 0.7 ? "critical" 
      : churnProbability >= 0.5 ? "high" 
      : churnProbability >= 0.3 ? "medium" 
      : "low";

    // Update lead in database
    const { error: updateError } = await supabase
      .from("crm_leads")
      .update({
        ai_churn_probability: churnProbability,
        churn_risk_level: riskLevel,
        churn_analyzed_at: new Date().toISOString(),
        help_score: helpScore,
        help_score_updated_at: new Date().toISOString(),
      })
      .eq("id", lead.id);

    if (updateError) {
      console.error(`[Predict Churn] Error updating lead ${lead.id}:`, updateError);
      continue;
    }

    result.leads_processed++;
    totalChurnProbability += churnProbability;

    if (churnProbability >= 0.5) {
      result.high_risk_leads++;
    }

    // Create alert for critical churn risk
    if (churnProbability >= 0.7 && lead.assigned_to) {
      // Check if alert already exists in last 7 days
      const { data: existingAlerts } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", lead.assigned_to)
        .eq("type", "churn_risk")
        .ilike("message", `%${lead.id}%`)
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (!existingAlerts || existingAlerts.length === 0) {
        const { error: alertError } = await supabase
          .from("notifications")
          .insert({
            user_id: lead.assigned_to,
            title: "⚠️ Alto Risco de Churn",
            message: `O lead "${lead.name}" tem ${(churnProbability * 100).toFixed(0)}% de probabilidade de churn. ${daysWithoutContact} dias sem contato. ID: ${lead.id}`,
            type: "churn_risk",
          });

        if (!alertError) {
          result.critical_alerts_created++;
          console.log(`[Predict Churn] Created churn alert for lead: ${lead.name}`);
        }
      }
    }

    result.details.push({
      lead_id: lead.id,
      lead_name: lead.name,
      churn_probability: churnProbability,
      help_score: helpScore,
      risk_level: riskLevel,
    });
  }

  result.avg_churn_probability = result.leads_processed > 0 
    ? totalChurnProbability / result.leads_processed 
    : 0;

  console.log(`[Predict Churn] Analysis complete. Processed: ${result.leads_processed}, High Risk: ${result.high_risk_leads}, Alerts: ${result.critical_alerts_created}`);

  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const result = await predictChurn();
    
    return new Response(
      JSON.stringify({
        status: "success",
        ...result,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Predict Churn] Error:", errorMessage);
    return new Response(
      JSON.stringify({
        status: "error",
        message: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
