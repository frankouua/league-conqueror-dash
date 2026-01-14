import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClickSignPayload {
  action: 'send_contract' | 'check_status' | 'webhook' | 'list_templates';
  lead_id?: string;
  template_ids?: string[];
  signer_email?: string;
  signer_phone?: string;
  document_key?: string;
  webhook_data?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: ClickSignPayload = await req.json();

    // Buscar configuração do ClickSign
    const { data: config } = await supabase
      .from('contract_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (!config && payload.action !== 'webhook') {
      return new Response(
        JSON.stringify({ success: false, error: 'ClickSign não configurado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const clicksignHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // Listar templates disponíveis
    if (payload.action === 'list_templates') {
      const { data: templates } = await supabase
        .from('contract_templates')
        .select('*')
        .eq('is_active', true)
        .order('is_required', { ascending: false });

      return new Response(
        JSON.stringify({ success: true, templates }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enviar contratos para assinatura
    if (payload.action === 'send_contract') {
      if (!payload.lead_id || !payload.template_ids?.length) {
        return new Response(
          JSON.stringify({ success: false, error: 'lead_id e template_ids são obrigatórios' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Buscar dados do lead
      const { data: lead } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('id', payload.lead_id)
        .single();

      if (!lead) {
        return new Response(
          JSON.stringify({ success: false, error: 'Lead não encontrado' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      // Buscar templates selecionados
      const { data: templates } = await supabase
        .from('contract_templates')
        .select('*')
        .in('id', payload.template_ids);

      const results = [];
      const signerEmail = payload.signer_email || lead.email;
      const signerPhone = payload.signer_phone || lead.whatsapp || lead.phone;

      for (const template of templates || []) {
        try {
          // 1. Criar documento a partir do template no ClickSign
          const createDocResponse = await fetch(
            `${config.api_url}/documents?access_token=${config.api_key}`,
            {
              method: 'POST',
              headers: clicksignHeaders,
              body: JSON.stringify({
                document: {
                  path: `/${template.template_key}`,
                  template: {
                    data: {
                      nome_paciente: lead.name,
                      cpf_paciente: lead.cpf || '',
                      email_paciente: lead.email || '',
                      telefone_paciente: lead.phone || '',
                      procedimento: lead.interested_procedures?.join(', ') || '',
                      valor: lead.contract_value || lead.estimated_value || 0,
                      data_cirurgia: lead.surgery_date || ''
                    }
                  }
                }
              })
            }
          );

          const docResult = await createDocResponse.json();
          
          if (!createDocResponse.ok) {
            results.push({
              template_id: template.id,
              template_name: template.name,
              success: false,
              error: docResult.errors || 'Erro ao criar documento'
            });
            continue;
          }

          const documentKey = docResult.document.key;

          // 2. Adicionar signatário
          const addSignerResponse = await fetch(
            `${config.api_url}/signers?access_token=${config.api_key}`,
            {
              method: 'POST',
              headers: clicksignHeaders,
              body: JSON.stringify({
                signer: {
                  email: signerEmail,
                  phone_number: signerPhone,
                  auths: ['email', 'sms'],
                  name: lead.name,
                  documentation: lead.cpf || '',
                  birthday: lead.birth_date || '',
                  sign_as: 'sign'
                }
              })
            }
          );

          const signerResult = await addSignerResponse.json();
          const signerKey = signerResult.signer?.key;

          // 3. Vincular signatário ao documento
          if (signerKey) {
            await fetch(
              `${config.api_url}/lists?access_token=${config.api_key}`,
              {
                method: 'POST',
                headers: clicksignHeaders,
                body: JSON.stringify({
                  list: {
                    document_key: documentKey,
                    signer_key: signerKey,
                    sign_as: 'sign',
                    message: `Olá ${lead.name}, segue o contrato para assinatura digital.`
                  }
                })
              }
            );
          }

          // 4. Enviar notificação para assinatura
          await fetch(
            `${config.api_url}/notifications?access_token=${config.api_key}`,
            {
              method: 'POST',
              headers: clicksignHeaders,
              body: JSON.stringify({
                request_signature_key: documentKey,
                message: `Olá ${lead.name}, você recebeu um documento para assinatura: ${template.name}. Por favor, revise e assine.`
              })
            }
          );

          // 5. Salvar no banco
          await supabase
            .from('lead_contracts')
            .insert({
              lead_id: payload.lead_id,
              template_id: template.id,
              clicksign_document_key: documentKey,
              status: 'sent',
              sent_at: new Date().toISOString(),
              signer_email: signerEmail,
              signer_phone: signerPhone,
              document_url: `https://app.clicksign.com/sign/${documentKey}`
            });

          results.push({
            template_id: template.id,
            template_name: template.name,
            success: true,
            document_key: documentKey
          });

        } catch (error: any) {
          results.push({
            template_id: template.id,
            template_name: template.name,
            success: false,
            error: error?.message || 'Unknown error'
          });
        }
      }

      // Registrar no histórico do lead
      await supabase
        .from('crm_lead_history')
        .insert({
          lead_id: payload.lead_id,
          action: 'contracts_sent',
          description: `${results.filter(r => r.success).length} contrato(s) enviado(s) para assinatura`,
          metadata: { results }
        });

      return new Response(
        JSON.stringify({ 
          success: true, 
          results,
          summary: {
            total: results.length,
            sent: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar status de um contrato
    if (payload.action === 'check_status') {
      if (!payload.document_key) {
        return new Response(
          JSON.stringify({ success: false, error: 'document_key é obrigatório' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const response = await fetch(
        `${config.api_url}/documents/${payload.document_key}?access_token=${config.api_key}`,
        { headers: clicksignHeaders }
      );

      const result = await response.json();

      if (response.ok) {
        const status = result.document.status;
        
        // Atualizar status no banco
        await supabase
          .from('lead_contracts')
          .update({
            status: status === 'signed' ? 'signed' : 
                   status === 'cancelled' ? 'cancelled' : 
                   status === 'running' ? 'sent' : 'pending',
            signed_at: status === 'signed' ? new Date().toISOString() : null,
            signed_document_url: result.document.downloads?.signed_file_url
          })
          .eq('clicksign_document_key', payload.document_key);

        return new Response(
          JSON.stringify({ success: true, status, document: result.document }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: result.errors }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Webhook do ClickSign
    if (payload.action === 'webhook') {
      const webhookData = payload.webhook_data;
      
      if (!webhookData?.document?.key) {
        return new Response(
          JSON.stringify({ success: true, message: 'Webhook recebido' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const documentKey = webhookData.document.key;
      const event = webhookData.event?.name;

      // Buscar contrato
      const { data: contract } = await supabase
        .from('lead_contracts')
        .select('*, crm_leads(name, assigned_to)')
        .eq('clicksign_document_key', documentKey)
        .single();

      if (contract) {
        let newStatus = contract.status;
        let updateData: any = {};

        if (event === 'sign' || event === 'auto_close') {
          newStatus = 'signed';
          updateData = {
            status: 'signed',
            signed_at: new Date().toISOString(),
            signed_document_url: webhookData.document.downloads?.signed_file_url
          };
        } else if (event === 'cancel') {
          newStatus = 'cancelled';
          updateData = {
            status: 'cancelled',
            cancelled_at: new Date().toISOString()
          };
        } else if (event === 'viewed') {
          updateData = {
            viewed_at: new Date().toISOString()
          };
        }

        await supabase
          .from('lead_contracts')
          .update(updateData)
          .eq('id', contract.id);

        // Registrar no histórico
        await supabase
          .from('crm_lead_history')
          .insert({
            lead_id: contract.lead_id,
            action: `contract_${event}`,
            description: `Contrato ${event === 'sign' ? 'assinado' : event === 'cancel' ? 'cancelado' : 'visualizado'}`,
            metadata: { document_key: documentKey, event }
          });

        // Notificar vendedor se assinado
        if (event === 'sign' && contract.crm_leads?.assigned_to) {
          await supabase
            .from('notifications')
            .insert({
              user_id: contract.crm_leads.assigned_to,
              title: '✅ Contrato Assinado!',
              message: `${contract.crm_leads.name} assinou o contrato`,
              type: 'contract_signed'
            });
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Ação não reconhecida' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error: any) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
