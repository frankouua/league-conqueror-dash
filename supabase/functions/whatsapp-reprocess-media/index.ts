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
  if (m.includes('ogg') || m.includes('opus')) return 'ogg'
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3'
  if (m.includes('wav')) return 'wav'
  if (m.includes('mp4') || m.includes('m4a')) return 'm4a'
  if (m.includes('pdf')) return 'pdf'
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg'
  if (m.includes('png')) return 'png'
  if (m.includes('webp')) return 'webp'
  if (m.includes('mp4')) return 'mp4'
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

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const authHeader = req.headers.get('authorization') || ''
    const apikeyHeader = req.headers.get('apikey') || ''

    // Client with user JWT for RLS-protected reads/updates.
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          authorization: authHeader,
          apikey: apikeyHeader,
        },
      },
    })

    // Validate JWT in code (verify_jwt=false at the gateway).
    const claimsRes: any = await (supabase as any).auth.getClaims?.()
    const claimsError = claimsRes?.error
    const claims = claimsRes?.data?.claims
    if (claimsError || !claims?.sub) {
      return jsonResponse(401, { error: 'Unauthorized' })
    }

    const body = await req.json().catch(() => ({}))
    const messageRowId = String(body?.messageRowId || '').trim()
    if (!messageRowId) return jsonResponse(400, { error: 'Missing messageRowId' })

    console.log('[whatsapp-reprocess-media] start', { messageRowId, user: claims.sub })

    // 1) Load message row (RLS enforced)
    const { data: msg, error: msgErr } = await supabase
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
    const instanceName = pickFirstString(raw?.instanceName, raw?.instance_name, raw?.InstanceName)
    const baseUrl =
      pickFirstString(raw?.BaseUrl, raw?.baseUrl, raw?.base_url) ||
      'https://unique.uazapi.com'

    // The provider message id used by /message/download.
    const providerMessageId =
      pickFirstString(
        msg.message_id,
        raw?.message?.messageid,
        raw?.message?.messageId,
        raw?.message?.message_id,
        raw?.message?.key?.id,
        raw?.message?.id,
      ) || null

    const mimetypeHint = pickFirstString(
      raw?.message?.content?.mimetype,
      raw?.message?.content?.mimeType,
      raw?.message?.mimetype,
      raw?.mimetype,
    )

    if (!instanceName || !providerMessageId) {
      return jsonResponse(400, { error: 'Missing instanceName/providerMessageId in raw_data' })
    }

    // 2) Find instance api_key
    const { data: instance, error: instErr } = await supabase
      .from('whatsapp_instances')
      .select('api_key, instance_name')
      .eq('instance_name', instanceName)
      .maybeSingle()

    if (instErr || !instance?.api_key) {
      console.log('[whatsapp-reprocess-media] instance api_key missing', { instErr, instanceName })
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

    const { error: uploadErr } = await supabase.storage.from('whatsapp-media').upload(filePath, bytes.buffer, {
      contentType: effectiveMime,
      upsert: true,
    })

    if (uploadErr) {
      console.log('[whatsapp-reprocess-media] storage upload failed', uploadErr)
      return jsonResponse(500, { error: 'Storage upload failed' })
    }

    const { data: pub } = supabase.storage.from('whatsapp-media').getPublicUrl(filePath)
    const publicUrl = pub?.publicUrl
    if (!publicUrl) return jsonResponse(500, { error: 'Could not build public URL' })

    // 4) Update message row -> triggers realtime UPDATE on the client
    const { error: updErr } = await supabase
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
