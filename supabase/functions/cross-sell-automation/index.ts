import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Automação de Cross-Sell/Upsell
// Conforme documento: Identificar oportunidades de vendas adicionais

// Mapa de procedimentos complementares
const crossSellMap: Record<string, string[]> = {
  'botox': ['preenchimento', 'skinbooster', 'bioestimulador'],
  'preenchimento': ['botox', 'fios_pdo', 'bioestimulador'],
  'harmonizacao_facial': ['botox', 'preenchimento', 'skinbooster', 'lipo_papada'],
  'lipo': ['abdominoplastia', 'renuvion', 'bodytite'],
  'abdominoplastia': ['lipo', 'mamoplastia'],
  'mamoplastia': ['abdominoplastia', 'lipo'],
  'rinoplastia': ['bichectomia', 'mentoplastia'],
  'bichectomia': ['botox', 'preenchimento', 'rinoplastia'],
  'blefaroplastia': ['botox', 'preenchimento', 'lifting_facial'],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("💎 Iniciando automação de cross-sell...");

    // Buscar clientes que realizaram procedimentos nos últimos 6 meses
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();

    const { data: recentClients, error: clientsError } = await supabase
      .from('crm_leads')
      .select(`
        id, name, phone, email, assigned_to, team_id,
        last_procedure_name, last_procedure_date, won_at,
        interested_procedures, contract_value
      `)
      .not('won_at', 'is', null)
      .gte('won_at', sixMonthsAgo);

    if (clientsError) throw clientsError;

    console.log(`📋 ${recentClients?.length || 0} clientes recentes para analisar`);

    const opportunities: any[] = [];
    const notifications: any[] = [];

    for (const client of recentClients || []) {
      // Verificar se já tem oportunidade de cross-sell ativa
      const { data: existingOpp } = await supabase
        .from('crm_cross_sell_opportunities')
        .select('id')
        .eq('lead_id', client.id)
        .eq('status', 'pending')
        .limit(1);

      if (existingOpp && existingOpp.length > 0) continue;

      // Identificar procedimento realizado
      const procedure = (client.last_procedure_name || 
        client.interested_procedures?.[0] || '').toLowerCase().replace(/\s+/g, '_');

      // Buscar procedimentos complementares
      const complementary = crossSellMap[procedure] || [];
      
      if (complementary.length === 0) continue;

      // Calcular tempo desde o procedimento
      const procedureDate = client.last_procedure_date || client.won_at;
      const daysSinceProcedure = Math.floor(
        (Date.now() - new Date(procedureDate).getTime()) / (24 * 60 * 60 * 1000)
      );

      // Só sugerir após período de recuperação (30 dias)
      if (daysSinceProcedure < 30) continue;

      // Criar oportunidade para o procedimento mais relevante
      const suggestedProcedure = complementary[0];
      
      const { error: insertError } = await supabase
        .from('crm_cross_sell_opportunities')
        .insert({
          lead_id: client.id,
          source_procedure: procedure,
          suggested_procedure: suggestedProcedure,
          suggestion_reason: `Cliente realizou ${procedure} há ${daysSinceProcedure} dias`,
          priority: daysSinceProcedure > 90 ? 'high' : 'medium',
          assigned_to: client.assigned_to,
          status: 'pending',
        });

      if (!insertError) {
        opportunities.push({
          lead_id: client.id,
          client_name: client.name,
          source_procedure: procedure,
          suggested: suggestedProcedure,
        });

        // Notificar vendedor
        if (client.assigned_to) {
          notifications.push({
            user_id: client.assigned_to,
            title: '💎 Oportunidade de Cross-Sell',
            message: `${client.name} pode ter interesse em ${suggestedProcedure.replace(/_/g, ' ')}`,
            type: 'cross_sell_opportunity',
          });
        }

        // Criar tarefa de follow-up
        await supabase.from('crm_tasks').insert({
          lead_id: client.id,
          title: `Cross-sell: ${suggestedProcedure.replace(/_/g, ' ')}`,
          description: `Oportunidade identificada. Cliente fez ${procedure} há ${daysSinceProcedure} dias.`,
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'medium',
          assigned_to: client.assigned_to,
          status: 'pending',
        });
      }
    }

    // Inserir notificações
    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }

    // Log da automação
    await supabase.from('automation_logs').insert({
      automation_type: 'cross_sell',
      status: 'success',
      results: { 
        analyzed: recentClients?.length || 0,
        opportunities_created: opportunities.length,
      },
    });

    console.log(`✅ Cross-sell: ${opportunities.length} oportunidades identificadas`);

    return new Response(
      JSON.stringify({
        success: true,
        analyzed: recentClients?.length || 0,
        opportunities_created: opportunities.length,
        opportunities,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Erro no cross-sell:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
