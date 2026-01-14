import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Orquestrador Central de Automações CRM
// Executa todas as automações do documento em sequência

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results: Record<string, any> = {};
    const errors: string[] = [];

    console.log("🚀 Iniciando Orquestrador de Automações CRM...");

    // Lista completa de automações conforme documento
    const automations = [
      { name: 'cadences', fn: 'execute-cadences' },
      { name: 'sla', fn: 'check-sla-alerts' },
      { name: 'staleLeads', fn: 'check-stale-leads' },
      { name: 'surgeryChecklist', fn: 'surgery-checklist-automation' },
      { name: 'aiManager', fn: 'daily-ai-manager' },
      { name: 'crmAlerts', fn: 'check-crm-alerts' },
      { name: 'churn', fn: 'predict-churn' },
      { name: 'recurrences', fn: 'identify-recurrences' },
      { name: 'sellerAlerts', fn: 'daily-seller-alerts' },
      { name: 'stageChange', fn: 'stage-change-automation' },
      { name: 'escalation', fn: 'escalation-automation' },
      { name: 'referral', fn: 'referral-automation' },
      { name: 'whatsapp', fn: 'whatsapp-automation' },
      { name: 'nps', fn: 'nps-automation' },
      { name: 'temperature', fn: 'temperature-automation' },
      { name: 'postSale', fn: 'post-sale-automation' },
      { name: 'leadDistribution', fn: 'lead-distribution' },
      { name: 'reactivation', fn: 'reactivation-automation' },
      { name: 'crossSell', fn: 'cross-sell-automation' },
      { name: 'birthday', fn: 'birthday-automation' },
      { name: 'goalAchievement', fn: 'goal-achievement-automation' },
    ];

    // Executar cada automação
    for (const automation of automations) {
      try {
        console.log(`⚙️ Executando: ${automation.name}...`);
        const { data, error } = await supabase.functions.invoke(automation.fn);
        results[automation.name] = data || { error: error?.message };
        
        if (error) {
          errors.push(`${automation.name}: ${error.message}`);
        }
      } catch (e: any) {
        errors.push(`${automation.name}: ${e?.message || 'Erro desconhecido'}`);
        results[automation.name] = { error: e?.message };
      }
    }

    // Registrar execução
    await supabase.from('automation_logs').insert({
      automation_type: 'master_cron',
      status: errors.length === 0 ? 'success' : 'partial',
      results: results,
      errors: errors.length > 0 ? errors : null,
      completed_at: new Date().toISOString(),
    });

    // Atualizar schedule
    await supabase
      .from('automation_schedules')
      .update({ last_run_at: new Date().toISOString() })
      .eq('function_name', 'crm-master-automation');

    console.log("🎉 Orquestrador finalizado!", { 
      total: automations.length,
      success: automations.length - errors.length,
      errors: errors.length 
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Automações executadas com sucesso",
        total_automations: automations.length,
        successful: automations.length - errors.length,
        failed: errors.length,
        results,
        errors: errors.length > 0 ? errors : null,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Erro no orquestrador:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});