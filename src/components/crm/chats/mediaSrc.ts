export type MediaKind = 'image' | 'video' | 'audio' | 'document';

function looksLikeDataUri(value: string) {
  return value.startsWith('data:');
}

function looksLikeBareBase64(value: string) {
  // Heurística: base64 de JPEG/PNG tende a ser grande e não contém espaços.
  if (value.length < 200) return false;
  if (value.includes(' ') || value.includes('\n')) return false;
  // Evita confundir com URL
  if (value.startsWith('http://') || value.startsWith('https://')) return false;
  return /^[A-Za-z0-9+/=]+$/.test(value);
}

export function normalizePreview(preview: string | null | undefined, kind: MediaKind = 'image') {
  if (!preview) return null;
  const p = preview.trim();
  if (!p) return null;
  if (looksLikeDataUri(p)) return p;
  if (looksLikeBareBase64(p)) {
    const mime = kind === 'video' ? 'video/mp4' : kind === 'audio' ? 'audio/ogg' : kind === 'document' ? 'application/octet-stream' : 'image/jpeg';
    return `data:${mime};base64,${p}`;
  }
  return p;
}

export function shouldProxyUrl(url: string | null | undefined) {
  if (!url) return false;
  const lower = url.toLowerCase();

  // Evita loop: se já estamos apontando para o nosso proxy, não reproxiar.
  if (lower.includes('/functions/v1/media-proxy')) return false;

  // Regra geral: qualquer URL http(s) externa pode sofrer bloqueio de hotlink/CORS.
  // Como o proxy é exatamente o nosso gateway para contornar isso, preferimos
  // proxiar por padrão (mantendo compatível com WhatsApp + provedores diversos).
  if (lower.startsWith('http://') || lower.startsWith('https://')) return true;

  return false;
}

export function buildMediaProxyUrl(url: string) {
  const base = import.meta.env.VITE_SUPABASE_URL;
  // Public function (verify_jwt=false)
  return `${base}/functions/v1/media-proxy?url=${encodeURIComponent(url)}`;
}

export function getBestChatMediaSrc(params: {
  preview?: string | null;
  url?: string | null;
  kind?: MediaKind;
}) {
  const kind = params.kind ?? 'image';
  const normalizedPreview = normalizePreview(params.preview, kind);
  if (normalizedPreview) return normalizedPreview;

  const url = params.url ?? null;
  if (url && shouldProxyUrl(url)) return buildMediaProxyUrl(url);
  return url;
}
