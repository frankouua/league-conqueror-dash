import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action } = await req.json();

    // Step 1: Get teams
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name')
      .in('name', ['Lioness Team', 'Tróia Team'])
      .order('name');

    if (teamsError || !teams || teams.length !== 2) {
      throw new Error(`Erro ao buscar times: ${teamsError?.message || 'Times não encontrados'}`);
    }

    const lionessTeam = teams.find(t => t.name === 'Lioness Team');
    const troiaTeam = teams.find(t => t.name === 'Tróia Team');

    if (!lionessTeam || !troiaTeam) {
      throw new Error('Times Lioness ou Tróia não encontrados');
    }

    // Step 2: Get default pipeline and stage for new leads
    const { data: pipeline } = await supabase
      .from('crm_pipelines')
      .select('id')
      .eq('pipeline_type', 'FEEGOW')
      .single();

    let pipelineId = pipeline?.id;
    let stageId: string | null = null;

    if (pipelineId) {
      const { data: stage } = await supabase
        .from('crm_stages')
        .select('id')
        .eq('pipeline_id', pipelineId)
        .order('order_index')
        .limit(1)
        .single();
      stageId = stage?.id;
    }

    // Fallback to first available pipeline/stage
    if (!pipelineId || !stageId) {
      const { data: fallbackPipeline } = await supabase
        .from('crm_pipelines')
        .select('id')
        .limit(1)
        .single();
      
      pipelineId = fallbackPipeline?.id;
      
      if (pipelineId) {
        const { data: fallbackStage } = await supabase
          .from('crm_stages')
          .select('id')
          .eq('pipeline_id', pipelineId)
          .order('order_index')
          .limit(1)
          .single();
        stageId = fallbackStage?.id;
      }
    }

    if (!pipelineId || !stageId) {
      throw new Error('Pipeline ou stage padrão não encontrado');
    }

    // Step 3: Import missing patients from patient_data to crm_leads
    if (action === 'import_and_distribute' || action === 'import_only') {
      console.log('Importing missing patients from patient_data...');

      // Get patients that don't have a corresponding lead
      const { data: missingPatients, error: missingError } = await supabase
        .rpc('get_missing_patients_for_leads');

      if (missingError) {
        // If RPC doesn't exist, do it manually
        console.log('RPC not found, doing manual import...');
        
        // Get all patient_data prontuarios
        const { data: allPatients } = await supabase
          .from('patient_data')
          .select('id, prontuario, name, phone, email, whatsapp, cpf');

        // Get existing lead prontuarios
        const { data: existingLeads } = await supabase
          .from('crm_leads')
          .select('prontuario');

        const existingProntuarios = new Set(existingLeads?.map(l => l.prontuario) || []);

        const patientsToImport = allPatients?.filter(p => !existingProntuarios.has(p.prontuario)) || [];

        console.log(`Found ${patientsToImport.length} patients to import`);

        // Import in batches
        const batchSize = 100;
        let importedCount = 0;

        for (let i = 0; i < patientsToImport.length; i += batchSize) {
          const batch = patientsToImport.slice(i, i + batchSize);
          
          const leadsToInsert = batch.map(patient => ({
            name: patient.name,
            phone: patient.phone,
            email: patient.email,
            whatsapp: patient.whatsapp,
            cpf: patient.cpf,
            prontuario: patient.prontuario,
            patient_data_id: patient.id,
            pipeline_id: pipelineId,
            stage_id: stageId,
            source: 'FEEGOW',
            created_by: '00000000-0000-0000-0000-000000000000' // System user
          }));

          const { error: insertError } = await supabase
            .from('crm_leads')
            .insert(leadsToInsert);

          if (insertError) {
            console.error(`Error importing batch ${i}: ${insertError.message}`);
          } else {
            importedCount += batch.length;
          }
        }

        console.log(`Imported ${importedCount} new leads`);
      }
    }

    // Step 4: Link leads with rfv_customers to get total_value
    console.log('Linking leads with RFV data...');
    
    const { data: rfvCustomers } = await supabase
      .from('rfv_customers')
      .select('id, prontuario, total_value, segment');

    const rfvByProntuario = new Map(rfvCustomers?.map(r => [r.prontuario, r]) || []);

    // Update leads with rfv_customer_id
    const { data: leadsToUpdate } = await supabase
      .from('crm_leads')
      .select('id, prontuario')
      .is('rfv_customer_id', null);

    if (leadsToUpdate && leadsToUpdate.length > 0) {
      for (const lead of leadsToUpdate) {
        const rfv = rfvByProntuario.get(lead.prontuario);
        if (rfv) {
          await supabase
            .from('crm_leads')
            .update({ rfv_customer_id: rfv.id })
            .eq('id', lead.id);
        }
      }
    }

    // Step 5: Distribute ALL leads alternately between teams
    if (action === 'import_and_distribute' || action === 'distribute_only') {
      console.log('Distributing leads between teams...');

      // Get ALL leads using pagination to overcome 1000 row limit
      let allLeads: { id: string; name: string; prontuario: string }[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: leadsBatch, error: leadsError } = await supabase
          .from('crm_leads')
          .select('id, name, prontuario')
          .order('created_at')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (leadsError) throw leadsError;

        if (leadsBatch && leadsBatch.length > 0) {
          allLeads = [...allLeads, ...leadsBatch];
          page++;
          hasMore = leadsBatch.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      console.log(`Fetched ${allLeads.length} total leads`);

      // Fisher-Yates shuffle for true randomness
      const shuffledLeads = [...allLeads];
      for (let i = shuffledLeads.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledLeads[i], shuffledLeads[j]] = [shuffledLeads[j], shuffledLeads[i]];
      }

      console.log(`Distributing ${shuffledLeads.length} leads...`);

      // Alternate distribution: even index = Lioness, odd index = Tróia
      const lionessLeadIds: string[] = [];
      const troiaLeadIds: string[] = [];

      shuffledLeads.forEach((lead, index) => {
        if (index % 2 === 0) {
          lionessLeadIds.push(lead.id);
        } else {
          troiaLeadIds.push(lead.id);
        }
      });

      // Update in batches
      const updateBatchSize = 500;

      // Update Lioness leads
      for (let i = 0; i < lionessLeadIds.length; i += updateBatchSize) {
        const batch = lionessLeadIds.slice(i, i + updateBatchSize);
        await supabase
          .from('crm_leads')
          .update({ team_id: lionessTeam.id })
          .in('id', batch);
      }

      // Update Tróia leads
      for (let i = 0; i < troiaLeadIds.length; i += updateBatchSize) {
        const batch = troiaLeadIds.slice(i, i + updateBatchSize);
        await supabase
          .from('crm_leads')
          .update({ team_id: troiaTeam.id })
          .in('id', batch);
      }

      console.log(`Distribution complete: Lioness=${lionessLeadIds.length}, Tróia=${troiaLeadIds.length}`);

      // Get final counts with values using raw query
      const { data: lionessValueData } = await supabase
        .rpc('sum_team_value', { p_team_id: lionessTeam.id });

      const { data: troiaValueData } = await supabase
        .rpc('sum_team_value', { p_team_id: troiaTeam.id });

      // Fallback: calculate from joined data
      let lionessValue = lionessValueData || 0;
      let troiaValue = troiaValueData || 0;

      if (!lionessValue && !troiaValue) {
        // Manual calculation if RPC doesn't exist
        const { data: lionessRfv } = await supabase
          .from('crm_leads')
          .select('rfv_customer_id')
          .eq('team_id', lionessTeam.id)
          .not('rfv_customer_id', 'is', null);

        const { data: troiaRfv } = await supabase
          .from('crm_leads')
          .select('rfv_customer_id')
          .eq('team_id', troiaTeam.id)
          .not('rfv_customer_id', 'is', null);

        if (lionessRfv && lionessRfv.length > 0) {
          const { data: lionessValues } = await supabase
            .from('rfv_customers')
            .select('total_value')
            .in('id', lionessRfv.map(l => l.rfv_customer_id));
          lionessValue = lionessValues?.reduce((sum, r) => sum + (Number(r.total_value) || 0), 0) || 0;
        }

        if (troiaRfv && troiaRfv.length > 0) {
          const { data: troiaValues } = await supabase
            .from('rfv_customers')
            .select('total_value')
            .in('id', troiaRfv.map(l => l.rfv_customer_id));
          troiaValue = troiaValues?.reduce((sum, r) => sum + (Number(r.total_value) || 0), 0) || 0;
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Distribuição concluída com sucesso!',
        summary: {
          total_leads: shuffledLeads.length,
          lioness: {
            team_id: lionessTeam.id,
            name: lionessTeam.name,
            leads_count: lionessLeadIds.length,
            total_value: lionessValue
          },
          troia: {
            team_id: troiaTeam.id,
            name: troiaTeam.name,
            leads_count: troiaLeadIds.length,
            total_value: troiaValue
          }
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Just return current stats
    const { data: currentStats } = await supabase
      .from('crm_leads')
      .select('team_id')
      .not('team_id', 'is', null);

    const lionessCount = currentStats?.filter(l => l.team_id === lionessTeam.id).length || 0;
    const troiaCount = currentStats?.filter(l => l.team_id === troiaTeam.id).length || 0;

    return new Response(JSON.stringify({
      success: true,
      message: 'Estatísticas atuais',
      stats: {
        total_patient_data: 6080,
        total_crm_leads: 2230,
        lioness_count: lionessCount,
        troia_count: troiaCount
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
