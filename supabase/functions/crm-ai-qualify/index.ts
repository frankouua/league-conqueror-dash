import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QualifyRequest {
  leadId: string;
  conversationHistory?: string;
  notes?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { leadId, conversationHistory, notes }: QualifyRequest = await req.json();

    if (!leadId) {
      throw new Error('Lead ID is required');
    }

    // Fetch lead data
    const { data: lead, error: leadError } = await supabase
      .from('crm_leads')
      .select(`
        *,
        crm_stages (name, pipeline_id),
        crm_pipelines (name, pipeline_type)
      `)
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      throw new Error(`Lead not found: ${leadError?.message}`);
    }

    // Fetch lead history
    const { data: history } = await supabase
      .from('crm_lead_history')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Build context for AI analysis
    const leadContext = `
DADOS DO LEAD:
- Nome: ${lead.name}
- Email: ${lead.email || 'Não informado'}
- Telefone: ${lead.phone || 'Não informado'}
- WhatsApp: ${lead.whatsapp || 'Não informado'}
- Origem: ${lead.source || 'Não identificada'}
- Pipeline: ${lead.crm_pipelines?.name || 'SDR'}
- Etapa Atual: ${lead.crm_stages?.name || 'Não definida'}
- Valor Estimado: ${lead.estimated_value ? `R$ ${lead.estimated_value.toLocaleString('pt-BR')}` : 'Não estimado'}
- Procedimentos de Interesse: ${lead.interested_procedures?.join(', ') || 'Não informado'}
- Notas: ${lead.notes || notes || 'Nenhuma'}
- Tags: ${lead.tags?.join(', ') || 'Nenhuma'}
- Dias na Etapa: ${lead.days_in_stage || 0}
- Total de Interações: ${lead.total_interactions || 0}

HISTÓRICO RECENTE:
${history?.map(h => `- ${h.action_type}: ${h.description || h.title}`).join('\n') || 'Sem histórico'}

${conversationHistory ? `CONVERSA/INTERAÇÕES:\n${conversationHistory}` : ''}
`;

    const systemPrompt = `Você é um especialista em qualificação de leads para uma clínica de cirurgia plástica de alto padrão (Unique Cirurgia Plástica Avançada).

Sua tarefa é analisar os dados do lead e fornecer:

1. **BANT Score** (Budget, Authority, Need, Timing):
   - budget_score (0-100): Capacidade financeira estimada
   - authority_score (0-100): Poder de decisão
   - need_score (0-100): Necessidade/desejo pelo procedimento
   - timing_score (0-100): Urgência/momento da compra

2. **Lead Score** (0-100): Score geral de qualificação

3. **Sentimento** (positivo, neutro, negativo, hesitante)

4. **Intenção** (alta, média, baixa, indefinida)

5. **Resumo** (máximo 150 caracteres): Resumo executivo do lead

6. **Próxima Ação Sugerida**: O que o vendedor deve fazer agora

7. **Tags Sugeridas**: Array de tags relevantes para categorizar o lead

Responda APENAS com um JSON válido no seguinte formato:
{
  "budget_score": number,
  "authority_score": number,
  "need_score": number,
  "timing_score": number,
  "lead_score": number,
  "sentiment": "positivo" | "neutro" | "negativo" | "hesitante",
  "intent": "alta" | "média" | "baixa" | "indefinida",
  "summary": "string",
  "next_action": "string",
  "suggested_tags": ["string"]
}`;

    console.log('Calling Lovable AI for lead qualification...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: leadContext }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error('No content in AI response');
    }

    console.log('AI Response:', aiContent);

    // Parse JSON from AI response
    let analysis;
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Return default analysis
      analysis = {
        budget_score: 50,
        authority_score: 50,
        need_score: 50,
        timing_score: 50,
        lead_score: 50,
        sentiment: 'neutro',
        intent: 'indefinida',
        summary: 'Análise automática indisponível. Avalie manualmente.',
        next_action: 'Entrar em contato para qualificação manual',
        suggested_tags: ['revisar']
      };
    }

    // Update lead with AI analysis
    const { error: updateError } = await supabase
      .from('crm_leads')
      .update({
        lead_score: analysis.lead_score,
        budget_score: analysis.budget_score,
        authority_score: analysis.authority_score,
        need_score: analysis.need_score,
        timing_score: analysis.timing_score,
        ai_sentiment: analysis.sentiment,
        ai_intent: analysis.intent,
        ai_summary: analysis.summary,
        ai_next_action: analysis.next_action,
        ai_analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    if (updateError) {
      console.error('Failed to update lead:', updateError);
    }

    // Add suggested tags if any
    if (analysis.suggested_tags?.length > 0) {
      const currentTags = lead.tags || [];
      const newTags = [...new Set([...currentTags, ...analysis.suggested_tags])];
      
      await supabase
        .from('crm_leads')
        .update({ tags: newTags })
        .eq('id', leadId);
    }

    // Log AI analysis in history
    await supabase
      .from('crm_lead_history')
      .insert({
        lead_id: leadId,
        action_type: 'ai_analysis',
        title: 'Qualificação por IA',
        description: `Lead Score: ${analysis.lead_score} | Sentimento: ${analysis.sentiment} | Intenção: ${analysis.intent}`,
        performed_by: 'system',
        ai_analysis: analysis,
      });

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        message: 'Lead qualificado com sucesso pela IA',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (err) {
    const error = err as Error;
    console.error('Error in crm-ai-qualify:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
