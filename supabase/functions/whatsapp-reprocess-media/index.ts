// Public backend function (verify_jwt=false in config) but we REQUIRE a valid user JWT in code.
// Purpose: Reprocess a WhatsApp message media (mainly audio/PTT) by downloading from provider (UAZAPI)
// and persisting to Storage, then updating the whatsapp_messages.media_url.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.88.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function guessExtFromMime(mime: string): string {
  const m = (mime || '').toLowerCase()
  // Audio
  if (m.includes('ogg') || m.includes('opus')) return 'ogg'
  if (m.includes('audio/mpeg') || m.includes('mp3')) return 'mp3'
  if (m.includes('wav')) return 'wav'
  if (m.includes('m4a') || m.includes('audio/mp4')) return 'm4a'
  // Video - must check before generic mp4
  if (m.includes('video/mp4') || m.includes('video/mpeg')) return 'mp4'
  if (m.includes('video/webm')) return 'webm'
  if (m.includes('video/quicktime') || m.includes('mov')) return 'mov'
  // Images
  if (m.includes('pdf')) return 'pdf'
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg'
  if (m.includes('png')) return 'png'
  if (m.includes('webp')) return 'webp'
  return 'bin'
}

function normalizeMessageType(type: string | null | undefined) {
  return String(type || '')
    .toLowerCase()
    .trim()
    .replace('message', '')
}

function pickFirstString(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === 'string') {
      const s = v.trim()
      if (s) return s
    }
  }
  return null
}

/**
 * Normalize provider instance names to database key format.
 * E.g., "Kamylle - Farmer" -> "KAMYLLE_FARMER"
 * E.g., "Unique - API NÃO OFICIAL" -> "UNIQUE_API_NAO_OFICIAL"
 */
