import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    return existingChat;
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
      const message = payload.message || payload.data?.message;
      const chat = payload.chat || payload.data;
      
      if (!message || !chat) {
        console.log('⚠️ Payload incompleto - message ou chat ausente');
        return new Response(
          JSON.stringify({ success: false, error: 'INCOMPLETE_PAYLOAD' }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const remoteJid = chat.wa_chatid || message.key?.remoteJid || chat.remoteJid;
      const instanceName = chat.instance_name || payload.instance;
      
      if (!remoteJid) {
        return new Response(
          JSON.stringify({ success: false, error: 'MISSING_REMOTE_JID' }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Buscar instância pelo nome
      const { data: instance, error: instanceError } = await supabaseClient
        .from('whatsapp_instances')
        .select('id, organization_id')
        .eq('instance_name', instanceName)
        .single();

      if (instanceError || !instance) {
        console.error('⚠️ Instância não encontrada:', instanceName, instanceError);
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

      // Atualizar timestamp da última mensagem e contador de não lidas
      const updateData: any = {
        last_message_timestamp: messageTimestamp,
        updated_at: new Date().toISOString()
      };

      if (!fromMe) {
        updateData.unread_count = (chatRecord.unread_count || 0) + 1;
      }

      const { error: updateChatError } = await supabaseClient
        .from('whatsapp_chats')
        .update(updateData)
        .eq('id', chatRecord.id);

      if (updateChatError) {
        console.error('❌ Erro crítico ao atualizar chat:', updateChatError);
        return new Response(
          JSON.stringify({ success: false, error: 'FAILED_TO_UPDATE_CHAT' }),
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
      const instanceName = payload.instance_name || payload.instance;

      if (instanceName && status) {
        await supabaseClient
          .from('whatsapp_instances')
          .update({ 
            status: status,
            updated_at: new Date().toISOString()
          })
          .eq('instance_name', instanceName);
          
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
      const instanceName = payload.instance_name || payload.instance;

      if (instanceName && qrCode) {
        await supabaseClient
          .from('whatsapp_instances')
          .update({ 
            qr_code: qrCode,
            status: 'awaiting_scan',
            updated_at: new Date().toISOString()
          })
          .eq('instance_name', instanceName);
          
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
