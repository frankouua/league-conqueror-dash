import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Protocol recurrence configurations
const RECURRENCE_CONFIG: Record<string, { days: number; type: string; urgency: string }> = {
  'implante hormonal': { days: 180, type: 'hormonal', urgency: 'high' },
  'implante': { days: 180, type: 'hormonal', urgency: 'high' },
  'botox': { days: 120, type: 'aesthetic', urgency: 'medium' },
  'toxina': { days: 120, type: 'aesthetic', urgency: 'medium' },
  'preenchimento': { days: 365, type: 'aesthetic', urgency: 'medium' },
  'ácido hialurônico': { days: 365, type: 'aesthetic', urgency: 'medium' },
  'harmonização': { days: 365, type: 'aesthetic', urgency: 'medium' },
  'peeling': { days: 30, type: 'skincare', urgency: 'low' },
  'limpeza de pele': { days: 30, type: 'skincare', urgency: 'low' },
  'drenagem': { days: 14, type: 'wellness', urgency: 'low' },
  'massagem': { days: 14, type: 'wellness', urgency: 'low' },
  'laser': { days: 30, type: 'aesthetic', urgency: 'medium' },
  'microagulhamento': { days: 30, type: 'aesthetic', urgency: 'medium' },
  'morpheus': { days: 90, type: 'aesthetic', urgency: 'high' },
  'endolifting': { days: 365, type: 'aesthetic', urgency: 'medium' },
  'soroterapia': { days: 30, type: 'wellness', urgency: 'low' },
};

