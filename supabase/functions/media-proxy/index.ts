// Public media proxy for WhatsApp CDN URLs.
// Security:
// - verify_jwt disabled (see config.toml)
// - strict allowlist to prevent SSRF
// - only https
// - size limits

const ALLOWED_HOSTS = new Set([
  'mmg.whatsapp.net',
  'pps.whatsapp.net',
  'static.whatsapp.net',
  'web.whatsapp.com',
  'whatsapp.net',
]);

const MAX_BYTES = 25 * 1024 * 1024; // 25MB

function corsHeaders(origin: string | null) {
  // We allow all origins because this is used as an <img>/<video> src.
  // The allowlist above prevents SSRF.
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'public, max-age=3600',
  } as Record<string, string>;
}

function isAllowedUrl(raw: string): { ok: true; url: URL } | { ok: false; reason: string } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }

  if (url.protocol !== 'https:') return { ok: false, reason: 'https_only' };

  const host = url.hostname.toLowerCase();
  const allowed = ALLOWED_HOSTS.has(host) || host.endsWith('.whatsapp.net');
  if (!allowed) return { ok: false, reason: 'host_not_allowed' };

  return { ok: true, url };
}

async function readUpToLimit(resp: Response) {
  const contentLength = Number(resp.headers.get('content-length') ?? '0');
  if (contentLength && contentLength > MAX_BYTES) {
    throw new Error('too_large');
  }

  const buf = new Uint8Array(await resp.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) throw new Error('too_large');
  return buf;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders(origin) });
  }

  const urlParam = new URL(req.url).searchParams.get('url');
  if (!urlParam) {
    return new Response('Missing url', { status: 400, headers: corsHeaders(origin) });
  }

  const validation = isAllowedUrl(urlParam);
  if (!validation.ok) {
    return new Response(`Blocked (${validation.reason})`, {
      status: 403,
      headers: corsHeaders(origin),
    });
  }

  try {
    const upstream = await fetch(validation.url.toString(), {
      // Some CDNs behave differently with a UA.
      headers: {
        'User-Agent': 'LovableMediaProxy/1.0',
        'Accept': '*/*',
      },
    });

    if (!upstream.ok) {
      return new Response(`Upstream error (${upstream.status})`, {
        status: 502,
        headers: corsHeaders(origin),
      });
    }

    const bytes = await readUpToLimit(upstream);
    const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';

    return new Response(bytes, {
      status: 200,
      headers: {
        ...corsHeaders(origin),
        'Content-Type': contentType,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown_error';
    const status = msg === 'too_large' ? 413 : 500;
    return new Response(`Proxy error (${msg})`, {
      status,
      headers: corsHeaders(origin),
    });
  }
});
