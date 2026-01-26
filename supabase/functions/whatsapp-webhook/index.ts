import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function normalizeInstanceName(payload: any, chat: any) {
  return (
    chat?.instance_name ||
    chat?.instanceName ||
    payload?.instance_name ||
    payload?.instanceName ||
    payload?.instance ||
    payload?.data?.instance ||
    payload?.data?.instance_name
  );
}

function normalizeInstanceKey(raw: string): string {
  // Normaliza para o padrão que usamos no banco (ex: "Kamylle - Farmer" -> "KAMYLLE_FARMER")
  const s = String(raw)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
  return s;
}

async function findInstance(
  supabaseClient: any,
  instanceNameRaw: string,
): Promise<{ id: string; organization_id: string } | null> {
  const raw = String(instanceNameRaw || '').trim();
  if (!raw) return null;

  const normalized = normalizeInstanceKey(raw);
  const firstToken = normalized.split('_').filter(Boolean)[0];

  // 1) Tentativa direta: como veio do provedor
  {
    const { data } = await supabaseClient
      .from('whatsapp_instances')
      .select('id, organization_id')
      .eq('instance_name', raw)
      .maybeSingle();
    if (data) return data;
  }

  // 2) Tentativa direta: normalizado (muito comum: "Nome - Cargo" -> "NOME_CARGO")
  {
    const { data } = await supabaseClient
      .from('whatsapp_instances')
      .select('id, organization_id')
      .eq('instance_name', normalized)
      .maybeSingle();
    if (data) return data;
  }

  // 3) Fallback: match parcial pelo primeiro token (ex: VIVI -> VIVI_CS)
  if (firstToken) {
    const { data, error } = await supabaseClient
      .from('whatsapp_instances')
      .select('id, organization_id, instance_name')
      .ilike('instance_name', `%${firstToken}%`)
      .limit(2);

    if (!error && Array.isArray(data) && data.length === 1) {
      return { id: data[0].id, organization_id: data[0].organization_id };
    }
  }

  return null;
}

function normalizeRemoteJid(raw?: string | null) {
  if (!raw) return '';
  const v = String(raw).trim();
  if (!v) return '';

  // UAZAPI às vezes manda somente o número (ex: "551199...")
  if (/^\d{8,}$/.test(v)) return `${v}@s.whatsapp.net`;

  // Alguns provedores usam @c.us (conversão para padrão do Baileys)
  if (v.endsWith('@c.us')) return v.replace('@c.us', '@s.whatsapp.net');

  // Já está no formato esperado (@s.whatsapp.net ou @g.us)
  return v;
}

