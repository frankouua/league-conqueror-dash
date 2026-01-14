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

    // 1. Executar Cadências
    try {
      const { data, error } = await supabase.functions.invoke('execute-cadences');
      results.cadences = data || { error: error?.message };
    } catch (e: any) {
      errors.push(`Cadências: ${e?.message || 'Erro desconhecido'}`);
    }

    // 2. Verificar SLA
    try {
      const { data, error } = await supabase.functions.invoke('check-sla-alerts');
      results.sla = data || { error: error?.message };
    } catch (e: any) {
      errors.push(`SLA: ${e?.message || 'Erro desconhecido'}`);
    }

    // 3. Verificar Leads Parados
    try {
      const { data, error } = await supabase.functions.invoke('check-stale-leads');
      results.staleLeads = data || { error: error?.message };
    } catch (e: any) {
      errors.push(`Leads Parados: ${e?.message || 'Erro desconhecido'}`);
    }

    // 4. Automação de Checklist Cirúrgico
    try {
      const { data, error } = await supabase.functions.invoke('surgery-checklist-automation');
      results.surgeryChecklist = data || { error: error?.message };
    } catch (e: any) {
      errors.push(`Checklist Cirúrgico: ${e?.message || 'Erro desconhecido'}`);
    }

    // 5. IA Manager Diário
    try {
      const { data, error } = await supabase.functions.invoke('daily-ai-manager');
      results.aiManager = data || { error: error?.message };
    } catch (e: any) {
      errors.push(`IA Manager: ${e?.message || 'Erro desconhecido'}`);
    }

    // 6. Alertas CRM
    try {
      const { data, error } = await supabase.functions.invoke('check-crm-alerts');
      results.crmAlerts = data || { error: error?.message };
    } catch (e: any) {
      errors.push(`Alertas CRM: ${e?.message || 'Erro desconhecido'}`);
    }

    // 7. Previsão de Churn
    try {
      const { data, error } = await supabase.functions.invoke('predict-churn');
      results.churn = data || { error: error?.message };
    } catch (e: any) {
      errors.push(`Churn: ${e?.message || 'Erro desconhecido'}`);
    }

    // 8. Identificar Recorrências
    try {
      const { data, error } = await supabase.functions.invoke('identify-recurrences');
      results.recurrences = data || { error: error?.message };
    } catch (e: any) {
      errors.push(`Recorrências: ${e?.message || 'Erro desconhecido'}`);
    }

    // 9. Alertas de Vendedores
    try {
      const { data, error } = await supabase.functions.invoke('daily-seller-alerts');
      results.sellerAlerts = data || { error: error?.message };
    } catch (e: any) {
      errors.push(`Alertas Vendedores: ${e?.message || 'Erro desconhecido'}`);
    }

    // Registrar execução
    await supabase.from('automation_logs').insert({
      automation_type: 'master_cron',
      status: errors.length === 0 ? 'success' : 'partial',
      results: results,
      errors: errors.length > 0 ? errors : null,
    });

    console.log("🎉 Orquestrador finalizado!", { results, errors });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Automações executadas com sucesso",
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