// Scripts templates by suggestion type
const SCRIPT_TEMPLATES = {
  recurrence: {
    hormonal: `Olá {nome}! 💫 

Seu implante hormonal está completando o período ideal para renovação. 

Lembre-se que manter os níveis hormonais equilibrados é fundamental para:
✨ Disposição e energia
✨ Qualidade do sono
✨ Controle de peso
✨ Bem-estar geral

Vamos agendar sua consulta de acompanhamento? Tenho um horário especial para você! 📅`,

    aesthetic: `Olá {nome}! ✨

Tudo bem com você? 

Passando para lembrar que já faz um tempo desde seu último procedimento de {procedimento}. 

Para manter os resultados lindos que você conquistou, é importante fazer a manutenção no período ideal.

Que tal agendarmos sua sessão de manutenção? Tenho condições especiais para você! 💕`,

    skincare: `Oi {nome}! 🌟

Como está sua pele? 

Já se passaram algumas semanas desde seu último tratamento e sei que você ama manter aquele glow! 

Que tal uma nova sessão para manter sua pele radiante? 

Temos novidades incríveis que você vai amar conhecer! ✨`,

    wellness: `Olá {nome}! 💆‍♀️

Sentindo falta do nosso spa? 

Sei que você ama cuidar de você e já faz um tempinho desde sua última visita.

Que tal agendar um momento de relaxamento? Você merece esse autocuidado! 

Tenho um horário perfeito guardado para você! 🌸`,
  },

  upsell: `Olá {nome}! 💎

Você já conhece nosso {protocolo_sugerido}? 

Pensando no seu perfil e nos tratamentos que você já fez, acredito que seria PERFEITO para você!

{beneficios}

Posso te contar mais sobre? Tenho uma condição especial! ✨`,

  cross_sell: `Oi {nome}! 🌟

Sabia que muitas clientes que fazem {procedimento_atual} também amam combinar com {protocolo_sugerido}?

A combinação potencializa os resultados e você vai notar a diferença!

Quer saber mais sobre essa combo incrível? 💕`,

  reactivation: `Olá {nome}! 💫

Sentimos sua falta por aqui! 

Faz um tempinho que você não nos visita e gostaríamos muito de te receber novamente.

Preparamos uma condição especial de boas-vindas para você:
🎁 {oferta_especial}

O que acha de voltarmos a cuidar de você? ❤️`,

  referral: `Oi {nome}! 🌟

Você sabia que pode ganhar recompensas indicando amigas?

Para cada amiga que você indicar e fechar um procedimento, você ganha:
🎁 {bonus}

É muito fácil! Basta compartilhar seu código exclusivo: {codigo}

Já pensou em quem você pode indicar? 💕`,

  new_client: `Olá {nome}! ✨

Seja muito bem-vinda à Unique! 

Analisando seu perfil, preparei uma sugestão especial para você começar sua jornada conosco:

💎 {protocolo_sugerido}
{descricao}

Esse é o procedimento perfeito para o que você está buscando!

Posso te explicar melhor como funciona? 🌸`,

  loyalty: `Olá {nome}! 👑

Você é uma cliente especial para nós e queremos reconhecer isso!

Com sua fidelidade, você já acumulou {pontos} pontos no nosso programa!

Que tal usar seus pontos para um tratamento VIP?
🎁 {beneficio_fidelidade}

Quando podemos te receber? ✨`,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { lead_id, batch_mode = false, limit = 100 } = await req.json();

    console.log('🎯 Generating protocol suggestions...', { lead_id, batch_mode, limit });

    // Fetch protocols with recurrence info
    const { data: protocols } = await supabase
      .from('protocols')
      .select('*')
      .eq('is_active', true);

    if (!protocols?.length) {
      return new Response(
        JSON.stringify({ error: 'No protocols found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Build lead query
    let leadsQuery = supabase
      .from('crm_leads')
      .select(`
        *,
        rfv_customer:rfv_customers(*)
      `)
      .limit(limit);

    if (lead_id) {
      leadsQuery = leadsQuery.eq('id', lead_id);
    } else if (batch_mode) {
      // Get leads that haven't been analyzed recently
      leadsQuery = leadsQuery.or('last_activity_at.lt.' + new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() + ',last_activity_at.is.null');
    }

    const { data: leads, error: leadsError } = await leadsQuery;

    if (leadsError) throw leadsError;
    if (!leads?.length) {
      return new Response(
        JSON.stringify({ message: 'No leads to analyze', suggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allSuggestions: any[] = [];

    for (const lead of leads) {
      const suggestions = await generateSuggestionsForLead(lead, protocols, supabase);
      allSuggestions.push(...suggestions);
    }

    // Insert suggestions in batch
    if (allSuggestions.length > 0) {
      // First, deactivate old suggestions for these leads
      const leadIds = [...new Set(allSuggestions.map(s => s.lead_id))];
      await supabase
        .from('protocol_suggestions')
        .update({ is_active: false })
        .in('lead_id', leadIds)
        .eq('is_active', true);

      // Insert new suggestions
      const { error: insertError } = await supabase
        .from('protocol_suggestions')
        .insert(allSuggestions);

      if (insertError) {
        console.error('Error inserting suggestions:', insertError);
      }
    }

    console.log(`✅ Generated ${allSuggestions.length} suggestions for ${leads.length} leads`);

    return new Response(
      JSON.stringify({
        success: true,
        leads_analyzed: leads.length,
        suggestions_generated: allSuggestions.length,
        suggestions: allSuggestions.slice(0, 20), // Return first 20 for preview
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating suggestions:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function generateSuggestionsForLead(lead: any, protocols: any[], supabase: any): Promise<any[]> {
  const suggestions: any[] = [];
  const rfvData = lead.rfv_customer;
  const firstName = lead.name?.split(' ')[0] || 'Cliente';

  // 1. Check for RECURRENCE opportunities
  const lastProcedure = lead.last_procedure_name?.toLowerCase() || '';
  const lastProcedureDate = lead.last_procedure_date ? new Date(lead.last_procedure_date) : null;

  for (const [keyword, config] of Object.entries(RECURRENCE_CONFIG)) {
    if (lastProcedure.includes(keyword) && lastProcedureDate) {
      const daysSince = Math.floor((Date.now() - lastProcedureDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysUntilDue = config.days - daysSince;

      // Find matching protocol
      const matchingProtocol = protocols.find(p => 
        p.name.toLowerCase().includes(keyword) || 
        p.description?.toLowerCase().includes(keyword)
      );

      if (matchingProtocol) {
        if (daysUntilDue <= 30 || daysSince >= config.days) {
          // Due or overdue for recurrence
          const urgency = daysSince >= config.days ? 'overdue' : 'due_soon';
          const priority = daysSince >= config.days ? 1 : 2;

          const script = SCRIPT_TEMPLATES.recurrence[config.type as keyof typeof SCRIPT_TEMPLATES.recurrence]
            ?.replace(/{nome}/g, firstName)
            .replace(/{procedimento}/g, lead.last_procedure_name || 'tratamento') || '';

          suggestions.push({
            lead_id: lead.id,
            protocol_id: matchingProtocol.id,
            suggestion_type: 'recurrence',
            priority,
            reason: urgency === 'overdue' 
              ? `${lead.last_procedure_name} vencido há ${daysSince - config.days} dias - Precisa renovar!`
              : `${lead.last_procedure_name} vence em ${daysUntilDue} dias - Agendar renovação`,
            personalized_script: script,
            ai_confidence: urgency === 'overdue' ? 0.95 : 0.8,
          });

          // Track recurrence
          await supabase.from('protocol_recurrence_tracking').upsert({
            lead_id: lead.id,
            protocol_id: matchingProtocol.id,
            last_procedure_date: lastProcedureDate.toISOString(),
            next_due_date: new Date(lastProcedureDate.getTime() + config.days * 24 * 60 * 60 * 1000).toISOString(),
            days_overdue: daysSince >= config.days ? daysSince - config.days : 0,
            status: 'pending',
          }, { onConflict: 'lead_id,protocol_id' });
        }
      }
    }
  }

  // 2. Check for UPSELL opportunities based on RFV
  if (rfvData && rfvData.segment) {
    const segment = rfvData.segment.toLowerCase();
    
    if (segment.includes('champion') || segment.includes('loyal')) {
      // High-value protocols for champions
      const premiumProtocols = protocols.filter(p => 
        p.price >= 5000 && p.is_featured && !lead.interested_procedures?.includes(p.name)
      );

      for (const protocol of premiumProtocols.slice(0, 2)) {
        const script = SCRIPT_TEMPLATES.upsell
          .replace(/{nome}/g, firstName)
          .replace(/{protocolo_sugerido}/g, protocol.name)
          .replace(/{beneficios}/g, protocol.description || 'Resultados incríveis!');

        suggestions.push({
          lead_id: lead.id,
          protocol_id: protocol.id,
          suggestion_type: 'upsell',
          priority: 2,
          reason: `Cliente ${segment} - Potencial para upgrade: ${protocol.name}`,
          personalized_script: script,
          ai_confidence: 0.75,
        });
      }
    }
  }

  // 3. Check for REACTIVATION opportunities
  const lastActivityDate = lead.last_activity_at ? new Date(lead.last_activity_at) : null;
  const daysSinceActivity = lastActivityDate 
    ? Math.floor((Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  if (daysSinceActivity > 90 && daysSinceActivity < 365) {
    // Find a good reactivation protocol based on their history
    const reactivationProtocol = protocols.find(p => 
      (lead.interested_procedures?.some((proc: string) => 
        p.name.toLowerCase().includes(proc.toLowerCase().split(' ')[0])
      )) || p.is_featured
    );

    if (reactivationProtocol) {
      const script = SCRIPT_TEMPLATES.reactivation
        .replace(/{nome}/g, firstName)
        .replace(/{oferta_especial}/g, '15% de desconto no seu primeiro procedimento de volta!');

      suggestions.push({
        lead_id: lead.id,
        protocol_id: reactivationProtocol.id,
        suggestion_type: 'reactivation',
        priority: 1,
        reason: `Inativo há ${daysSinceActivity} dias - Oportunidade de reativação`,
        personalized_script: script,
        ai_confidence: 0.7,
      });
    }
  }

  // 4. Check for REFERRAL opportunities (happy customers)
  if (rfvData && (rfvData.segment?.includes('Champion') || rfvData.monetary_score >= 4)) {
    const referralProtocol = protocols.find(p => p.is_featured);
    
    if (referralProtocol) {
      const referralCode = `${firstName.toUpperCase().slice(0, 3)}${lead.id.slice(0, 4).toUpperCase()}`;
      const script = SCRIPT_TEMPLATES.referral
        .replace(/{nome}/g, firstName)
        .replace(/{bonus}/g, 'R$ 100 de crédito')
        .replace(/{codigo}/g, referralCode);

      suggestions.push({
        lead_id: lead.id,
        protocol_id: referralProtocol.id,
        suggestion_type: 'referral',
        priority: 3,
        reason: 'Cliente satisfeita - Potencial para programa de indicação',
        personalized_script: script,
        ai_confidence: 0.65,
      });
    }
  }

  // 5. Check for NEW CLIENT suggestions (no history)
  if (!lastProcedureDate && !lead.interested_procedures?.length) {
    const entryProtocols = protocols
      .filter(p => p.price < 2000 && p.is_active)
      .slice(0, 2);

    for (const protocol of entryProtocols) {
      const script = SCRIPT_TEMPLATES.new_client
        .replace(/{nome}/g, firstName)
        .replace(/{protocolo_sugerido}/g, protocol.name)
        .replace(/{descricao}/g, protocol.description || '');

      suggestions.push({
        lead_id: lead.id,
        protocol_id: protocol.id,
        suggestion_type: 'new_client',
        priority: 2,
        reason: 'Novo cliente - Sugerir primeiro procedimento',
        personalized_script: script,
        ai_confidence: 0.6,
      });
    }
  }

  // 6. LOYALTY suggestions for repeat customers
  if (rfvData && rfvData.frequency_score >= 4) {
    const loyaltyProtocol = protocols.find(p => p.is_featured && p.price >= 1000);
    
    if (loyaltyProtocol) {
      const points = Math.floor((rfvData.total_value || 0) / 100);
      const script = SCRIPT_TEMPLATES.loyalty
        .replace(/{nome}/g, firstName)
        .replace(/{pontos}/g, points.toString())
        .replace(/{beneficio_fidelidade}/g, 'Uma sessão cortesia de drenagem!');

      suggestions.push({
        lead_id: lead.id,
        protocol_id: loyaltyProtocol.id,
        suggestion_type: 'loyalty',
        priority: 2,
        reason: `Cliente fiel (${rfvData.total_purchases || 0} compras) - Reconhecer fidelidade`,
        personalized_script: script,
        ai_confidence: 0.8,
      });
    }
  }

  // 7. CROSS-SELL based on current interests
  if (lead.interested_procedures?.length) {
    const currentProcedure = lead.interested_procedures[0];
    const complementaryProtocols = findComplementaryProtocols(currentProcedure, protocols);

    for (const protocol of complementaryProtocols.slice(0, 1)) {
      const script = SCRIPT_TEMPLATES.cross_sell
        .replace(/{nome}/g, firstName)
        .replace(/{procedimento_atual}/g, currentProcedure)
        .replace(/{protocolo_sugerido}/g, protocol.name);

      suggestions.push({
        lead_id: lead.id,
        protocol_id: protocol.id,
        suggestion_type: 'cross_sell',
        priority: 3,
        reason: `Complementar ${currentProcedure} com ${protocol.name}`,
        personalized_script: script,
        ai_confidence: 0.7,
      });
    }
  }

  return suggestions;
}

function findComplementaryProtocols(currentProcedure: string, protocols: any[]): any[] {
  const complementMap: Record<string, string[]> = {
    'cirurgia': ['pré cirúrgico', 'pós cirúrgico', 'soroterapia'],
    'lipo': ['drenagem', 'massagem', 'pós cirúrgico'],
    'abdominoplastia': ['drenagem', 'pós cirúrgico', 'soroterapia'],
    'botox': ['peeling', 'laser', 'skincare'],
    'preenchimento': ['botox', 'harmonização', 'skincare'],
    'implante': ['consulta nutricionista', 'soroterapia'],
    'harmonização': ['botox', 'preenchimento', 'laser'],
    'morpheus': ['laser', 'skincare', 'peeling'],
    'spa': ['massagem', 'drenagem', 'relaxamento'],
  };

  const lowerProcedure = currentProcedure.toLowerCase();
  let keywords: string[] = [];

  for (const [key, complements] of Object.entries(complementMap)) {
    if (lowerProcedure.includes(key)) {
      keywords = complements;
      break;
    }
  }

  if (keywords.length === 0) return [];

  return protocols.filter(p => 
    keywords.some(kw => 
      p.name.toLowerCase().includes(kw) || 
      p.description?.toLowerCase().includes(kw)
    )
  );
}
