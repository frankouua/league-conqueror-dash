import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RFV_PIPELINE_ID = '66666666-6666-6666-6666-666666666666';

// Mapeamento de segmentos RFV para nomes de estágios
const SEGMENT_TO_STAGE: Record<string, string> = {
  'champions': 'Campeões',
  'Campeões': 'Campeões',
  'loyal': 'Leais',
  'Leais': 'Leais',
  'potential': 'Potenciais Leais',
  'Potenciais Leais': 'Potenciais Leais',
  'Novos': 'Novos',
  'Promissores': 'Promissores',
  'Precisam Atenção': 'Precisam Atenção',
  'at_risk': 'Em Risco',
  'Em Risco': 'Em Risco',
  'Não Podem Perder': 'Não Podem Perder',
  'hibernating': 'Hibernando',
  'Hibernando': 'Hibernando',
  'Quase Dormindo': 'Hibernando',
  'lost': 'Perdidos',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar estágios da pipeline RFV
    const { data: stages, error: stagesError } = await supabase
      .from('crm_stages')
      .select('id, name')
      .eq('pipeline_id', RFV_PIPELINE_ID);

    if (stagesError) throw stagesError;

    const stageMap = new Map(stages.map((s: any) => [s.name, s.id]));

    // Buscar clientes RFV que ainda não foram importados
    const { data: existingLeads, error: existingError } = await supabase
      .from('crm_leads')
      .select('rfv_customer_id')
      .eq('pipeline_id', RFV_PIPELINE_ID)
      .not('rfv_customer_id', 'is', null);

    if (existingError) throw existingError;

    const existingRfvIds = new Set(existingLeads?.map((l: any) => l.rfv_customer_id) || []);

    // Buscar todos os clientes RFV (sem limite de 1000)
    const allCustomers: any[] = [];
    let offset = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data: batch, error: batchError } = await supabase
        .from('rfv_customers')
        .select('id, name, email, phone, whatsapp, segment, total_value, recency_score, frequency_score, value_score, cpf, prontuario')
        .range(offset, offset + pageSize - 1);
      
      if (batchError) throw batchError;
      if (!batch || batch.length === 0) break;
      
      allCustomers.push(...batch);
      if (batch.length < pageSize) break;
      offset += pageSize;
    }

    const customers = allCustomers;

    // Filtrar os que já foram importados
    const toImport = customers?.filter((c: any) => !existingRfvIds.has(c.id)) || [];

    if (toImport.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Todos os clientes já foram importados', imported: 0, skipped: existingRfvIds.size }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Preparar leads para inserção
    const leadsToInsert = toImport.map((customer: any) => {
      const stageName = SEGMENT_TO_STAGE[customer.segment] || 'Perdidos';
      const stageId = stageMap.get(stageName) || stageMap.get('Perdidos');

      return {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        whatsapp: customer.whatsapp,
        cpf: customer.cpf,
        prontuario: customer.prontuario,
        pipeline_id: RFV_PIPELINE_ID,
        stage_id: stageId,
        rfv_customer_id: customer.id,
        estimated_value: customer.total_value,
        source: 'rfv_import',
        source_detail: `Segmento: ${customer.segment}`,
        created_by: '00000000-0000-0000-0000-000000000000', // System user
        notes: `Importado da Matriz RFV\nSegmento: ${customer.segment}\nR: ${customer.recency_score || 0} | F: ${customer.frequency_score || 0} | V: ${customer.value_score || 0}`,
        tags: ['RFV', customer.segment],
      };
    });

    // Inserir em lotes de 100
    const batchSize = 100;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < leadsToInsert.length; i += batchSize) {
      const batch = leadsToInsert.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('crm_leads')
        .insert(batch);

      if (insertError) {
        console.error('Erro ao inserir lote:', insertError);
        errors += batch.length;
      } else {
        inserted += batch.length;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Importação concluída!`,
        total: customers?.length || 0,
        imported: inserted,
        skipped: existingRfvIds.size,
        errors
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('Erro na importação:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
