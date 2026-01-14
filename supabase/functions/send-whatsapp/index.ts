import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
    const evolutionInstance = Deno.env.get('EVOLUTION_INSTANCE') || 'unique';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { 
      action,
      phone, 
      message, 
      templateId,
      leadId,
      variables = {},
      mediaUrl,
      mediaType
    } = await req.json();

    // Handle different actions
    if (action === 'process_queue') {
      // Process pending messages from queue
      const { data: pendingMessages } = await supabase
        .from('whatsapp_dispatch_queue')
        .select('*, crm_leads(name, phone)')
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .limit(50);

      let processed = 0;
      let failed = 0;

      for (const msg of pendingMessages || []) {
        try {
          // Here you would integrate with your WhatsApp provider
          // For now, we'll just update the status
          
          await supabase
            .from('whatsapp_dispatch_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString()
            })
            .eq('id', msg.id);

          processed++;
        } catch (e) {
          await supabase
            .from('whatsapp_dispatch_queue')
            .update({
              status: 'failed',
              error_message: (e as Error).message
            })
            .eq('id', msg.id);
          failed++;
        }
      }

      return new Response(JSON.stringify({
        success: true,
        processed,
        failed
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'send_template') {
      // Get template
      const { data: template } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (!template) {
        return new Response(JSON.stringify({ 
          error: 'Template not found' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        });
      }

      // Get lead info
      let leadData = null;
      if (leadId) {
        const { data } = await supabase
          .from('crm_leads')
          .select('*')
          .eq('id', leadId)
          .single();
        leadData = data;
      }

      // Replace variables in template
      let finalMessage = template.content;
      const allVariables = {
        ...variables,
        nome: leadData?.name?.split(' ')[0] || variables.nome || '',
        nome_completo: leadData?.name || variables.nome_completo || '',
        telefone: leadData?.phone || phone || '',
        email: leadData?.email || '',
        ...leadData?.custom_fields
      };

      for (const [key, value] of Object.entries(allVariables)) {
        finalMessage = finalMessage.replace(new RegExp(`{{${key}}}`, 'gi'), String(value));
      }

      // Queue message
      await supabase
        .from('whatsapp_dispatch_queue')
        .insert({
          lead_id: leadId,
          template_id: templateId,
          phone: phone || leadData?.phone,
          message: finalMessage,
          status: 'pending',
          scheduled_for: new Date().toISOString()
        });

      // Log interaction
      if (leadId) {
        await supabase
          .from('crm_lead_interactions')
          .insert({
            lead_id: leadId,
            type: 'whatsapp',
            direction: 'outbound',
            content: finalMessage,
            channel: 'whatsapp'
          });
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Mensagem adicionada à fila',
        preview: finalMessage.slice(0, 100) + '...'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'send_direct') {
      // Direct send without template
      if (!phone || !message) {
        return new Response(JSON.stringify({ 
          error: 'phone and message are required' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        });
      }

      // Queue message
      await supabase
        .from('whatsapp_dispatch_queue')
        .insert({
          lead_id: leadId,
          phone,
          message,
          media_url: mediaUrl,
          media_type: mediaType,
          status: 'pending',
          scheduled_for: new Date().toISOString()
        });

      // Log if lead provided
      if (leadId) {
        await supabase
          .from('crm_lead_interactions')
          .insert({
            lead_id: leadId,
            type: 'whatsapp',
            direction: 'outbound',
            content: message,
            channel: 'whatsapp'
          });
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Mensagem adicionada à fila'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'send_bulk') {
      const { leadIds, templateId: bulkTemplateId, variables: bulkVars = {} } = await req.json();

      if (!leadIds?.length || !bulkTemplateId) {
        return new Response(JSON.stringify({ 
          error: 'leadIds and templateId are required' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        });
      }

      // Get template
      const { data: template } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('id', bulkTemplateId)
        .single();

      if (!template) {
        return new Response(JSON.stringify({ error: 'Template not found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        });
      }

      // Get leads
      const { data: leads } = await supabase
        .from('crm_leads')
        .select('*')
        .in('id', leadIds);

      let queued = 0;
      for (const lead of leads || []) {
        if (!lead.phone) continue;

        let msg = template.content;
        const vars = {
          ...bulkVars,
          nome: lead.name?.split(' ')[0] || '',
          nome_completo: lead.name || '',
          telefone: lead.phone || '',
          email: lead.email || ''
        };

        for (const [key, value] of Object.entries(vars)) {
          msg = msg.replace(new RegExp(`{{${key}}}`, 'gi'), String(value));
        }

        await supabase
          .from('whatsapp_dispatch_queue')
          .insert({
            lead_id: lead.id,
            template_id: bulkTemplateId,
            phone: lead.phone,
            message: msg,
            status: 'pending',
            scheduled_for: new Date(Date.now() + queued * 5000).toISOString() // 5s delay between
          });

        queued++;
      }

      return new Response(JSON.stringify({
        success: true,
        message: `${queued} mensagens adicionadas à fila`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      error: 'Invalid action',
      validActions: ['send_template', 'send_direct', 'send_bulk', 'process_queue']
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });

  } catch (error: any) {
    console.error('WhatsApp send error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
