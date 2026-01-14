import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Distribuição Automática de Leads
// Conforme documento: Round-robin com balanceamento de carga

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const { team_id, pipeline_id } = body;

    console.log("📊 Iniciando distribuição de leads...");

    // Buscar leads não atribuídos
    let query = supabase
      .from('crm_leads')
      .select('id, name, pipeline_id, team_id, estimated_value, lead_score')
      .is('assigned_to', null)
      .is('lost_at', null);

    if (team_id) query = query.eq('team_id', team_id);
    if (pipeline_id) query = query.eq('pipeline_id', pipeline_id);

    const { data: unassignedLeads, error: leadsError } = await query.limit(50);

    if (leadsError) throw leadsError;

    console.log(`📋 ${unassignedLeads?.length || 0} leads para distribuir`);

    if (!unassignedLeads || unassignedLeads.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Nenhum lead para distribuir" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar vendedores disponíveis por equipe
    const teamIds = [...new Set(unassignedLeads.map(l => l.team_id).filter(Boolean))];
    
    const { data: sellers } = await supabase
      .from('profiles')
      .select('id, full_name, team_id, position')
      .in('team_id', teamIds)
      .in('position', ['SDR', 'Pré-Vendas', 'Closer', 'Comercial 1', 'Comercial 2', 'Comercial 3'])
      .eq('is_approved', true);

    if (!sellers || sellers.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "Nenhum vendedor disponível" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Contar leads ativos por vendedor para balanceamento
    const { data: leadCounts } = await supabase
      .from('crm_leads')
      .select('assigned_to')
      .is('lost_at', null)
      .is('won_at', null)
      .not('assigned_to', 'is', null);

    const sellerLoadMap: Record<string, number> = {};
    for (const lc of leadCounts || []) {
      if (lc.assigned_to) {
        sellerLoadMap[lc.assigned_to] = (sellerLoadMap[lc.assigned_to] || 0) + 1;
      }
    }

    // Agrupar vendedores por equipe
    const sellersByTeam: Record<string, typeof sellers> = {};
    for (const seller of sellers) {
      if (!sellersByTeam[seller.team_id]) {
        sellersByTeam[seller.team_id] = [];
      }
      sellersByTeam[seller.team_id].push(seller);
    }

    // Índice round-robin por equipe
    const roundRobinIndex: Record<string, number> = {};

    const distributions: any[] = [];
    const notifications: any[] = [];

    for (const lead of unassignedLeads) {
      const teamSellers = sellersByTeam[lead.team_id] || [];
      if (teamSellers.length === 0) continue;

      // Ordenar por carga (menos leads primeiro)
      teamSellers.sort((a, b) => 
        (sellerLoadMap[a.id] || 0) - (sellerLoadMap[b.id] || 0)
      );

      // Round-robin com balanceamento
      if (!roundRobinIndex[lead.team_id]) {
        roundRobinIndex[lead.team_id] = 0;
      }

      const selectedSeller = teamSellers[roundRobinIndex[lead.team_id] % teamSellers.length];
      roundRobinIndex[lead.team_id]++;

      // Atribuir lead
      const { error: updateError } = await supabase
        .from('crm_leads')
        .update({
          assigned_to: selectedSeller.id,
          first_contact_at: new Date().toISOString(),
        })
        .eq('id', lead.id);

      if (!updateError) {
        distributions.push({
          lead_id: lead.id,
          lead_name: lead.name,
          assigned_to: selectedSeller.full_name,
        });

        // Atualizar contador
        sellerLoadMap[selectedSeller.id] = (sellerLoadMap[selectedSeller.id] || 0) + 1;

        // Notificar vendedor
        notifications.push({
          user_id: selectedSeller.id,
          title: '📥 Novo Lead Atribuído',
          message: `Você recebeu o lead ${lead.name}. Entre em contato em até 5 minutos!`,
          type: 'lead_assigned',
        });

        // Registrar histórico
        await supabase.from('crm_lead_history').insert({
          lead_id: lead.id,
          action_type: 'auto_assignment',
          title: 'Lead atribuído automaticamente',
          description: `Distribuído para ${selectedSeller.full_name} via round-robin`,
          performed_by: '00000000-0000-0000-0000-000000000000',
        });

        // Criar tarefa de primeiro contato
        await supabase.from('crm_tasks').insert({
          lead_id: lead.id,
          title: 'Primeiro contato - 5 minutos',
          description: 'Fazer primeiro contato com o lead dentro de 5 minutos',
          due_date: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          priority: 'high',
          assigned_to: selectedSeller.id,
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
      automation_type: 'lead_distribution',
      status: 'success',
      results: { distributed: distributions.length },
    });

    console.log(`✅ Distribuição concluída: ${distributions.length} leads atribuídos`);

    return new Response(
      JSON.stringify({
        success: true,
        distributed: distributions.length,
        distributions,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Erro na distribuição:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