// Função auxiliar para buscar ou criar chat
async function getOrCreateChat(
  supabaseClient: any, 
  remoteJid: string, 
  instanceId: string,
  organizationId: string,
  messageTimestamp: string,
  fromMe: boolean
) {
  // Buscar chat existente
  const { data: existingChat, error: fetchError } = await supabaseClient
    .from('whatsapp_chats')
    .select('*')
    .eq('remote_jid', remoteJid)
    .eq('instance_id', instanceId)
    .maybeSingle();

  if (fetchError) {
    console.error('❌ Erro ao buscar chat:', fetchError);
    throw new Error(`FAILED_TO_FETCH_CHAT: ${fetchError.message}`);
  }

  if (existingChat) {
    // ✅ Regra: se o chat já existir, atualizar timestamp e unread_count ANTES de inserir a mensagem
    const nextUnreadCount = fromMe ? (existingChat.unread_count ?? 0) : (existingChat.unread_count ?? 0) + 1;

    const { data: updatedChat, error: updateError } = await supabaseClient
      .from('whatsapp_chats')
      .update({
        last_message_timestamp: messageTimestamp,
        unread_count: nextUnreadCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingChat.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erro ao atualizar chat existente:', updateError);
      throw new Error(`FAILED_TO_UPDATE_CHAT: ${updateError.message}`);
    }

    return updatedChat;
  }

  // Criar novo chat com organization_id, timestamp e unread_count
  const { data: newChat, error } = await supabaseClient
    .from('whatsapp_chats')
    .insert({
      instance_id: instanceId,
      organization_id: organizationId,
      remote_jid: remoteJid,
      contact_number: remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', ''),
      is_group: remoteJid.includes('@g.us'),
      last_message_timestamp: messageTimestamp,
      unread_count: fromMe ? 0 : 1,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Erro ao criar chat:', error);
    throw new Error(`FAILED_TO_CREATE_CHAT: ${error.message}`);
  }

  console.log('✅ Novo chat criado:', newChat.id, 'para', remoteJid);
  return newChat;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    
    console.log('📥 Webhook UAZAPI recebido:', JSON.stringify(payload).substring(0, 500));

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Processar evento de mensagem
    if (payload.EventType === "messages" || payload.event === "messages.upsert") {
      // Alguns formatos vêm como payload.data.message / payload.message
      const message = payload.message || payload.data?.message;
      const chat = payload.chat || payload.data;
      
      if (!message || !chat) {
        console.log('⚠️ Payload incompleto - message ou chat ausente');
        return new Response(
          JSON.stringify({ success: false, error: 'INCOMPLETE_PAYLOAD' }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const remoteJidRaw = chat.wa_chatid || message.key?.remoteJid || chat.remoteJid;
      const remoteJid = normalizeRemoteJid(remoteJidRaw);
      const instanceName = normalizeInstanceName(payload, chat);
      
      if (!remoteJid) {
        return new Response(
          JSON.stringify({ success: false, error: 'MISSING_REMOTE_JID' }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      if (!instanceName) {
        return new Response(
          JSON.stringify({ success: false, error: 'MISSING_INSTANCE_NAME' }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Buscar instância pelo nome (com normalização e fallback)
      const instance = await findInstance(supabaseClient, instanceName);
      if (!instance) {
        console.error('⚠️ Instância não encontrada:', { instanceNameRaw: instanceName, normalized: normalizeInstanceKey(instanceName) });
        return new Response(
          JSON.stringify({ success: false, error: 'INSTANCE_NOT_FOUND' }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }

      // Extrair dados da mensagem para criar chat com valores corretos
      const fromMe = message.fromMe ?? message.key?.fromMe ?? false;
      const senderName = message.senderName || message.pushName || '';
      const messageType = message.messageType || message.type || 'text';
      const messageTimestamp = message.messageTimestamp 
        ? new Date(typeof message.messageTimestamp === 'number' 
            ? message.messageTimestamp * 1000 
            : message.messageTimestamp).toISOString()
        : new Date().toISOString();
      const contactPhotoUrl = chat.imagePreview || chat.profilePictureUrl || '';

      // Buscar ou criar chat (com timestamp e unread_count)
      let chatRecord;
      try {
        chatRecord = await getOrCreateChat(
          supabaseClient, 
          remoteJid, 
          instance.id, 
          instance.organization_id,
          messageTimestamp,
          fromMe
        );
      } catch (chatError: any) {
        console.error('❌ Erro crítico ao buscar/criar chat:', chatError);
        return new Response(
          JSON.stringify({ success: false, error: chatError.message || 'FAILED_TO_GET_OR_CREATE_CHAT' }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      // Atualizar nome do contato se necessário
      if (!fromMe && senderName && senderName !== chatRecord.contact_name) {
        const { error: updateNameError } = await supabaseClient
          .from('whatsapp_chats')
          .update({ 
            contact_name: senderName,
            updated_at: new Date().toISOString()
          })
          .eq('id', chatRecord.id);
        
        if (updateNameError) {
          console.error('⚠️ Erro ao atualizar contact_name:', updateNameError);
        }
      }

      // Atualizar foto do contato se necessário
      if (contactPhotoUrl && contactPhotoUrl !== chatRecord.contact_photo_url) {
        const { error: updatePhotoError } = await supabaseClient
          .from('whatsapp_chats')
          .update({ 
            contact_photo_url: contactPhotoUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', chatRecord.id);
        
        if (updatePhotoError) {
          console.error('⚠️ Erro ao atualizar contact_photo_url:', updatePhotoError);
        }
      }

      // Extrair conteúdo da mensagem
      let content = message.text || message.body || message.caption || '';
      if (messageType === 'audio') content = '[Áudio]';
      if (messageType === 'image') content = message.caption || '[Imagem]';
      if (messageType === 'video') content = message.caption || '[Vídeo]';
      if (messageType === 'document') content = '[Documento]';
      if (messageType === 'sticker') content = '[Sticker]';
      if (messageType === 'location') content = '[Localização]';
      if (messageType === 'contact') content = '[Contato]';

      // Extrair URL de mídia se existir
      const mediaUrl = message.content?.url || message.mediaUrl || null;

      // Salvar mensagem (upsert para evitar duplicatas)
      const { error: messageError } = await supabaseClient
        .from('whatsapp_messages')
        .upsert({
          chat_id: chatRecord.id,
          message_id: message.messageid || message.key?.id || `${Date.now()}`,
          from_me: fromMe,
          sender_name: fromMe ? instanceName : senderName,
          content: content,
          message_type: messageType,
          media_url: mediaUrl,
          message_timestamp: messageTimestamp,
          raw_data: payload,
          transcription_status: messageType === 'audio' ? 'pending' : null,
        }, {
          onConflict: 'chat_id,message_id'
        });

      if (messageError) {
        console.error('❌ Erro crítico ao salvar mensagem:', messageError);
        return new Response(
          JSON.stringify({ success: false, error: 'FAILED_TO_SAVE_MESSAGE' }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      console.log('✅ Mensagem processada com sucesso');

      return new Response(
        JSON.stringify({ success: true, chat_id: chatRecord.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Processar outros eventos (conexão, status, etc.)
    if (payload.EventType === "connection" || payload.event === "connection.update") {
      const status = payload.status || payload.data?.state;
      const instanceName = payload.instance_name || payload.instance || payload.instanceName;

      if (instanceName && status) {
        const instance = await findInstance(supabaseClient, instanceName);
        if (instance) {
          await supabaseClient
            .from('whatsapp_instances')
            .update({
              status: status,
              updated_at: new Date().toISOString(),
            })
            .eq('id', instance.id);
        } else {
          console.error('⚠️ Instância não encontrada (connection):', { instanceNameRaw: instanceName, normalized: normalizeInstanceKey(instanceName) });
        }
          
        console.log(`📡 Status da instância ${instanceName}: ${status}`);
      }

      return new Response(
        JSON.stringify({ success: true, event: 'connection_update' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Processar QR Code
    if (payload.EventType === "qrcode" || payload.event === "qrcode.updated") {
      const qrCode = payload.qrcode || payload.data?.qrcode;
      const instanceName = payload.instance_name || payload.instance || payload.instanceName;

      if (instanceName && qrCode) {
        const instance = await findInstance(supabaseClient, instanceName);
        if (instance) {
          await supabaseClient
            .from('whatsapp_instances')
            .update({
              qr_code: qrCode,
              status: 'awaiting_scan',
              updated_at: new Date().toISOString(),
            })
            .eq('id', instance.id);
        } else {
          console.error('⚠️ Instância não encontrada (qrcode):', { instanceNameRaw: instanceName, normalized: normalizeInstanceKey(instanceName) });
        }
          
        console.log(`📱 QR Code atualizado para instância ${instanceName}`);
      }

      return new Response(
        JSON.stringify({ success: true, event: 'qrcode_update' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Evento não reconhecido - apenas log
    console.log('ℹ️ Evento não processado:', payload.EventType || payload.event);
    
    return new Response(
      JSON.stringify({ success: true, message: 'Evento recebido' }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('❌ Erro no webhook:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
