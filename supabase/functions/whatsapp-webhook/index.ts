import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

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

  // 2) Tentativa direta: normalizado
  {
    const { data } = await supabaseClient
      .from('whatsapp_instances')
      .select('id, organization_id')
      .eq('instance_name', normalized)
      .maybeSingle();
    if (data) return data;
  }

  // 3) Fallback: match parcial pelo primeiro token
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

  if (/^\d{8,}$/.test(v)) return `${v}@s.whatsapp.net`;
  if (v.endsWith('@c.us')) return v.replace('@c.us', '@s.whatsapp.net');
  return v;
}

function toISODateSafe(input: unknown): string {
  try {
    if (input === null || input === undefined) return new Date().toISOString();

    if (typeof input === 'number' && Number.isFinite(input)) {
      const ms = input > 1e12 ? input : input * 1000;
      const d = new Date(ms);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
      return new Date().toISOString();
    }

    if (typeof input === 'string') {
      const s = input.trim();
      if (!s) return new Date().toISOString();

      if (/^\d{9,16}$/.test(s)) {
        const n = Number(s);
        if (Number.isFinite(n)) {
          const ms = n > 1e12 ? n : n * 1000;
          const d = new Date(ms);
          if (!Number.isNaN(d.getTime())) return d.toISOString();
        }
      }

      const d = new Date(s);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
      return new Date().toISOString();
    }

    const d = new Date(String(input));
    if (!Number.isNaN(d.getTime())) return d.toISOString();
    return new Date().toISOString();
  } catch {
    return new Date().toISOString();
  }
}

// =====================================================
// CHAT HELPER
// =====================================================

async function getOrCreateChat(
  supabaseClient: any, 
  remoteJid: string, 
  instanceId: string,
  organizationId: string,
  messageTimestamp: string,
  fromMe: boolean
) {
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

// =====================================================
// EVENT HANDLERS - NASA LEVEL IMPLEMENTATION
// =====================================================

// Handler: MESSAGES
async function handleMessages(supabaseClient: any, payload: any) {
  const chat = payload.chat || payload.data?.chat || payload.data || null;
  const messageCandidate =
    payload.message ||
    payload.data?.message ||
    payload.event ||
    payload.data?.event ||
    (Array.isArray(payload.messages) ? payload.messages[0] : null) ||
    (Array.isArray(payload.data?.messages) ? payload.data.messages[0] : null) ||
    null;

  const message = Array.isArray(messageCandidate) ? messageCandidate[0] : messageCandidate;
  
  if (!chat) {
    console.log('⚠️ Payload sem chat (messages):', { topKeys: Object.keys(payload || {}) });
    return { success: false, error: 'MISSING_CHAT' };
  }

  if (!message) {
    console.log('⚠️ Payload sem message (messages):', { topKeys: Object.keys(payload || {}) });
    return { success: false, error: 'MISSING_MESSAGE' };
  }

  const remoteJidRaw =
    chat.wa_chatid || chat.chatid || chat.Chat ||
    message.key?.remoteJid || message.remoteJid || message.Chat ||
    payload?.event?.Chat || payload?.data?.event?.Chat || chat.remoteJid;
  const remoteJid = normalizeRemoteJid(remoteJidRaw);
  const instanceName = normalizeInstanceName(payload, chat);
  
  if (!remoteJid) return { success: false, error: 'MISSING_REMOTE_JID' };
  if (!instanceName) return { success: false, error: 'MISSING_INSTANCE_NAME' };

  const instance = await findInstance(supabaseClient, instanceName);
  if (!instance) {
    console.error('⚠️ Instância não encontrada:', { instanceNameRaw: instanceName, normalized: normalizeInstanceKey(instanceName) });
    return { success: false, error: 'INSTANCE_NOT_FOUND' };
  }

  const fromMe = message.fromMe ?? message.key?.fromMe ?? false;
  const senderName = message.senderName || message.pushName || '';
  const messageType = message.messageType || message.type || 'text';
  const messageTimestamp = toISODateSafe(
    message.messageTimestamp ?? message.Timestamp ?? payload?.event?.Timestamp ?? payload?.data?.event?.Timestamp
  );
  const contactPhotoUrl = chat.imagePreview || chat.profilePictureUrl || '';

  let chatRecord;
  try {
    chatRecord = await getOrCreateChat(
      supabaseClient, remoteJid, instance.id, instance.organization_id, messageTimestamp, fromMe
    );
  } catch (chatError: any) {
    console.error('❌ Erro crítico ao buscar/criar chat:', chatError);
    return { success: false, error: chatError.message || 'FAILED_TO_GET_OR_CREATE_CHAT' };
  }

  // Atualizar nome e foto do contato
  if (!fromMe && senderName && senderName !== chatRecord.contact_name) {
    await supabaseClient.from('whatsapp_chats').update({ contact_name: senderName, updated_at: new Date().toISOString() }).eq('id', chatRecord.id);
  }
  if (contactPhotoUrl && contactPhotoUrl !== chatRecord.contact_photo_url) {
    await supabaseClient.from('whatsapp_chats').update({ contact_photo_url: contactPhotoUrl, updated_at: new Date().toISOString() }).eq('id', chatRecord.id);
  }

  // Extrair conteúdo
  let content = message.text || message.body || message.caption || '';
  if (messageType === 'audio') content = '[Áudio]';
  if (messageType === 'image') content = message.caption || '[Imagem]';
  if (messageType === 'video') content = message.caption || '[Vídeo]';
  if (messageType === 'document') content = '[Documento]';
  if (messageType === 'sticker') content = '[Sticker]';
  if (messageType === 'location') content = '[Localização]';
  if (messageType === 'contact') content = '[Contato]';

  const mediaUrl = message.content?.url || message.mediaUrl || null;

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
    }, { onConflict: 'chat_id,message_id' });

  if (messageError) {
    console.error('❌ Erro crítico ao salvar mensagem:', messageError);
    return { success: false, error: 'FAILED_TO_SAVE_MESSAGE' };
  }

  console.log('✅ Mensagem processada com sucesso');
  return { success: true, chat_id: chatRecord.id };
}

