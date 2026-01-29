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

/**
 * Normaliza o preview para data-uri válida.
 * Retorna a string original se já for URL ou data-uri.
 */
export function normalizePreview(preview: string | null | undefined, kind: MediaKind = 'image'): string | null {
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

/**
 * REGRA OBRIGATÓRIA: Nunca retornar URL direta do WhatsApp.
 * Toda mídia recebida DEVE passar pelo media-proxy.
 * 
 * Retorna URL absoluta do proxy ou null se não conseguir montar.
 */
export function buildMediaProxyUrl(url?: string | null): string | null {
  if (!url) return null;

  // Evita reproxiar se já for URL do proxy
  if (url.includes('/functions/v1/media-proxy')) return url;

  // Monta a base do Supabase a partir das env vars disponíveis
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
  const projectId = (import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined) ?? '';
  const baseFromProject = projectId ? `https://${projectId}.supabase.co` : '';
  
  const base = (envUrl.trim() || baseFromProject).replace(/\/+$/, '');

  if (!base) {
    console.error('[mediaSrc] buildMediaProxyUrl: não foi possível montar base do Supabase');
    return null;
  }

  const proxyUrl = `${base}/functions/v1/media-proxy?url=${encodeURIComponent(url)}`;

  // Log mínimo para debug
  console.log('[mediaSrc] buildMediaProxyUrl:', {
    original: url.slice(0, 60) + (url.length > 60 ? '...' : ''),
    proxy: proxyUrl.slice(0, 80) + (proxyUrl.length > 80 ? '...' : ''),
  });

  return proxyUrl;
}

/**
 * Retorna a melhor fonte de mídia para exibição.
 * 
 * REGRAS SIMPLIFICADAS:
 * - Se preview existir e for válido → retorna preview (base64 para render imediato)
 * - Se url existir → retorna URL via proxy (para HD)
 * - Se ambos faltarem → null
 */
export function getBestChatMediaSrc(params: {
  preview?: string | null;
  url?: string | null;
  kind?: MediaKind;
}): string | null {
  const kind = params.kind ?? 'image';
  
  // Preview (base64) sempre tem prioridade para render imediato
  const normalizedPreview = normalizePreview(params.preview, kind);
  if (normalizedPreview) {
    return normalizedPreview;
  }

  // Fallback: tenta HD via proxy
  return buildMediaProxyUrl(params.url);
}

/**
 * Retorna APENAS o preview (para placeholder inicial)
 */
export function getPreviewSrc(preview?: string | null, kind: MediaKind = 'image'): string | null {
  return normalizePreview(preview, kind);
}

/**
 * Retorna APENAS a URL HD via proxy (para carregamento em background)
 */
export function getHdProxyUrl(url?: string | null): string | null {
  return buildMediaProxyUrl(url);
}
