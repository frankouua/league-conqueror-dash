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

function sniffContentType(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;

  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  // PNG
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  // GIF
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return 'image/gif';
  // WEBP: RIFF....WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  // PDF: %PDF
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return 'application/pdf';
  // OGG: OggS
  if (bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) return 'audio/ogg';
  // MP3: ID3 or frame sync
  if (
    (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) ||
    (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
  ) {
    return 'audio/mpeg';
  }
  // MP4: ....ftyp
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) return 'video/mp4';

  return null;
}

function contentTypeFromExt(url: URL): string | null {
  const path = url.pathname.toLowerCase();
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.gif')) return 'image/gif';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.mp4') || path.endsWith('.m4v')) return 'video/mp4';
  if (path.endsWith('.webm')) return 'video/webm';
  if (path.endsWith('.ogg')) return 'audio/ogg';
  if (path.endsWith('.mp3')) return 'audio/mpeg';
  if (path.endsWith('.wav')) return 'audio/wav';
  if (path.endsWith('.m4a')) return 'audio/mp4';
  if (path.endsWith('.pdf')) return 'application/pdf';
  return null;
}

function normalizeUpstreamContentType(raw: string | null): string {
  if (!raw) return '';
  return raw.split(';')[0]?.trim().toLowerCase() ?? '';
}

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
    const upstreamType = normalizeUpstreamContentType(upstream.headers.get('content-type'));

    // Many WhatsApp CDN URLs end with .enc and return application/octet-stream.
    // Browsers won't render <img>/<video> without the correct Content-Type.
    const inferredType = sniffContentType(bytes) ?? contentTypeFromExt(validation.url);
    const contentType =
      upstreamType && upstreamType !== 'application/octet-stream' ? upstreamType : inferredType ?? 'application/octet-stream';

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
