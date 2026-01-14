import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Orquestrador Central de Automações CRM
// Executa automações críticas de forma mais eficiente

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results: Record<string, any> = {};
    const errors: string[] = [];
    const skipped: string[] = [];

    console.log("🚀 Iniciando Orquestrador de Automações CRM...");

    // Automações prioritárias (executam sempre)
    const criticalAutomations = [
      { name: 'sla', fn: 'check-sla-alerts' },
      { name: 'staleLeads', fn: 'check-stale-leads' },
      { name: 'crmAlerts', fn: 'check-crm-alerts' },
    ];

    // Automações secundárias (executam se houver tempo)
    const secondaryAutomations = [
      { name: 'cadences', fn: 'execute-cadences' },
      { name: 'surgeryChecklist', fn: 'surgery-checklist-automation' },
      { name: 'temperature', fn: 'temperature-automation' },
      { name: 'recurrences', fn: 'identify-recurrences' },
      { name: 'postSale', fn: 'post-sale-automation' },
    ];

    // Automações terciárias (só quando necessário)
    const tertiaryAutomations = [
      { name: 'referral', fn: 'referral-automation' },
      { name: 'birthday', fn: 'birthday-automation' },
      { name: 'sellerAlerts', fn: 'daily-seller-alerts' },
    ];

    // Helper function com timeout individual
    const executeWithTimeout = async (automation: { name: string; fn: string }, timeoutMs: number = 8000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      try {
        console.log(`⚙️ Executando: ${automation.name}...`);
        const { data, error } = await supabase.functions.invoke(automation.fn);
        clearTimeout(timeoutId);
        
        if (error) {
          errors.push(`${automation.name}: ${error.message}`);
          results[automation.name] = { error: error.message };
        } else {
          results[automation.name] = data || { success: true };
        }
      } catch (e: any) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') {
          skipped.push(`${automation.name}: timeout`);
          results[automation.name] = { skipped: 'timeout' };
        } else {
          errors.push(`${automation.name}: ${e?.message || 'Erro desconhecido'}`);
          results[automation.name] = { error: e?.message };
        }
      }
    };

    // Executar automações críticas primeiro
    for (const automation of criticalAutomations) {
      // Check tempo restante (máx 25s total para evitar timeout de edge function)
      if (Date.now() - startTime > 20000) {
        skipped.push(`${automation.name}: tempo limite global`);
        continue;
      }
      await executeWithTimeout(automation, 6000);
    }

    // Executar automações secundárias se houver tempo
    for (const automation of secondaryAutomations) {
      if (Date.now() - startTime > 22000) {
        skipped.push(`${automation.name}: tempo limite global`);
        continue;
      }
      await executeWithTimeout(automation, 4000);
    }

    // Executar automações terciárias apenas se sobrar tempo
    for (const automation of tertiaryAutomations) {
      if (Date.now() - startTime > 24000) {
        skipped.push(`${automation.name}: tempo limite global`);
        continue;
      }
      await executeWithTimeout(automation, 3000);
    }

    const totalExecuted = criticalAutomations.length + secondaryAutomations.length + tertiaryAutomations.length;
    const successCount = totalExecuted - errors.length - skipped.length;
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    // Registrar execução
    await supabase.from('automation_logs').insert({
      automation_type: 'master_cron',
      status: errors.length === 0 ? 'success' : (errors.length < 3 ? 'partial' : 'error'),
      results: results,
      errors: errors.length > 0 ? errors : null,
      completed_at: new Date().toISOString(),
    });

    // Atualizar schedule
    await supabase
      .from('automation_schedules')
      .update({ last_run_at: new Date().toISOString() })
      .eq('function_name', 'crm-master-automation');

    console.log(`🎉 Orquestrador finalizado em ${duration}s!`, { 
      total: totalExecuted,
      success: successCount,
      errors: errors.length,
      skipped: skipped.length
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Automações executadas",
        total_automations: totalExecuted,
        successful: successCount,
        failed: errors.length,
        skipped: skipped.length,
        duration_seconds: parseFloat(duration),
        results,
        errors: errors.length > 0 ? errors : null,
        skipped_list: skipped.length > 0 ? skipped : null,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Erro no orquestrador:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        duration_seconds: ((Date.now() - startTime) / 1000).toFixed(1)
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
