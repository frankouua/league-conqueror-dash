import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  Play, 
  FileText, 
  Download, 
  Image as ImageIcon, 
  Video, 
  Mic, 
  File,
  MapPin,
  User,
  Sticker,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getBestChatMediaSrc } from './mediaSrc';
import { supabase } from '@/integrations/supabase/client';
import { AudioPlayer } from './AudioPlayer';
import { toast } from 'sonner';

interface WhatsAppMediaRendererProps {
  messageType: string | null;
  content: string | null;
  mediaUrl: string | null;
  mediaPreview?: string | null;
  rawData?: unknown | null;
  fromMe: boolean;
  messageId?: string;
  timestamp?: string | null;
  contactName?: string | null;
  // Callback para abrir o visualizador no componente pai
  onOpenMediaViewer?: (mediaId: string) => void;
}

// Normaliza o tipo de mensagem para comparação
function normalizeMessageType(type: string | null): string {
  if (!type) return 'text';
  const lower = type.toLowerCase().trim();
  
  // Normaliza variações de áudio primeiro (antes de remover "message")
  if (lower === 'audiomessage' || lower === 'audio' || lower === 'ptt' || lower === 'myaudio') {
    return 'audio';
  }
  
  // Remove sufixo "message" para outros tipos
  return lower.replace('message', '').trim();
}

function guessMediaKindFromUrl(url: string | null): 'image' | 'video' | 'audio' | 'document' | null {
  if (!url) return null;
  const clean = url.split('?')[0]?.toLowerCase() ?? '';

  // Check audio first (including .enc files which are often audio from WhatsApp)
  if (/(\.mp3|\.ogg|\.wav|\.m4a|\.opus)$/.test(clean)) return 'audio';
  
  // Video extensions
  if (/(\.mp4|\.mov|\.webm)$/.test(clean)) return 'video';
  
  // Document extensions
  if (/(\.pdf|\.doc|\.docx|\.xls|\.xlsx|\.ppt|\.pptx|\.txt|\.csv)$/.test(clean)) return 'document';
  
  // Image extensions - check AFTER other types to avoid false positives
  if (/(\.png|\.jpg|\.jpeg|\.gif|\.webp)$/.test(clean)) return 'image';
  
  // WhatsApp CDN without extension - can't determine type, return null
  // (The message_type should be used instead)
  return null;
}

function isImagePlaceholderText(text: string | null): boolean {
  if (!text) return false;
  const t = text.trim().toLowerCase();
  return t === '[imagem]' || t === 'imagem' || t === '📷 imagem';
}

function isVideoPlaceholderText(text: string | null): boolean {
  if (!text) return false;
  const t = text.trim().toLowerCase();
  return t === '[vídeo]' || t === '[video]' || t === 'vídeo' || t === 'video';
}

function normalizeDocPlaceholder(text: string | null): string {
  return (text ?? '').trim().toLowerCase();
}

function isDocumentPlaceholderText(text: string | null): boolean {
  const t = normalizeDocPlaceholder(text);
  return t === '[document]' || t === '[documento]' || t === 'documento' || t === 'document';
}

function pickFirstString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === 'string') {
      const s = v.trim();
      if (s) return s;
    }
  }
  return null;
}

function extractMediaUrlFromRawData(rawData: unknown): string | null {
  const raw = (rawData ?? {}) as any;

  // UAZAPI costuma variar bastante os paths e o casing (url/URL).
  // Preferimos sempre URL direta (o proxy cuida do resto).
  return (
    pickFirstString(
      // Estrutura atual (geral): raw_data.message.content.url
      raw?.message?.content?.url,
      raw?.message?.content?.URL,
      raw?.message?.content?.mediaUrl,
      raw?.message?.content?.media_url,

      // Estruturas por tipo (alguns provedores)
      raw?.message?.imageMessage?.url,
      raw?.message?.imageMessage?.URL,
      raw?.message?.videoMessage?.url,
      raw?.message?.videoMessage?.URL,
      raw?.message?.audioMessage?.url,
      raw?.message?.audioMessage?.URL,
      raw?.message?.documentMessage?.url,
      raw?.message?.documentMessage?.URL,
      raw?.message?.documentWithCaptionMessage?.message?.documentMessage?.url,
      raw?.message?.documentWithCaptionMessage?.message?.documentMessage?.URL,

      // Resposta armazenada de envio (mensagens enviadas)
      raw?.uazapi_response?.content?.url,
      raw?.uazapi_response?.content?.URL,
      raw?.uazapi_response?.content?.mediaUrl,
      raw?.uazapi_response?.content?.media_url,

      // Outros fallbacks comuns
      raw?.url,
      raw?.URL,
      raw?.mediaUrl,
      raw?.media_url,
      raw?.content?.url,
      raw?.content?.URL
    ) ?? null
  );
}

