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
  // CRITICAL: Garantir URL absoluta do proxy para evitar CORS no WhatsApp CDN.
  // Fallback hardcoded para o project ID atual caso as env vars não estejam disponíveis.
  const HARDCODED_PROJECT_ID = 'mbnjjwatnqjjqxogmaju';
  
  const envBase = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
  const baseFromEnv = envBase.trim();

  const projectId = (import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined) ?? '';
  const baseFromProject = projectId ? `https://${projectId}.supabase.co` : '';

  // Fallback final para garantir que NUNCA retornamos URL original
  const base = (baseFromEnv || baseFromProject || `https://${HARDCODED_PROJECT_ID}.supabase.co`).replace(/\/+$/, '');

  // Public function (verify_jwt=false)
  const proxyUrl = `${base}/functions/v1/media-proxy?url=${encodeURIComponent(url)}`;
  
  // DEBUG: Log para auditoria
  console.log('[mediaSrc] buildMediaProxyUrl:', { original: url.slice(0, 60), proxy: proxyUrl.slice(0, 80) });
  
  return proxyUrl;
}

/**
 * Retorna a melhor fonte de mídia para exibição.
 * 
 * IMPORTANTE: Esta função agora suporta carregamento progressivo.
 * - Se onlyPreview=true: retorna apenas o preview (para placeholder inicial)
 * - Se onlyHd=true: retorna apenas a URL HD via proxy (para carregamento em background)
 * - Sem flags: comportamento legado (prioriza preview, fallback para URL)
 */
export function getBestChatMediaSrc(params: {
  preview?: string | null;
  url?: string | null;
  kind?: MediaKind;
  onlyPreview?: boolean;
  onlyHd?: boolean;
}) {
  const kind = params.kind ?? 'image';
  const normalizedPreview = normalizePreview(params.preview, kind);
  const url = params.url ?? null;
  const hdUrl = url && shouldProxyUrl(url) ? buildMediaProxyUrl(url) : url;

  // Modo placeholder: retorna apenas o preview (thumbnail)
  if (params.onlyPreview) {
    return normalizedPreview;
  }

  // Modo HD: retorna apenas a URL de alta resolução via proxy
  if (params.onlyHd) {
    return hdUrl;
  }

  // Comportamento legado (para compatibilidade): prioriza preview, fallback para URL
  if (normalizedPreview) return normalizedPreview;
  return hdUrl;
}