// Handler: MESSAGES_UPDATE (Read/Delivered Status)
async function handleMessagesUpdate(supabaseClient: any, payload: any) {
  const event = payload.event || payload.data?.event || {};
  const instanceName = payload.instanceName || payload.instance_name;
  const messageIds = event.MessageIDs || [];
  const updateType = event.Type || payload.state; // "Read", "Delivered", "Played"
  const chatJid = normalizeRemoteJid(event.Chat || event.chatid);

  if (!instanceName || messageIds.length === 0) {
    return { success: true, event: 'messages_update', skipped: true };
  }

  const instance = await findInstance(supabaseClient, instanceName);
  if (!instance) {
    console.log('⚠️ Instância não encontrada para messages_update:', instanceName);
    return { success: true, event: 'messages_update', skipped: true };
  }

  // Mapear status UAZAPI para nosso sistema
  const statusMap: Record<string, string> = {
    'Sent': 'sent',
    'Delivered': 'delivered',
    'Read': 'read',
    'Played': 'played',
    'Error': 'error',
  };
  const newStatus = statusMap[updateType] || updateType?.toLowerCase() || 'unknown';

  // Atualizar status das mensagens
  for (const msgId of messageIds) {
    const { error } = await supabaseClient
      .from('whatsapp_messages')
      .update({ status: newStatus })
      .eq('message_id', msgId);
    
    if (error) {
      console.error('⚠️ Erro ao atualizar status da mensagem:', msgId, error);
    }
  }

  console.log(`📨 Status ${newStatus} aplicado a ${messageIds.length} mensagens em ${instanceName}`);
  return { success: true, event: 'messages_update', status: newStatus, count: messageIds.length };
}

// Handler: CONNECTION
async function handleConnection(supabaseClient: any, payload: any) {
  const status = payload.status || payload.data?.state || payload.state;
  const instanceName = payload.instance_name || payload.instance || payload.instanceName;

  if (!instanceName || !status) {
    return { success: true, event: 'connection', skipped: true };
  }

  const instance = await findInstance(supabaseClient, instanceName);
  if (instance) {
    await supabaseClient
      .from('whatsapp_instances')
      .update({ status: status, updated_at: new Date().toISOString() })
      .eq('id', instance.id);
    console.log(`📡 Status da instância ${instanceName}: ${status}`);
  } else {
    console.error('⚠️ Instância não encontrada (connection):', instanceName);
  }

  return { success: true, event: 'connection_update', status };
}

