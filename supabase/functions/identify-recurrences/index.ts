import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecurrenceOpportunity {
  patient_cpf: string;
  patient_name: string;
  patient_phone: string;
  patient_email: string;
  patient_prontuario: string;
  procedure_id: string;
  procedure_name: string;
  procedure_group: string;
  last_procedure_date: string;
  recurrence_days: number;
  due_date: string;
  days_overdue: number;
  urgency_level: string;
  script_whatsapp: string;
  existing_lead_id: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { daysAhead = 30, limit = 500, createLeads = true, notifySellers = true } = await req.json().catch(() => ({}));

    console.log(`🔄 Identifying recurrence opportunities (daysAhead: ${daysAhead}, limit: ${limit})`);

    // Get the Farmer pipeline ID
    const { data: farmerPipeline } = await supabase
      .from('crm_pipelines')
      .select('id')
      .eq('pipeline_type', 'farmer')
      .single();

    if (!farmerPipeline) {
      throw new Error('Pipeline Farmer não encontrado');
    }

    // Get recurrence stages
    const { data: recurrenceStages } = await supabase
      .from('crm_stages')
      .select('id, name')
      .eq('pipeline_id', farmerPipeline.id)
      .ilike('name', 'Recorrência%')
      .order('order_index');

    const stageMap = {
      upcoming: recurrenceStages?.find(s => s.name.includes('Por Vencer'))?.id,
      overdue: recurrenceStages?.find(s => s.name.includes('Vencido Recente'))?.id,
      critical: recurrenceStages?.find(s => s.name.includes('Vencido Crítico'))?.id,
      recovered: recurrenceStages?.find(s => s.name.includes('Recuperado'))?.id,
    };

    console.log('📊 Stage mapping:', stageMap);

    // Get recurrence opportunities using the database function
    const { data: opportunities, error: oppError } = await supabase
      .rpc('get_recurrence_opportunities', {
        p_days_before: daysAhead,
        p_limit: limit
      });

    if (oppError) {
      console.error('Error fetching opportunities:', oppError);
      throw oppError;
    }

    console.log(`📋 Found ${opportunities?.length || 0} recurrence opportunities`);

    const stats = {
      total: opportunities?.length || 0,
      upcoming: 0,
      overdue: 0,
      critical: 0,
      leadsCreated: 0,
      leadsUpdated: 0,
      errors: 0
    };

    if (!createLeads || !opportunities?.length) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Identificação concluída (sem criação de leads)',
        stats,
        opportunities
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Process each opportunity
    for (const opp of opportunities as RecurrenceOpportunity[]) {
      try {
        // Determine the correct stage based on urgency
        let stageId = stageMap.upcoming;
        if (opp.urgency_level === 'critical') {
          stageId = stageMap.critical;
          stats.critical++;
        } else if (opp.urgency_level === 'overdue') {
          stageId = stageMap.overdue;
          stats.overdue++;
        } else {
          stats.upcoming++;
        }

        if (!stageId) {
          console.warn('No stage found for urgency:', opp.urgency_level);
          continue;
        }

        if (opp.existing_lead_id) {
          // Update existing lead
          const { error: updateError } = await supabase
            .from('crm_leads')
            .update({
              stage_id: stageId,
              recurrence_days_overdue: opp.days_overdue,
              recurrence_due_date: opp.due_date,
              last_activity_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', opp.existing_lead_id);

          if (updateError) {
            console.error('Error updating lead:', updateError);
            stats.errors++;
          } else {
            stats.leadsUpdated++;
          }
        } else {
          // Check if lead with same CPF exists (not marked as recurrence)
          const { data: existingLead } = await supabase
            .from('crm_leads')
            .select('id')
            .eq('cpf', opp.patient_cpf)
            .single();

          if (existingLead) {
            // Update existing lead to be a recurrence lead
            const { error: updateError } = await supabase
              .from('crm_leads')
              .update({
                pipeline_id: farmerPipeline.id,
                stage_id: stageId,
                is_recurrence_lead: true,
                last_procedure_date: opp.last_procedure_date,
                last_procedure_name: opp.procedure_name,
                recurrence_due_date: opp.due_date,
                recurrence_days_overdue: opp.days_overdue,
                recurrence_group: opp.procedure_group,
                recurrence_procedure_id: opp.procedure_id,
                last_activity_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', existingLead.id);

            if (updateError) {
              console.error('Error updating existing lead:', updateError);
              stats.errors++;
            } else {
              stats.leadsUpdated++;
            }
          } else {
            // Create new lead
            const { error: createError } = await supabase
              .from('crm_leads')
              .insert({
                name: opp.patient_name || 'Paciente Recorrência',
                phone: opp.patient_phone,
                email: opp.patient_email,
                cpf: opp.patient_cpf,
                prontuario: opp.patient_prontuario,
                pipeline_id: farmerPipeline.id,
                stage_id: stageId,
                source: 'recurrence_system',
                source_detail: `Recorrência: ${opp.procedure_name}`,
                is_recurrence_lead: true,
                last_procedure_date: opp.last_procedure_date,
                last_procedure_name: opp.procedure_name,
                recurrence_due_date: opp.due_date,
                recurrence_days_overdue: opp.days_overdue,
                recurrence_group: opp.procedure_group,
                recurrence_procedure_id: opp.procedure_id,
                temperature: opp.urgency_level === 'critical' ? 'hot' : 
                             opp.urgency_level === 'overdue' ? 'warm' : 'cold',
                notes: `📅 Último procedimento: ${opp.procedure_name}\n📆 Data: ${opp.last_procedure_date}\n⏰ Vencimento: ${opp.due_date}\n${opp.days_overdue > 0 ? `⚠️ Atrasado: ${opp.days_overdue} dias` : `📌 Faltam: ${Math.abs(opp.days_overdue)} dias`}`,
                created_by: '00000000-0000-0000-0000-000000000000' // System user
              });

            if (createError) {
              console.error('Error creating lead:', createError);
              stats.errors++;
            } else {
              stats.leadsCreated++;
            }
          }
        }
      } catch (err) {
        console.error('Error processing opportunity:', err);
        stats.errors++;
      }
    }

    // Notify sellers if enabled
    if (notifySellers && (stats.leadsCreated > 0 || stats.leadsUpdated > 0)) {
      // Get all active sellers
      const { data: sellers } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('position', ['Pré-vendedor', 'Vendedor', 'Closer', 'Especialista de Vendas', 'Consultor']);

      if (sellers?.length) {
        const notifications = sellers.map(seller => ({
          user_id: seller.user_id,
          title: '🔔 Novas Recorrências Identificadas',
          message: `${stats.leadsCreated} novos leads e ${stats.leadsUpdated} atualizados no pipeline de Recorrências. ${stats.critical} críticos requerem atenção imediata!`,
          type: 'recurrence_alert'
        }));

        await supabase.from('notifications').insert(notifications);
        console.log(`📧 Sent notifications to ${sellers.length} sellers`);
      }
    }

    console.log('✅ Processing complete:', stats);

    return new Response(JSON.stringify({
      success: true,
      message: `Identificação concluída: ${stats.leadsCreated} criados, ${stats.leadsUpdated} atualizados`,
      stats
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in identify-recurrences:', error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});