function fileFormatFromMimeOrName(mime: string | null, fileName: string | null): string {
  if (mime && typeof mime === 'string') {
    const m = mime.toLowerCase().trim();

    // Mapeamentos comuns (WhatsApp/UAZAPI costuma mandar mimetype completo do Office)
    if (m === 'application/pdf') return 'PDF';
    if (m === 'text/plain') return 'TXT';
    if (m === 'text/csv') return 'CSV';
    if (m === 'application/zip') return 'ZIP';
    if (m === 'application/x-zip-compressed') return 'ZIP';

    // Word
    if (m === 'application/msword') return 'DOC';
    if (m.includes('wordprocessingml.document')) return 'DOCX';

    // Excel
    if (m === 'application/vnd.ms-excel') return 'XLS';
    if (m.includes('spreadsheetml.sheet')) return 'XLSX';

    // PowerPoint
    if (m === 'application/vnd.ms-powerpoint') return 'PPT';
    if (m.includes('presentationml.presentation')) return 'PPTX';

    // Fallback razoável: usa o subtype mas sem poluir com "vnd.openxml..."
    const subtype = (m.split('/')[1] || '').trim();
    if (subtype && !subtype.includes('vnd.') && !subtype.includes('openxml')) return subtype.toUpperCase();
  }
  if (fileName) {
    // evita considerar ".enc" como extensão final
    const cleaned = fileName.replace(/\.enc$/i, '');
    const extMatch = cleaned.match(/\.([a-z0-9]+)$/i);
    if (extMatch?.[1]) return extMatch[1].toUpperCase();
  }
  return 'ARQUIVO';
}

function extractDocumentMeta(rawData: unknown, content: string | null, mediaUrl: string | null): {
  fileName: string;
  fileFormat: string;
  caption: string | null;
} {
  const raw = (rawData ?? {}) as any;

  // Estrutura UAZAPI para mensagens RECEBIDAS: raw_data.message.content.fileName
  const messageContent = raw?.message?.content ?? null;
  
  // Estrutura antiga (documentMessage) - fallback
  const docMessage = raw?.message?.documentMessage 
    ?? raw?.message?.documentWithCaptionMessage?.message?.documentMessage
    ?? null;

  // Prioridade: message.content (recebidas) > documentMessage > outros fallbacks
  const fileName =
    pickFirstString(
      // Mensagens recebidas (estrutura UAZAPI atual): raw_data.message.content.fileName
      messageContent?.fileName,
      messageContent?.file_name,
      messageContent?.filename,
      // Estrutura antiga de mensagens recebidas
      docMessage?.fileName,
      docMessage?.file_name,
      docMessage?.title,
      // Mensagens enviadas / estrutura alternativa
      raw?.file_name,
      raw?.filename,
      raw?.name,
      raw?.uazapi_response?.content?.fileName,
      raw?.uazapi_response?.content?.file_name,
      raw?.uazapi_response?.content?.filename,
      raw?.uazapi_response?.content?.name,
      raw?.uazapi_response?.content?.docName,
      raw?.uazapi_response?.content?.doc_name,
      // fallback: alguns provedores usam raw.content.*
      raw?.content?.fileName,
      raw?.content?.file_name,
      raw?.content?.filename,
      raw?.content?.name,
      raw?.content?.docName,
      raw?.content?.doc_name
    ) ||
    (() => {
      // último fallback: tentar extrair de querystring, se existir
      try {
        if (!mediaUrl) return null;
        const u = new URL(mediaUrl);
        const qName = u.searchParams.get('fileName') || u.searchParams.get('filename');
        return qName ? decodeURIComponent(qName) : null;
      } catch {
        return null;
      }
    })() ||
    'Documento';

  const mime =
    pickFirstString(
      // Mensagens recebidas (estrutura UAZAPI atual)
      messageContent?.mimetype,
      messageContent?.mime_type,
      // Estrutura antiga
      docMessage?.mimetype,
      docMessage?.mime_type,
      // Mensagens enviadas / estrutura alternativa
      raw?.mime_type,
      raw?.mimetype,
      raw?.mime,
      raw?.uazapi_response?.content?.mimetype,
      raw?.uazapi_response?.content?.mime_type,
      raw?.uazapi_response?.content?.mime,
      raw?.content?.mimetype,
      raw?.content?.mime_type,
      raw?.content?.mime
    ) || null;

  const captionCandidate =
    pickFirstString(
      // Mensagens recebidas (estrutura UAZAPI atual)
      raw?.message?.text,
      messageContent?.caption,
      // Estrutura antiga
      docMessage?.caption,
      raw?.message?.documentWithCaptionMessage?.message?.documentMessage?.caption,
      // Mensagens enviadas / estrutura alternativa
      raw?.caption,
      raw?.text,
      raw?.uazapi_response?.content?.caption,
      raw?.uazapi_response?.content?.text,
      raw?.content?.caption,
      raw?.content?.text,
      content
    ) || null;

  const caption = captionCandidate && !isDocumentPlaceholderText(captionCandidate) ? captionCandidate : null;
  const fileFormat = fileFormatFromMimeOrName(mime, fileName);

  return { fileName, fileFormat, caption };
}

