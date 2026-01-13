import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecurrenceOpportunity {
  out_patient_cpf: string;
  out_patient_name: string;
  out_patient_phone: string;
  out_patient_email: string;
  out_patient_prontuario: string;
  out_procedure_name: string;
  out_procedure_group: string;
  out_last_procedure_date: string;
  out_recurrence_days: number;
  out_due_date: string;
  out_days_overdue: number;
  out_urgency_level: string;
  out_whatsapp_script: string;
  out_existing_lead_id: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { daysAhead = 30, limit = 100, createLeads = true, yearFrom = 2024 } = await req.json().catch(() => ({}));

    console.log(`🔄 Identifying recurrence opportunities (daysAhead: ${daysAhead}, limit: ${limit}, yearFrom: ${yearFrom})`);

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
      .ilike('name', '%Recorrência%');

    const stageMap = {
      upcoming: recurrenceStages?.find(s => s.name.includes('Por Vencer'))?.id,
      overdue: recurrenceStages?.find(s => s.name.includes('Vencido Recente'))?.id,
      critical: recurrenceStages?.find(s => s.name.includes('Vencido Crítico'))?.id,
      recovered: recurrenceStages?.find(s => s.name.includes('Recuperado'))?.id,
    };

    console.log('📊 Stage mapping:', stageMap);

    if (!stageMap.upcoming && !stageMap.overdue && !stageMap.critical) {
      throw new Error('Estágios de recorrência não encontrados no pipeline Farmer');
    }

    // Get recurrence opportunities with year filter
    const { data: opportunities, error: oppError } = await supabase
      .rpc('get_recurrence_opportunities', {
        p_days_before: daysAhead,
        p_limit: limit,
        p_year_from: yearFrom
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

    // Process opportunities in batch
    const updates: { id: string; data: Record<string, unknown> }[] = [];
    const inserts: Record<string, unknown>[] = [];

    for (const opp of opportunities as RecurrenceOpportunity[]) {
      // Determine the correct stage based on urgency
      let stageId = stageMap.upcoming;
      if (opp.out_urgency_level === 'critical') {
        stageId = stageMap.critical;
        stats.critical++;
      } else if (opp.out_urgency_level === 'overdue') {
        stageId = stageMap.overdue;
        stats.overdue++;
      } else {
        stats.upcoming++;
      }

      if (!stageId) continue;

      const leadData = {
        pipeline_id: farmerPipeline.id,
        stage_id: stageId,
        is_recurrence_lead: true,
        last_procedure_date: opp.out_last_procedure_date,
        last_procedure_name: opp.out_procedure_name,
        recurrence_due_date: opp.out_due_date,
        recurrence_days_overdue: opp.out_days_overdue,
        recurrence_group: opp.out_procedure_group,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (opp.out_existing_lead_id) {
        updates.push({ id: opp.out_existing_lead_id, data: leadData });
      } else {
        inserts.push({
          name: opp.out_patient_name || 'Paciente Recorrência',
          phone: opp.out_patient_phone,
          email: opp.out_patient_email,
          cpf: opp.out_patient_cpf,
          prontuario: opp.out_patient_prontuario,
          source: 'recurrence_system',
          source_detail: `Recorrência: ${opp.out_procedure_name}`,
          temperature: opp.out_urgency_level === 'critical' ? 'hot' : 
                       opp.out_urgency_level === 'overdue' ? 'warm' : 'cold',
          notes: `📅 Último: ${opp.out_procedure_name} em ${opp.out_last_procedure_date}\n⏰ Venc: ${opp.out_due_date}\n${opp.out_days_overdue > 0 ? `⚠️ Atrasado: ${opp.out_days_overdue}d` : `📌 Faltam: ${Math.abs(opp.out_days_overdue)}d`}`,
          created_by: '00000000-0000-0000-0000-000000000000',
          ...leadData
        });
      }
    }

    // Execute batch updates
    for (const update of updates) {
      const { error } = await supabase
        .from('crm_leads')
        .update(update.data)
        .eq('id', update.id);
      
      if (error) {
        console.error('Update error:', error);
        stats.errors++;
      } else {
        stats.leadsUpdated++;
      }
    }

    // Execute batch inserts (in chunks to avoid size limits)
    const CHUNK_SIZE = 50;
    for (let i = 0; i < inserts.length; i += CHUNK_SIZE) {
      const chunk = inserts.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase.from('crm_leads').insert(chunk);
      
      if (error) {
        console.error('Insert error:', error);
        stats.errors += chunk.length;
      } else {
        stats.leadsCreated += chunk.length;
      }
    }

    console.log('✅ Processing complete:', stats);

    return new Response(JSON.stringify({
      success: true,
      message: `${stats.leadsCreated} criados, ${stats.leadsUpdated} atualizados`,
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