// Handler: QRCODE
async function handleQRCode(supabaseClient: any, payload: any) {
  const qrCode = payload.qrcode || payload.data?.qrcode || payload.base64;
  const instanceName = payload.instance_name || payload.instance || payload.instanceName;

  if (!instanceName || !qrCode) {
    return { success: true, event: 'qrcode', skipped: true };
  }

  const instance = await findInstance(supabaseClient, instanceName);
  if (instance) {
    await supabaseClient
      .from('whatsapp_instances')
      .update({ qr_code: qrCode, status: 'awaiting_scan', updated_at: new Date().toISOString() })
      .eq('id', instance.id);
    console.log(`📱 QR Code atualizado para instância ${instanceName}`);
  } else {
    console.error('⚠️ Instância não encontrada (qrcode):', instanceName);
  }

  return { success: true, event: 'qrcode_update' };
}

// Handler: PRESENCE (Typing, Recording, Online)
async function handlePresence(supabaseClient: any, payload: any) {
  const event = payload.event || payload.data?.event || {};
  const state = event.State || event.state; // "composing", "recording", "paused", "available", "unavailable"
  const chatJid = normalizeRemoteJid(event.Chat || event.chatid);
  const instanceName = payload.instanceName || payload.instance_name;

  if (!instanceName || !chatJid || !state) {
    return { success: true, event: 'presence', skipped: true };
  }

  const instance = await findInstance(supabaseClient, instanceName);
  if (!instance) {
    return { success: true, event: 'presence', skipped: true };
  }

  // Buscar chat
  const { data: chat } = await supabaseClient
    .from('whatsapp_chats')
    .select('id')
    .eq('instance_id', instance.id)
    .eq('remote_jid', chatJid)
    .maybeSingle();

  if (chat) {
    const updates: any = { updated_at: new Date().toISOString() };
    
    if (state === 'composing') {
      updates.is_typing = true;
      updates.is_recording = false;
      updates.typing_at = new Date().toISOString();
    } else if (state === 'recording') {
      updates.is_typing = false;
      updates.is_recording = true;
      updates.typing_at = new Date().toISOString();
    } else if (state === 'paused' || state === 'available' || state === 'unavailable') {
      updates.is_typing = false;
      updates.is_recording = false;
    }
    
    if (state === 'available') {
      updates.is_online = true;
      updates.last_seen_at = new Date().toISOString();
    } else if (state === 'unavailable') {
      updates.is_online = false;
      updates.last_seen_at = new Date().toISOString();
    }

    await supabaseClient.from('whatsapp_chats').update(updates).eq('id', chat.id);
    console.log(`👤 Presença: ${state} em ${chatJid}`);
  }

  return { success: true, event: 'presence', state };
}