export function WhatsAppMediaRenderer({ 
  messageType, 
  content, 
  mediaUrl, 
  mediaPreview,
  rawData,
  fromMe,
  messageId,
  timestamp,
  contactName,
  onOpenMediaViewer
}: WhatsAppMediaRendererProps) {
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [authedBlobSrc, setAuthedBlobSrc] = useState<string | null>(null);
  const [audioActiveSrc, setAudioActiveSrc] = useState<string | null>(null);
  const [videoActiveSrc, setVideoActiveSrc] = useState<string | null>(null);
  const [reprocessingAudio, setReprocessingAudio] = useState(false);
  const [reprocessingVideo, setReprocessingVideo] = useState(false);
  const [autoReprocessAttempted, setAutoReprocessAttempted] = useState(false);
  const [autoReprocessVideoAttempted, setAutoReprocessVideoAttempted] = useState(false);

  const normalizedType = normalizeMessageType(messageType);

  // Algumas mensagens recebidas chegam com media_url null no registro,
  // mas a URL está dentro do raw_data. Se não resolvermos isso aqui,
  // o <img> nunca terá src e a imagem não aparece.
  const resolvedMediaUrl = useMemo(() => {
    return mediaUrl ?? extractMediaUrlFromRawData(rawData);
  }, [mediaUrl, rawData]);

  const isAudioMessage = useMemo(() => {
    const mt = (messageType || '').toLowerCase();
    const nt = normalizeMessageType(messageType);
    return nt === 'audio' || mt.includes('audio') || mt === 'ptt' || nt === 'ptt' || nt === 'myaudio';
  }, [messageType]);

  const isVideoMessage = useMemo(() => {
    const mt = (messageType || '').toLowerCase();
    const nt = normalizeMessageType(messageType);
    return nt === 'video' || mt.includes('video');
  }, [messageType]);

  const isStorageUrl = useMemo(() => {
    return Boolean(resolvedMediaUrl && resolvedMediaUrl.includes('.supabase.co/storage/'));
  }, [resolvedMediaUrl]);

  // Se a mensagem aponta para WhatsApp CDN .enc, isso é criptografado e NÃO vai tocar no browser.
  // Precisamos reprocessar (download via provedor e persistir em Storage) antes de renderizar o player.
  const needsReprocessEncAudio = useMemo(() => {
    if (!isAudioMessage) return false;
    if (!resolvedMediaUrl) return false;
    if (isStorageUrl) return false;
    const u = resolvedMediaUrl.toLowerCase();
    return u.includes('whatsapp.net') && u.includes('.enc');
  }, [isAudioMessage, isStorageUrl, resolvedMediaUrl]);

  // Mesmo para vídeos - precisamos reprocessar se estiver criptografado
  const needsReprocessEncVideo = useMemo(() => {
    if (!isVideoMessage) return false;
    if (!resolvedMediaUrl) return false;
    if (isStorageUrl) return false;
    const u = resolvedMediaUrl.toLowerCase();
    return u.includes('whatsapp.net') && u.includes('.enc');
  }, [isVideoMessage, isStorageUrl, resolvedMediaUrl]);

  // Extrair thumbnail do raw_data para vídeos (usado enquanto reprocessa)
  const videoThumbnailBase64 = useMemo(() => {
    if (!rawData) return null;
    const raw = rawData as any;
    const thumb = pickFirstString(
      raw?.uazapi_response?.content?.JPEGThumbnail,
      raw?.uazapi_response?.content?.jpegThumbnail,
      raw?.message?.content?.JPEGThumbnail,
      raw?.message?.content?.jpegThumbnail,
      raw?.message?.videoMessage?.jpegThumbnail,
      raw?.message?.videoMessage?.JPEGThumbnail,
    );
    if (thumb && thumb.length > 100) {
      // É base64, formata como data URI
      if (thumb.startsWith('data:')) return thumb;
      return `data:image/jpeg;base64,${thumb}`;
    }
    return null;
  }, [rawData]);

  useEffect(() => {
    let cancelled = false;

    async function ensureFreshSession(): Promise<string | null> {
      // 1) Pega sessão atual
      const { data: s1 } = await supabase.auth.getSession();
      let token = s1.session?.access_token ?? null;
      if (token) return token;

      // 2) Tenta 1 refresh (muito comum após tab dormir / token expirar)
      const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
      if (refreshErr) {
        // Não logar token/infos sensíveis; apenas mensagem genérica.
        console.warn('[WhatsAppMediaRenderer] refreshSession failed');
      }
      token = refreshed.session?.access_token ?? null;
      return token;
    }

    async function forceReauth() {
      // Garante estado consistente: se o token falhou, derruba a sessão local.
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
      toast.error('Sua sessão expirou. Faça login novamente.');
      // Evita depender de hooks/roteamento aqui (efeito pode rodar em vários lugares)
      window.location.href = '/auth';
    }

    async function run() {
      if (!needsReprocessEncAudio) return;
      if (!messageId) return;
      if (autoReprocessAttempted) return;
      setAutoReprocessAttempted(true);
      try {
        if (!cancelled) setReprocessingAudio(true);

        // Garante token válido antes de invocar a função
        const token = await ensureFreshSession();
        if (!token) {
          await forceReauth();
          return;
        }

        // 1ª tentativa
        let { data, error } = await supabase.functions.invoke('whatsapp-reprocess-media', {
          body: { messageRowId: messageId },
        });

        // Se retornou 401, tenta mais 1 refresh + retry
        if (error) {
          const errMsg = String(error?.message || error || '').toLowerCase();
          const looksUnauthorized = errMsg.includes('401') || errMsg.includes('unauthorized');
          if (looksUnauthorized) {
            const token2 = await ensureFreshSession();
            if (!token2) {
              await forceReauth();
              return;
            }

            ;({ data, error } = await supabase.functions.invoke('whatsapp-reprocess-media', {
              body: { messageRowId: messageId },
            }));
          }
        }

        if (error) {
          const errMsg = String(error?.message || error || '').toLowerCase();
          if (errMsg.includes('401') || errMsg.includes('unauthorized')) {
            await forceReauth();
          } else {
            console.warn('[WhatsAppMediaRenderer] reprocess error', error);
            toast.error('Não foi possível preparar o áudio agora. Tente novamente.');
          }
          return;
        }

        const newUrl = data?.mediaUrl as string | undefined;
        if (newUrl && !cancelled) {
          setAudioError(false);
          setAudioActiveSrc(newUrl);
        }
      } catch (err) {
        console.warn('[WhatsAppMediaRenderer] auto reprocess failed', err);
      } finally {
        if (!cancelled) setReprocessingAudio(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [autoReprocessAttempted, messageId, needsReprocessEncAudio]);

  // Auto-reprocessamento de VÍDEOS criptografados (.enc)
  useEffect(() => {
    let cancelled = false;

    async function ensureFreshSession(): Promise<string | null> {
      const { data: s1 } = await supabase.auth.getSession();
      let token = s1.session?.access_token ?? null;
      if (token) return token;
      const { data: refreshed } = await supabase.auth.refreshSession();
      return refreshed.session?.access_token ?? null;
    }

    async function run() {
      if (!needsReprocessEncVideo) return;
      if (!messageId) return;
      if (autoReprocessVideoAttempted) return;
      setAutoReprocessVideoAttempted(true);
      try {
        if (!cancelled) setReprocessingVideo(true);

        const token = await ensureFreshSession();
        if (!token) {
          console.warn('[WhatsAppMediaRenderer] No token for video reprocess');
          return;
        }

        let { data, error } = await supabase.functions.invoke('whatsapp-reprocess-media', {
          body: { messageRowId: messageId },
        });

        // Retry on 401
        if (error) {
          const errMsg = String(error?.message || error || '').toLowerCase();
          if (errMsg.includes('401') || errMsg.includes('unauthorized')) {
            const token2 = await ensureFreshSession();
            if (token2) {
              ;({ data, error } = await supabase.functions.invoke('whatsapp-reprocess-media', {
                body: { messageRowId: messageId },
              }));
            }
          }
        }

        if (error) {
          console.warn('[WhatsAppMediaRenderer] video reprocess error', error);
          toast.error('Não foi possível preparar o vídeo agora.');
          return;
        }

        const newUrl = data?.mediaUrl as string | undefined;
        if (newUrl && !cancelled) {
          setVideoError(false);
          setVideoActiveSrc(newUrl);
        }
      } catch (err) {
        console.warn('[WhatsAppMediaRenderer] video auto reprocess failed', err);
      } finally {
        if (!cancelled) setReprocessingVideo(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [autoReprocessVideoAttempted, messageId, needsReprocessEncVideo]);

  // Heurística: às vezes o backend salva message_type como Conversation/Text, mas a mídia chega via media_url.
  // Nesse caso, renderizamos pelo mediaUrl (experiência estilo Direct/Messenger).
  const guessedKind = guessMediaKindFromUrl(resolvedMediaUrl);
  const effectiveType =
    normalizedType === 'text' || normalizedType === 'conversation' || normalizedType === 'extendedtext'
      ? (guessedKind ?? (isImagePlaceholderText(content) ? 'image' : isVideoPlaceholderText(content) ? 'video' : normalizedType))
      : normalizedType;

  const displaySrc = useMemo(() => {
    // Prioriza preview (base64 de alta qualidade) para exibição imediata; fallback para proxy da URL
    return getBestChatMediaSrc({ preview: mediaPreview, url: resolvedMediaUrl, kind: 'image' });
  }, [mediaPreview, resolvedMediaUrl]);

  // Verifica se já temos um preview base64 válido (renderiza instantaneamente)
  const hasBase64Preview = useMemo(() => {
    if (!mediaPreview) return false;
    const p = mediaPreview.trim();
    return p.startsWith('data:') || (p.length > 200 && /^[A-Za-z0-9+/=]+$/.test(p));
  }, [mediaPreview]);

  // IMPORTANTE: a rota de "backend functions" pode exigir headers (apikey/authorization).
  // Um <img src="..."> não envia headers customizados; então para mídias SEM preview base64
  // que dependem do proxy, buscamos via fetch autenticado e renderizamos via blob URL.
  // Isso vale tanto para mensagens RECEBIDAS quanto ENVIADAS sem preview.
  const shouldUseAuthedFetch = useMemo(() => {
    if (!displaySrc) return false;
    // Se já temos base64, não precisa fetch (renderiza direto)
    if (hasBase64Preview) return false;
    const s = displaySrc.toLowerCase();
    // Busca autenticada para qualquer URL que passa pelo proxy
    return s.includes('/functions/v1/media-proxy');
  }, [displaySrc, hasBase64Preview]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function run() {
      if (!shouldUseAuthedFetch || !displaySrc) {
        setAuthedBlobSrc(null);
        return;
      }

      try {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;

        const headers: Record<string, string> = {
          // publishable key do projeto (seguro para frontend)
          apikey: String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''),
        };
        if (accessToken) headers.authorization = `Bearer ${accessToken}`;

        const resp = await fetch(displaySrc, { headers });
        if (!resp.ok) throw new Error(`media-proxy http ${resp.status}`);

        const blob = await resp.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setAuthedBlobSrc(objectUrl);
      } catch {
        // Se falhar, mantemos o displaySrc original (pode funcionar em alguns ambientes)
        if (!cancelled) setAuthedBlobSrc(null);
      }
    }

    run();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [displaySrc, shouldUseAuthedFetch]);

  // Se a mensagem for atualizada via realtime (ex.: media_preview chega depois),
  // não podemos “travar” no fallback por causa de um onError antigo.
  useEffect(() => {
    setImageError(false);
    setVideoError(false);
    setAudioError(false);
    setAudioActiveSrc(null);
  }, [messageType, resolvedMediaUrl, mediaPreview, displaySrc]);

  // Text messages
  if (!messageType || effectiveType === 'text' || effectiveType === 'conversation' || effectiveType === 'extendedtext') {
    return (
      <p className="text-[13px] leading-relaxed break-words whitespace-pre-wrap">
        {content || ''}
      </p>
    );
  }

  // Image messages
  if (effectiveType === 'image') {
    // Sempre mostra a imagem se tiver alguma fonte disponível
    const finalImgSrc = authedBlobSrc || displaySrc;

    if (finalImgSrc && !imageError) {
      return (
        <div 
          className="cursor-pointer group"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (messageId && onOpenMediaViewer) {
              onOpenMediaViewer(messageId);
            }
          }}
        >
          <img
            src={finalImgSrc}
            alt="Imagem"
            loading="lazy"
            referrerPolicy="no-referrer"
            className="max-w-[280px] max-h-[320px] rounded-lg object-cover group-hover:opacity-90 transition-opacity"
            onError={() => setImageError(true)}
          />
          {content && 
           content !== '[Imagem]' && 
           content !== '[image]' && 
           !content.toLowerCase().includes('imagem') && 
           !content.toLowerCase().match(/^\[?image\]?$/) && (
            <p className="text-[13px] mt-1.5 leading-relaxed break-words whitespace-pre-wrap">
              {content}
            </p>
          )}
        </div>
      );
    }
    
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 py-1">
          <div className={cn(
            "p-2 rounded-md",
            fromMe ? "bg-primary-foreground/20" : "bg-muted-foreground/10"
          )}>
            <ImageIcon className="w-6 h-6 opacity-60" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium">📷 Imagem</p>
            {content && content !== '[Imagem]' && (
              <p className="text-[11px] opacity-70 break-words">{content}</p>
            )}
            {!mediaUrl && !mediaPreview && (
              <p className="text-[10px] opacity-50 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Mídia não disponível
              </p>
            )}
          </div>
        </div>

        {/* Se a URL existir mas o browser bloquear (hotlink/expiração), ainda damos um caminho pra ver a mídia */}
         {resolvedMediaUrl && (
          <Button
            variant="secondary"
            size="sm"
            className="h-7 px-2 text-[11px]"
            asChild
          >
             <a href={resolvedMediaUrl} target="_blank" rel="noopener noreferrer">
              Abrir original
            </a>
          </Button>
        )}
      </div>
    );
  }

  // Video messages
  if (effectiveType === 'video') {
    // Prioridade: videoActiveSrc (reprocessado) > storage URL > proxy URL
    const videoSrc = videoActiveSrc || (isStorageUrl ? resolvedMediaUrl : getBestChatMediaSrc({ preview: mediaPreview, url: resolvedMediaUrl, kind: 'video' }));
    
    // Se está reprocessando, mostra thumbnail com indicador de loading
    if (reprocessingVideo || needsReprocessEncVideo) {
      return (
        <div className="relative w-[240px] max-w-full max-h-[320px] rounded-lg overflow-hidden bg-muted">
          {videoThumbnailBase64 ? (
            <img 
              src={videoThumbnailBase64} 
              alt="Vídeo" 
              className="w-full h-full object-cover opacity-70"
            />
          ) : (
            <div className="w-full h-[180px] flex items-center justify-center bg-muted">
              <Video className="w-12 h-12 opacity-40" />
            </div>
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent mb-2" />
            <span className="text-[11px] text-white/90">Preparando vídeo...</span>
          </div>
        </div>
      );
    }
    
    if (videoSrc && !videoError) {
      return (
        <div 
          className="cursor-pointer group"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (messageId && onOpenMediaViewer) {
              onOpenMediaViewer(messageId);
            }
          }}
        >
          <div className="relative w-[240px] max-w-full max-h-[320px] rounded-lg overflow-hidden bg-muted">
            <video
              src={videoSrc}
              className="w-full h-full object-contain"
              onError={() => setVideoError(true)}
              muted
              preload="metadata"
            />
            {/* Play icon overlay - styled like audio player button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg",
                fromMe 
                  ? "bg-primary-foreground/30 hover:bg-primary-foreground/50 text-primary-foreground" 
                  : "bg-primary/90 hover:bg-primary text-primary-foreground"
              )}>
                <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
              </div>
            </div>
          </div>
          {content && 
           content !== '[Vídeo]' && 
           content !== '[video]' && 
           content !== '[Video]' &&
           !content.toLowerCase().includes('vídeo') && 
           !content.toLowerCase().match(/^\[?video\]?$/) && (
            <p className="text-[13px] mt-1.5 leading-relaxed break-words whitespace-pre-wrap">
              {content}
            </p>
          )}
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2 py-1">
        <div className={cn(
          "p-2 rounded-md relative",
          fromMe ? "bg-primary-foreground/20" : "bg-muted-foreground/10"
        )}>
          <Video className="w-6 h-6 opacity-60" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Play className="w-3 h-3" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium">🎬 Vídeo</p>
          {!mediaUrl && !mediaPreview && (
            <p className="text-[10px] opacity-50 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Mídia não disponível
            </p>
          )}
        </div>
      </div>
    );
  }

  // Audio/Voice messages (ptt, audio, AudioMessage, myaudio)
  // DEBUG: verificar se tipo está correto
  const isAudioType = effectiveType === 'audio' || effectiveType === 'ptt' || effectiveType === 'myaudio';
  if (messageType?.toLowerCase().includes('audio') || messageType?.toLowerCase() === 'ptt') {
    console.log('[WhatsAppMediaRenderer] Audio message check:', {
      messageType,
      normalizedType,
      effectiveType,
      isAudioType,
      resolvedMediaUrl
    });
  }
  
  if (isAudioType) {
    // Extrair URL de áudio e duração do raw_data
    let audioUrl = resolvedMediaUrl;
    let audioDuration: number | undefined;
    let rawWhatsAppUrl: string | null = null;
    let storageUrl: string | null = null;
    
    // Prioridade 1: URL do storage (sempre funciona, já salva e pública)
    if (resolvedMediaUrl && resolvedMediaUrl.includes('.supabase.co/storage/')) {
      storageUrl = resolvedMediaUrl;
    }
    
    if (rawData) {
      const raw = rawData as any;
      
      // Extrair URL de múltiplas estruturas possíveis
      if (!audioUrl) {
        audioUrl = pickFirstString(
          // Estrutura UAZAPI v2 (resposta de envio)
          raw?.uazapi_response?.content?.URL,
          raw?.uazapi_response?.content?.url,
          // Estrutura de mensagem recebida
          raw?.message?.content?.URL,
          raw?.message?.content?.url,
          // Estrutura alternativa (audioMessage)
          raw?.message?.audioMessage?.url,
          raw?.message?.audioMessage?.URL,
          // Fallbacks genéricos
          raw?.content?.URL,
          raw?.content?.url,
          raw?.URL,
          raw?.url
        );
      }

      // Preferimos capturar também a URL do WhatsApp (geralmente .enc em mmg.whatsapp.net)
      // para usar como fallback quando a URL armazenada (ex.: storage) estiver com
      // Content-Type/extensão inconsistente e o browser não conseguir decodificar.
      rawWhatsAppUrl = pickFirstString(
        raw?.message?.content?.URL,
        raw?.message?.content?.url,
        raw?.message?.audioMessage?.URL,
        raw?.message?.audioMessage?.url,
        raw?.uazapi_response?.content?.URL,
        raw?.uazapi_response?.content?.url
      );
      if (rawWhatsAppUrl && !rawWhatsAppUrl.toLowerCase().includes('whatsapp.net')) {
        rawWhatsAppUrl = null;
      }
      
      // Extrair duração em segundos (UAZAPI retorna "seconds" no content)
      audioDuration = 
        raw?.uazapi_response?.content?.seconds ??
        raw?.message?.content?.seconds ??
        raw?.message?.audioMessage?.seconds ??
        raw?.content?.seconds ??
        raw?.seconds ??
        undefined;
    }
    
    // Se for .enc do WhatsApp, não tentamos tocar (não decodifica). Mostramos reprocessamento.
    if (needsReprocessEncAudio) {
      return (
        <div className="flex items-center gap-2 py-2">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
            fromMe ? "bg-primary-foreground/20" : "bg-muted-foreground/10"
          )}>
            <Mic className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium">🎤 Áudio</p>
            <p className="text-[10px] opacity-70 break-words">
              {reprocessingAudio ? 'Preparando áudio…' : 'Áudio criptografado — preparando para reprodução.'}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 px-2 text-[11px] shrink-0"
            disabled={reprocessingAudio}
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!messageId) {
                toast.error('Não foi possível identificar a mensagem para reprocessar.');
                return;
              }
              try {
                setReprocessingAudio(true);
                const { data, error } = await supabase.functions.invoke('whatsapp-reprocess-media', {
                  body: { messageRowId: messageId },
                });
                if (error) throw error;
                const newUrl = data?.mediaUrl as string | undefined;
                if (newUrl) {
                  setAudioError(false);
                  setAudioActiveSrc(newUrl);
                  toast.success('Áudio pronto para reprodução.');
                } else {
                  toast.error('Não foi possível preparar o áudio.');
                }
              } catch (err) {
                console.warn('[WhatsAppMediaRenderer] reprocess failed', err);
                toast.error('Falha ao preparar o áudio.');
              } finally {
                setReprocessingAudio(false);
              }
            }}
          >
            {reprocessingAudio ? 'Aguarde…' : 'Preparar'}
          </Button>
        </div>
      );
    }

    // PRIORIDADE DE AUDIO:
    // 1. URL do Storage
    // 2. URL externa via proxy (quando não é .enc)
    
    const primaryAudioSrc = storageUrl 
      ? storageUrl  // Storage é público, usa direto
      : (audioUrl 
        ? getBestChatMediaSrc({ preview: null, url: audioUrl, kind: 'audio' }) 
        : null);
    
    // Fallback: se não temos storage, tentamos WhatsApp via proxy
    const fallbackAudioSrc = !storageUrl && rawWhatsAppUrl 
      ? getBestChatMediaSrc({ preview: null, url: rawWhatsAppUrl, kind: 'audio' }) 
      : null;

    const chosenAudioSrc = audioActiveSrc ?? primaryAudioSrc;

    // Se não temos URL do storage e a origem é WhatsApp CDN (.enc), o browser não consegue decodificar.
    const canReprocess = false;
    
    // DEBUG: Log para verificar se a URL está chegando
    console.log('[WhatsAppMediaRenderer] Audio sources:', { 
      storageUrl,
      audioUrl, 
      primaryAudioSrc, 
      fallbackAudioSrc,
      chosenAudioSrc,
      resolvedMediaUrl 
    });
    
    if (chosenAudioSrc && !audioError) {
      return (
        <div className="space-y-2">
          <AudioPlayer
            src={chosenAudioSrc}
            duration={audioDuration}
            fromMe={fromMe}
            compact
            className="min-w-[200px] max-w-[280px]"
            onError={() => {
              console.warn('[WhatsAppMediaRenderer] Audio error, trying fallback:', { chosenAudioSrc, fallbackAudioSrc });
              // 1) Se o src primário falhar (ex.: storage com mime/ext errado), tenta automaticamente
              // o fallback via WhatsApp CDN + media-proxy.
              if (fallbackAudioSrc && chosenAudioSrc !== fallbackAudioSrc) {
                setAudioActiveSrc(fallbackAudioSrc);
                return;
              }
              setAudioError(true);
            }}
          />

          {canReprocess && null}
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2 py-1">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center",
          fromMe ? "bg-primary-foreground/20" : "bg-muted-foreground/10"
        )}>
          <Mic className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium">🎤 Áudio</p>
          {!mediaUrl && (
            <p className="text-[10px] opacity-50 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Mídia não disponível
            </p>
          )}
        </div>
      </div>
    );
  }

  // Document messages
  if (effectiveType === 'document' || effectiveType === 'documentwithcaption') {
    const docUrl = resolvedMediaUrl ? getBestChatMediaSrc({ url: resolvedMediaUrl, kind: 'document' }) : null;

    const { fileName, fileFormat, caption } = extractDocumentMeta(rawData, content, resolvedMediaUrl);
    
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 py-1 min-w-[180px]">
          <div className={cn(
            "p-2 rounded-md",
            fromMe ? "bg-primary-foreground/20" : "bg-muted-foreground/10"
          )}>
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium break-words">{fileName}</p>
            <p className="text-[10px] opacity-70">{fileFormat}</p>
          </div>
          {docUrl && (
            <button
              type="button"
              className={cn(
                "p-2 rounded-md shrink-0 transition-colors",
                fromMe 
                  ? "hover:bg-primary-foreground/20" 
                  : "hover:bg-muted-foreground/10"
              )}
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                  const response = await fetch(docUrl);
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = fileName;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  console.error('Erro ao baixar documento:', err);
                  // Fallback: abre em nova aba
                  window.open(docUrl, '_blank');
                }
              }}
            >
              <Download className="w-5 h-5" />
            </button>
          )}
        </div>
        {/* Legenda abaixo do documento */}
        {caption && caption !== fileName && (
          <p className="text-[13px] leading-relaxed break-words whitespace-pre-wrap">
            {caption}
          </p>
        )}
      </div>
    );
  }

  // Sticker messages
  if (normalizedType === 'sticker') {
    if (mediaUrl) {
      return (
        <img
          src={mediaUrl}
          alt="Sticker"
          className="w-24 h-24 object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }
    
    return (
      <div className="flex items-center gap-2 py-1">
        <Sticker className="w-6 h-6 opacity-60" />
        <span className="text-[13px]">Sticker</span>
      </div>
    );
  }

  // Location messages
  if (normalizedType === 'location' || normalizedType === 'livelocation') {
    return (
      <div className="flex items-center gap-2 py-1">
        <div className={cn(
          "p-2 rounded-md",
          fromMe ? "bg-primary-foreground/20" : "bg-muted-foreground/10"
        )}>
          <MapPin className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium">📍 Localização</p>
          {content && content !== '[Localização]' && (
            <p className="text-[11px] opacity-70 break-words">{content}</p>
          )}
        </div>
        {mediaUrl && (
          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
            <a href={mediaUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </Button>
        )}
      </div>
    );
  }

  // Contact/vCard messages
  if (normalizedType === 'contact' || normalizedType === 'contactsarray') {
    return (
      <div className="flex items-center gap-2 py-1">
        <div className={cn(
          "p-2 rounded-md",
          fromMe ? "bg-primary-foreground/20" : "bg-muted-foreground/10"
        )}>
          <User className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium">👤 Contato</p>
          {content && content !== '[Contato]' && (
            <p className="text-[11px] opacity-70 break-words">{content}</p>
          )}
        </div>
      </div>
    );
  }

  // Reaction messages
  if (normalizedType === 'reaction') {
    return (
      <div className="text-xl py-0.5">
        {content || '👍'}
      </div>
    );
  }

  // Poll messages
  if (normalizedType === 'poll' || normalizedType === 'pollcreation') {
    return (
      <div className="py-1">
        <p className="text-[13px] font-medium mb-0.5">📊 Enquete</p>
        {content && content !== '[Enquete]' && (
          <p className="text-[13px] opacity-90">{content}</p>
        )}
      </div>
    );
  }

  // Protocol/system messages
  if (normalizedType === 'protocol') {
    return (
      <p className="text-[11px] italic opacity-70">
        Mensagem do sistema
      </p>
    );
  }

  // Button/Interactive messages
  if (normalizedType === 'buttons' || normalizedType === 'template' || normalizedType === 'list') {
    return (
      <div className="py-1">
        {content && <p className="text-[13px] break-words whitespace-pre-wrap">{content}</p>}
        <p className="text-[10px] opacity-70 mt-0.5">📱 Mensagem interativa</p>
      </div>
    );
  }

  // Default fallback for unknown types
  return (
    <div className="flex items-center gap-2 py-1">
      <File className="w-4 h-4 opacity-60" />
      <div className="flex-1 min-w-0">
        {content ? (
          <p className="text-[13px] break-words whitespace-pre-wrap">{content}</p>
        ) : (
          <p className="text-[13px] opacity-70">
            {messageType ? `[${messageType}]` : '[Mídia]'}
          </p>
        )}
      </div>
    </div>
  );
}