function normalizeInstanceKey(name: string): string {
  return name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^A-Z0-9]+/g, '_')     // non-alphanum -> underscore
    .replace(/^_+|_+$/g, '')         // trim leading/trailing underscores
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Be tolerant to header casing from different clients/proxies.
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || ''
    const jwt = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : ''
    if (!jwt) {
      console.log('[whatsapp-reprocess-media] No JWT provided')
      return jsonResponse(401, { error: 'Unauthorized' })
    }

    // Client that enforces RLS for reads (must prove the caller can see the message).
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          // Supabase auth-js expects standard casing for Authorization in some runtimes.
          Authorization: `Bearer ${jwt}`,
        },
      },
    })

    // Validate JWT using getClaims (more reliable than getUser)
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(jwt)
    if (claimsErr || !claimsData?.claims?.sub) {
      console.log('[whatsapp-reprocess-media] JWT validation failed', claimsErr)
      return jsonResponse(401, { error: 'Unauthorized' })
    }
    const userId = claimsData.claims.sub

    // Admin client for privileged operations (storage upload + reading instance api_key + updating message).
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const body = await req.json().catch(() => ({}))
    const messageRowId = String(body?.messageRowId || '').trim()
    if (!messageRowId) return jsonResponse(400, { error: 'Missing messageRowId' })

    console.log('[whatsapp-reprocess-media] start', { messageRowId, user: userId })

    // 1) Load message row (RLS enforced)
    const { data: msg, error: msgErr } = await userClient
      .from('whatsapp_messages')
      .select('id, message_id, message_type, media_url, raw_data, chat_id')
      .eq('id', messageRowId)
      .maybeSingle()

    if (msgErr || !msg) {
      console.log('[whatsapp-reprocess-media] message not found or RLS blocked', msgErr)
      return jsonResponse(404, { error: 'Message not found' })
    }

    // If already persisted, nothing to do.
    if (typeof msg.media_url === 'string' && msg.media_url.includes('/storage/v1/object/public/whatsapp-media/')) {
      return jsonResponse(200, { ok: true, mediaUrl: msg.media_url, reused: true })
    }

    const raw: any = msg.raw_data || {}

    // For messages sent via CRM, instanceName may not exist in raw_data.
    // Prefer instance_id from the chat and fetch the instance by ID.
    let instanceName = pickFirstString(raw?.instanceName, raw?.instance_name, raw?.InstanceName)
    let instanceId = pickFirstString(raw?.instanceId, raw?.instance_id, raw?.InstanceId)

    // If we don't have instance identifiers in raw_data, try to get instance_id from the chat record.
    if ((!instanceId && !instanceName) && msg.chat_id) {
      const { data: chat, error: chatErr } = await userClient
        .from('whatsapp_chats')
        .select('instance_id')
        .eq('id', msg.chat_id)
        .maybeSingle()

      if (chatErr) {
        console.log('[whatsapp-reprocess-media] failed to load chat for instance_id', { chat_id: msg.chat_id, chatErr })
      }
      instanceId = (chat as any)?.instance_id || null
    }

    const baseUrl =
      pickFirstString(raw?.BaseUrl, raw?.baseUrl, raw?.base_url) ||
      'https://unique.uazapi.com'

    // The provider message id used by /message/download.
    // For CRM-sent messages, check uazapi_response structure
    const providerMessageId =
      pickFirstString(
        msg.message_id,
        raw?.uazapi_response?.messageid,
        raw?.uazapi_response?.id?.split(':')[1], // Format: "owner:messageid"
        raw?.message?.messageid,
        raw?.message?.messageId,
        raw?.message?.message_id,
        raw?.message?.key?.id,
        raw?.message?.id,
      ) || null

    const mimetypeHint = pickFirstString(
      raw?.uazapi_response?.content?.mimetype,
      raw?.message?.content?.mimetype,
      raw?.message?.content?.mimeType,
      raw?.message?.mimetype,
      raw?.mimetype,
    )

    if ((!instanceId && !instanceName) || !providerMessageId) {
      console.log('[whatsapp-reprocess-media] missing required fields', {
        instanceName,
        instanceId,
        providerMessageId,
        rawKeys: Object.keys(raw),
      })
      return jsonResponse(400, { error: 'Missing instanceName/instanceId/providerMessageId in raw_data' })
    }

    // 2) Find instance api_key
    // Normalize the provider instanceName to match DB format (e.g., "Kamylle - Farmer" -> "KAMYLLE_FARMER")
    const normalizedInstanceName = instanceName ? normalizeInstanceKey(instanceName) : null

    let instance: { api_key: string; instance_name: string } | null = null
    let instErr: unknown = null

    if (instanceId) {
      // Lookup by ID
      const res = await adminClient.from('whatsapp_instances').select('api_key, instance_name').eq('id', instanceId).maybeSingle()
      instance = res.data
      instErr = res.error
    } else if (normalizedInstanceName) {
      // Lookup by normalized name (exact match)
      const res = await adminClient.from('whatsapp_instances').select('api_key, instance_name').eq('instance_name', normalizedInstanceName).maybeSingle()
      instance = res.data
      instErr = res.error

      // Fallback: try original name if normalized didn't match
      if (!instance && instanceName) {
        const res2 = await adminClient.from('whatsapp_instances').select('api_key, instance_name').eq('instance_name', instanceName).maybeSingle()
        instance = res2.data
        instErr = res2.error
      }
    }

    if (instErr || !instance?.api_key) {
      console.log('[whatsapp-reprocess-media] instance api_key missing', {
        instErr,
        instanceName,
        normalizedInstanceName,
        instanceId,
      })
      return jsonResponse(400, { error: 'Instance API key not available' })
    }

    const msgTypeNorm = normalizeMessageType(msg.message_type)
    const folder =
      msgTypeNorm.includes('image')
        ? 'images'
        : msgTypeNorm.includes('video')
          ? 'videos'
          : msgTypeNorm.includes('audio') || msgTypeNorm === 'ptt'
            ? 'audios'
            : msgTypeNorm.includes('document')
              ? 'documents'
              : 'misc'

    // 3) Download from provider
    const downloadResp = await fetch(`${baseUrl.replace(/\/+$/, '')}/message/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        token: String(instance.api_key),
      },
      body: JSON.stringify({ id: providerMessageId, return_base64: true, return_link: false }),
    })

    if (!downloadResp.ok) {
      const errText = await downloadResp.text().catch(() => '')
      console.log('[whatsapp-reprocess-media] provider download failed', downloadResp.status, errText)
      return jsonResponse(502, { error: 'Provider download failed', status: downloadResp.status })
    }

    const dl: any = await downloadResp.json().catch(() => ({}))
    const base64Data = dl.base64Data || dl.base64 || dl.data
    const detectedMime = String(dl.mimetype || dl.mimeType || mimetypeHint || '').trim()

    if (!base64Data || typeof base64Data !== 'string') {
      return jsonResponse(502, { error: 'Provider did not return base64 media' })
    }

    // If provider doesn't send mimetype, apply a safe default for audio.
    const effectiveMime =
      detectedMime || (folder === 'audios' ? 'audio/ogg' : folder === 'videos' ? 'video/mp4' : folder === 'images' ? 'image/jpeg' : 'application/octet-stream')

    // Convert base64 -> bytes
    const bin = atob(base64Data)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)

    const ext = guessExtFromMime(effectiveMime)
    const filePath = `${folder}/${providerMessageId}.${ext}`

    const { error: uploadErr } = await adminClient.storage.from('whatsapp-media').upload(filePath, bytes.buffer, {
      contentType: effectiveMime,
      upsert: true,
    })

    if (uploadErr) {
      console.log('[whatsapp-reprocess-media] storage upload failed', uploadErr)
      return jsonResponse(500, { error: 'Storage upload failed' })
    }

    const { data: pub } = adminClient.storage.from('whatsapp-media').getPublicUrl(filePath)
    const publicUrl = pub?.publicUrl
    if (!publicUrl) return jsonResponse(500, { error: 'Could not build public URL' })

    // 4) Update message row -> triggers realtime UPDATE on the client
    const { error: updErr } = await adminClient
      .from('whatsapp_messages')
      .update({ media_url: publicUrl })
      .eq('id', messageRowId)

    if (updErr) {
      console.log('[whatsapp-reprocess-media] failed to update message', updErr)
      return jsonResponse(500, { error: 'Failed to update message media_url' })
    }

    console.log('[whatsapp-reprocess-media] done', { messageRowId, publicUrl })
    return jsonResponse(200, { ok: true, mediaUrl: publicUrl, reused: false })
  } catch (e) {
    console.log('[whatsapp-reprocess-media] unhandled', e)
    return jsonResponse(500, { error: 'Internal error' })
  }
})