// Handler: HISTORY (Bulk Sync)
async function handleHistory(supabaseClient: any, payload: any) {
  const instanceName = payload.instanceName || payload.instance_name;
  const messages = payload.messages || payload.data?.messages || [];
  const chats = payload.chats || payload.data?.chats || [];

  if (!instanceName) {
    return { success: true, event: 'history', skipped: true };
  }

  const instance = await findInstance(supabaseClient, instanceName);
  if (!instance) {
    console.log('⚠️ Instância não encontrada para history:', instanceName);
    return { success: true, event: 'history', skipped: true };
  }

  // Registrar sync
  const { data: syncRecord } = await supabaseClient
    .from('whatsapp_sync_history')
    .insert({
      instance_id: instance.id,
      sync_type: 'messages',
      status: 'running',
      total_items: messages.length + chats.length,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  let processedCount = 0;

  // Processar chats do histórico
  for (const chatData of chats) {
    try {
      const remoteJid = normalizeRemoteJid(chatData.id || chatData.jid || chatData.chatid);
      if (!remoteJid) continue;

      await supabaseClient.from('whatsapp_chats').upsert({
        instance_id: instance.id,
        organization_id: instance.organization_id,
        remote_jid: remoteJid,
        contact_name: chatData.name || chatData.pushName || null,
        contact_number: remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', ''),
        is_group: remoteJid.includes('@g.us'),
        unread_count: chatData.unreadCount || 0,
        archived: chatData.archived || false,
        pinned: chatData.pinned || false,
      }, { onConflict: 'instance_id,remote_jid' });

      processedCount++;
    } catch (e) {
      console.error('⚠️ Erro ao processar chat do histórico:', e);
    }
  }

  // Atualizar sync record
  if (syncRecord) {
    await supabaseClient
      .from('whatsapp_sync_history')
      .update({
        status: 'completed',
        processed_items: processedCount,
        completed_at: new Date().toISOString(),
      })
      .eq('id', syncRecord.id);
  }

  console.log(`📚 Histórico sincronizado: ${processedCount} itens de ${instanceName}`);
  return { success: true, event: 'history', processed: processedCount };
}

// Handler: CONTACTS
async function handleContacts(supabaseClient: any, payload: any) {
  const instanceName = payload.instanceName || payload.instance_name;
  const contacts = payload.contacts || payload.data?.contacts || payload.event?.contacts || [];
  const singleContact = payload.contact || payload.data?.contact || payload.event;

  if (!instanceName) {
    return { success: true, event: 'contacts', skipped: true };
  }

  const instance = await findInstance(supabaseClient, instanceName);
  if (!instance) {
    return { success: true, event: 'contacts', skipped: true };
  }

  const contactList = Array.isArray(contacts) && contacts.length > 0 ? contacts : (singleContact ? [singleContact] : []);
  let processedCount = 0;

  for (const contact of contactList) {
    const jid = normalizeRemoteJid(contact.jid || contact.id || contact.wa_id);
    if (!jid) continue;

    try {
      await supabaseClient.from('whatsapp_contacts').upsert({
        instance_id: instance.id,
        remote_jid: jid,
        phone_number: jid.replace('@s.whatsapp.net', ''),
        push_name: contact.pushName || contact.notify || contact.name || null,
        business_name: contact.verifiedName || contact.businessName || null,
        profile_picture_url: contact.imgUrl || contact.profilePictureUrl || null,
        is_business: contact.isBusiness || false,
        verified_name: contact.verifiedName || null,
        raw_data: contact,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'instance_id,remote_jid' });

      // Também atualizar o chat se existir
      await supabaseClient
        .from('whatsapp_chats')
        .update({
          contact_name: contact.pushName || contact.notify || contact.name,
          contact_photo_url: contact.imgUrl || contact.profilePictureUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('instance_id', instance.id)
        .eq('remote_jid', jid);

      processedCount++;
    } catch (e) {
      console.error('⚠️ Erro ao processar contato:', e);
    }
  }

  console.log(`📇 ${processedCount} contatos sincronizados de ${instanceName}`);
  return { success: true, event: 'contacts', processed: processedCount };
}

// Handler: GROUPS
async function handleGroups(supabaseClient: any, payload: any) {
  const instanceName = payload.instanceName || payload.instance_name;
  const event = payload.event || payload.data?.event || {};
  const groupJid = normalizeRemoteJid(event.JID || event.jid || event.id);

  if (!instanceName) {
    return { success: true, event: 'groups', skipped: true };
  }

  const instance = await findInstance(supabaseClient, instanceName);
  if (!instance || !groupJid) {
    return { success: true, event: 'groups', skipped: true };
  }

  // Upsert grupo
  const groupData: any = {
    instance_id: instance.id,
    group_jid: groupJid,
    updated_at: new Date().toISOString(),
  };

  if (event.Name !== undefined) groupData.subject = event.Name;
  if (event.Topic !== undefined) groupData.description = event.Topic;
  if (event.Announce !== undefined) groupData.is_announce = event.Announce;
  if (event.Locked !== undefined) groupData.is_locked = event.Locked;
  if (event.Ephemeral !== undefined) {
    groupData.is_ephemeral = !!event.Ephemeral;
    groupData.ephemeral_duration = event.Ephemeral || null;
  }
  if (event.NewInviteLink) groupData.invite_link = event.NewInviteLink;
  if (event.Participants) groupData.participants = event.Participants;
  
  groupData.raw_data = payload;

  const { error } = await supabaseClient
    .from('whatsapp_groups')
    .upsert(groupData, { onConflict: 'instance_id,group_jid' });

  if (error) {
    console.error('⚠️ Erro ao atualizar grupo:', error);
  }

  // Também atualizar o chat correspondente
  await supabaseClient
    .from('whatsapp_chats')
    .update({
      group_metadata: {
        subject: groupData.subject,
        is_announce: groupData.is_announce,
        participants_count: event.Participants?.length || 0,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('instance_id', instance.id)
    .eq('remote_jid', groupJid);

  console.log(`👥 Grupo atualizado: ${groupJid} em ${instanceName}`);
  return { success: true, event: 'groups' };
}

// Handler: LABELS
async function handleLabels(supabaseClient: any, payload: any) {
  const instanceName = payload.instanceName || payload.instance_name;
  const labels = payload.labels || payload.data?.labels || payload.event?.labels || [];

  if (!instanceName) {
    return { success: true, event: 'labels', skipped: true };
  }

  const instance = await findInstance(supabaseClient, instanceName);
  if (!instance) {
    return { success: true, event: 'labels', skipped: true };
  }

  let processedCount = 0;

  for (const label of labels) {
    const labelId = label.id || label.labelId;
    if (!labelId) continue;

    try {
      await supabaseClient.from('whatsapp_labels').upsert({
        instance_id: instance.id,
        label_id: String(labelId),
        name: label.name || label.displayName || `Label ${labelId}`,
        color: label.color || label.hexColor || null,
        sort_order: label.order || label.sortOrder || 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'instance_id,label_id' });

      processedCount++;
    } catch (e) {
      console.error('⚠️ Erro ao processar label:', e);
    }
  }

  console.log(`🏷️ ${processedCount} labels sincronizadas de ${instanceName}`);
  return { success: true, event: 'labels', processed: processedCount };
}

// Handler: CHAT_LABELS
async function handleChatLabels(supabaseClient: any, payload: any) {
  const instanceName = payload.instanceName || payload.instance_name;
  const event = payload.event || payload.data?.event || {};
  const chatJid = normalizeRemoteJid(event.chatId || event.jid || event.Chat);
  const labelIds = event.labelIds || event.labels || [];
  const action = event.action || payload.action; // "add" or "remove"

  if (!instanceName || !chatJid) {
    return { success: true, event: 'chat_labels', skipped: true };
  }

  const instance = await findInstance(supabaseClient, instanceName);
  if (!instance) {
    return { success: true, event: 'chat_labels', skipped: true };
  }

  // Buscar chat
  const { data: chat } = await supabaseClient
    .from('whatsapp_chats')
    .select('id')
    .eq('instance_id', instance.id)
    .eq('remote_jid', chatJid)
    .maybeSingle();

  if (!chat) {
    return { success: true, event: 'chat_labels', skipped: true };
  }

  for (const labelIdRaw of labelIds) {
    // Buscar label
    const { data: label } = await supabaseClient
      .from('whatsapp_labels')
      .select('id')
      .eq('instance_id', instance.id)
      .eq('label_id', String(labelIdRaw))
      .maybeSingle();

    if (!label) continue;

    if (action === 'remove') {
      await supabaseClient
        .from('whatsapp_chat_labels')
        .delete()
        .eq('chat_id', chat.id)
        .eq('label_id', label.id);
    } else {
      await supabaseClient.from('whatsapp_chat_labels').upsert({
        chat_id: chat.id,
        label_id: label.id,
        assigned_at: new Date().toISOString(),
      }, { onConflict: 'chat_id,label_id' });
    }
  }

  console.log(`🏷️ Labels do chat ${chatJid} atualizadas em ${instanceName}`);
  return { success: true, event: 'chat_labels' };
}

// Handler: BLOCKS
async function handleBlocks(supabaseClient: any, payload: any) {
  const instanceName = payload.instanceName || payload.instance_name;
  const blockedList = payload.blocklist || payload.data?.blocklist || payload.event?.blocklist || [];
  const action = payload.action || payload.event?.action; // "block" or "unblock"
  const jid = normalizeRemoteJid(payload.event?.jid || payload.jid);

  if (!instanceName) {
    return { success: true, event: 'blocks', skipped: true };
  }

  const instance = await findInstance(supabaseClient, instanceName);
  if (!instance) {
    return { success: true, event: 'blocks', skipped: true };
  }

  // Se for ação única de block/unblock
  if (jid && action) {
    const isBlocked = action === 'block';
    
    await supabaseClient.from('whatsapp_contacts').upsert({
      instance_id: instance.id,
      remote_jid: jid,
      phone_number: jid.replace('@s.whatsapp.net', ''),
      is_blocked: isBlocked,
      blocked_at: isBlocked ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'instance_id,remote_jid' });

    console.log(`🚫 Contato ${jid} ${isBlocked ? 'bloqueado' : 'desbloqueado'} em ${instanceName}`);
    return { success: true, event: 'blocks', action, jid };
  }

  // Se for lista completa de bloqueados
  if (Array.isArray(blockedList) && blockedList.length > 0) {
    // Primeiro, desbloquear todos
    await supabaseClient
      .from('whatsapp_contacts')
      .update({ is_blocked: false, blocked_at: null, updated_at: new Date().toISOString() })
      .eq('instance_id', instance.id)
      .eq('is_blocked', true);

    // Depois, marcar os bloqueados
    for (const blockedJid of blockedList) {
      const normalizedJid = normalizeRemoteJid(blockedJid);
      if (!normalizedJid) continue;

      await supabaseClient.from('whatsapp_contacts').upsert({
        instance_id: instance.id,
        remote_jid: normalizedJid,
        phone_number: normalizedJid.replace('@s.whatsapp.net', ''),
        is_blocked: true,
        blocked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'instance_id,remote_jid' });
    }

    console.log(`🚫 Lista de bloqueios atualizada: ${blockedList.length} contatos em ${instanceName}`);
  }

  return { success: true, event: 'blocks' };
}

// Handler: CALL
async function handleCall(supabaseClient: any, payload: any) {
  const instanceName = payload.instanceName || payload.instance_name;
  const event = payload.event || payload.data?.event || {};
  const callId = event.CallID || event.callId || event.id;
  const chatJid = normalizeRemoteJid(event.From || event.from || event.Chat);
  const callType = (event.Type || event.type || 'voice').toLowerCase(); // "offer", "accept", "terminate", "reject"
  const isVideo = event.IsVideo || event.isVideo || false;

  if (!instanceName || !chatJid) {
    return { success: true, event: 'call', skipped: true };
  }

  const instance = await findInstance(supabaseClient, instanceName);
  if (!instance) {
    return { success: true, event: 'call', skipped: true };
  }

  // Buscar chat se existir
  const { data: chat } = await supabaseClient
    .from('whatsapp_chats')
    .select('id')
    .eq('instance_id', instance.id)
    .eq('remote_jid', chatJid)
    .maybeSingle();

  // Mapear tipo de evento para status
  let callStatus = 'incoming';
  if (callType === 'offer') callStatus = 'incoming';
  else if (callType === 'accept') callStatus = 'accepted';
  else if (callType === 'terminate') callStatus = 'ended';
  else if (callType === 'reject') callStatus = 'rejected';
  else if (callType === 'missed') callStatus = 'missed';

  const callData: any = {
    instance_id: instance.id,
    chat_id: chat?.id || null,
    remote_jid: chatJid,
    call_id: callId,
    call_type: isVideo ? 'video' : 'voice',
    call_status: callStatus,
    is_group: chatJid.includes('@g.us'),
    raw_data: payload,
  };

  if (callType === 'offer') {
    callData.started_at = new Date().toISOString();
  } else if (callType === 'terminate' || callType === 'reject') {
    callData.ended_at = new Date().toISOString();
  }

  // Upsert por call_id se existir, senão criar novo
  if (callId) {
    const { data: existingCall } = await supabaseClient
      .from('whatsapp_calls')
      .select('id, started_at')
      .eq('instance_id', instance.id)
      .eq('call_id', callId)
      .maybeSingle();

    if (existingCall) {
      // Calcular duração se terminou
      if (callData.ended_at && existingCall.started_at) {
        const start = new Date(existingCall.started_at).getTime();
        const end = new Date(callData.ended_at).getTime();
        callData.duration_seconds = Math.round((end - start) / 1000);
      }

      await supabaseClient
        .from('whatsapp_calls')
        .update(callData)
        .eq('id', existingCall.id);
    } else {
      await supabaseClient.from('whatsapp_calls').insert(callData);
    }
  } else {
    await supabaseClient.from('whatsapp_calls').insert(callData);
  }

  console.log(`📞 Chamada ${callStatus} (${isVideo ? 'vídeo' : 'voz'}) de ${chatJid} em ${instanceName}`);
  return { success: true, event: 'call', status: callStatus };
}

// Handler: CHATS (Metadata Update)
async function handleChats(supabaseClient: any, payload: any) {
  const instanceName = payload.instanceName || payload.instance_name;
  const chat = payload.chat || payload.data?.chat || payload.event || {};

  if (!instanceName) {
    return { success: true, event: 'chats', skipped: true };
  }

  const instance = await findInstance(supabaseClient, instanceName);
  if (!instance) {
    console.log(`💬 Chat update recebido de ${instanceName} (instância não encontrada)`);
    return { success: true, event: 'chats', skipped: true };
  }

  const chatJid = normalizeRemoteJid(chat.wa_chatid || chat.chatid || chat.id || chat.jid);
  if (!chatJid) {
    console.log(`💬 Chat update recebido de ${instanceName}`);
    return { success: true, event: 'chats' };
  }

  const updates: any = { updated_at: new Date().toISOString() };

  if (chat.name || chat.pushName) updates.contact_name = chat.name || chat.pushName;
  if (chat.imagePreview || chat.profilePictureUrl) updates.contact_photo_url = chat.imagePreview || chat.profilePictureUrl;
  if (chat.unreadCount !== undefined) updates.unread_count = chat.unreadCount;
  if (chat.archived !== undefined) updates.archived = chat.archived;
  if (chat.pinned !== undefined) updates.pinned = chat.pinned;
  if (chat.muteExpiration) updates.muted_until = toISODateSafe(chat.muteExpiration);

  const { error } = await supabaseClient
    .from('whatsapp_chats')
    .update(updates)
    .eq('instance_id', instance.id)
    .eq('remote_jid', chatJid);

  if (error) {
    console.error('⚠️ Erro ao atualizar metadata do chat:', error);
  }

  console.log(`💬 Chat update recebido de ${instanceName}`);
  return { success: true, event: 'chats' };
}

// Handler: LEADS (UAZAPI CRM Integration)
async function handleLeads(supabaseClient: any, payload: any) {
  const instanceName = payload.instanceName || payload.instance_name;
  const lead = payload.lead || payload.data?.lead || payload.event || {};
  const chatJid = normalizeRemoteJid(lead.chatId || lead.jid || lead.wa_chatid);

  if (!instanceName) {
    return { success: true, event: 'leads', skipped: true };
  }

  const instance = await findInstance(supabaseClient, instanceName);
  if (!instance) {
    return { success: true, event: 'leads', skipped: true };
  }

  // Buscar chat se existir
  let chatId = null;
  if (chatJid) {
    const { data: chat } = await supabaseClient
      .from('whatsapp_chats')
      .select('id')
      .eq('instance_id', instance.id)
      .eq('remote_jid', chatJid)
      .maybeSingle();
    chatId = chat?.id || null;
  }

  const leadData = {
    instance_id: instance.id,
    chat_id: chatId,
    remote_jid: chatJid || '',
    lead_id: lead.id || lead.leadId || null,
    status: lead.status || lead.leadStatus || null,
    funnel_stage: lead.funnelStage || lead.stage || null,
    assigned_attendant: lead.assignedAttendant || lead.attendant || null,
    custom_fields: {
      field01: lead.lead_field01 || null,
      field02: lead.lead_field02 || null,
      field03: lead.lead_field03 || null,
      field04: lead.lead_field04 || null,
      field05: lead.lead_field05 || null,
      email: lead.lead_email || null,
    },
    tags: lead.tags || [],
    raw_data: payload,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseClient
    .from('whatsapp_uazapi_leads')
    .upsert(leadData, { onConflict: 'instance_id,remote_jid' });

  if (error) {
    console.error('⚠️ Erro ao salvar lead UAZAPI:', error);
  }

  console.log(`📊 Lead UAZAPI sincronizado de ${instanceName}`);
  return { success: true, event: 'leads' };
}

// Handler: SENDER
async function handleSender(supabaseClient: any, payload: any) {
  const instanceName = payload.instanceName || payload.instance_name;
  const event = payload.event || payload.data?.event || {};

  // Sender events geralmente são confirmações de envio ou erros
  // Podemos usar para atualizar status de mensagens enviadas
  const messageId = event.messageId || event.key?.id;
  const status = event.status || event.state;

  if (!instanceName) {
    return { success: true, event: 'sender', skipped: true };
  }

  if (messageId && status) {
    const { error } = await supabaseClient
      .from('whatsapp_messages')
      .update({ status: status.toLowerCase() })
      .eq('message_id', messageId);

    if (error) {
      console.error('⚠️ Erro ao atualizar status da mensagem (sender):', error);
    }
  }

  console.log(`📤 Sender event recebido de ${instanceName}`);
  return { success: true, event: 'sender' };
}

// =====================================================
// MAIN SERVER
// =====================================================

serve(async (req) => {
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

    const eventType = payload.EventType || payload.event;
    let result;

    switch (eventType) {
      case 'messages':
      case 'messages.upsert':
        result = await handleMessages(supabaseClient, payload);
        break;

      case 'messages_update':
      case 'messages.update':
        result = await handleMessagesUpdate(supabaseClient, payload);
        break;

      case 'connection':
      case 'connection.update':
        result = await handleConnection(supabaseClient, payload);
        break;

      case 'qrcode':
      case 'qrcode.updated':
        result = await handleQRCode(supabaseClient, payload);
        break;

      case 'presence':
      case 'presence.update':
        result = await handlePresence(supabaseClient, payload);
        break;

      case 'history':
      case 'messaging-history.set':
        result = await handleHistory(supabaseClient, payload);
        break;

      case 'contacts':
      case 'contacts.upsert':
      case 'contacts.update':
        result = await handleContacts(supabaseClient, payload);
        break;

      case 'groups':
      case 'groups.upsert':
      case 'groups.update':
        result = await handleGroups(supabaseClient, payload);
        break;

      case 'labels':
      case 'labels.edit':
        result = await handleLabels(supabaseClient, payload);
        break;

      case 'chat_labels':
      case 'chats.labels':
        result = await handleChatLabels(supabaseClient, payload);
        break;

      case 'blocks':
      case 'blocklist.set':
      case 'blocklist.update':
        result = await handleBlocks(supabaseClient, payload);
        break;

      case 'call':
      case 'call.upsert':
        result = await handleCall(supabaseClient, payload);
        break;

      case 'chats':
      case 'chats.upsert':
      case 'chats.update':
        result = await handleChats(supabaseClient, payload);
        break;

      case 'leads':
        result = await handleLeads(supabaseClient, payload);
        break;

      case 'sender':
        result = await handleSender(supabaseClient, payload);
        break;

      default:
        console.log('ℹ️ Evento não mapeado:', eventType, '- Keys:', Object.keys(payload || {}));
        result = { success: true, message: 'Evento recebido mas não processado', eventType };
    }

    const resultError = (result as any).error;
    const statusCode = result.success === false && resultError ? 
      (resultError === 'INSTANCE_NOT_FOUND' ? 404 : 400) : 200;

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: statusCode }
    );

  } catch (error: any) {
    console.error('❌ Erro no webhook:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
