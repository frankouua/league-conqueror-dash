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
import { getPreviewSrc, getHdProxyUrl, getBestChatMediaSrc } from './mediaSrc';

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
  onOpenMediaViewer?: (mediaId: string) => void;
}

function normalizeMessageType(type: string | null): string {
  if (!type) return 'text';
  return type.toLowerCase().replace('message', '').trim();
}

function guessMediaKindFromUrl(url: string | null): 'image' | 'video' | 'audio' | 'document' | null {
  if (!url) return null;
  const clean = url.split('?')[0]?.toLowerCase() ?? '';

  if (/(\.png|\.jpg|\.jpeg|\.gif|\.webp)$/.test(clean) || clean.includes('whatsapp.net')) {
    return 'image';
  }
  if (/(\.mp4|\.mov|\.webm)$/.test(clean)) return 'video';
  if (/(\.mp3|\.ogg|\.wav|\.m4a)$/.test(clean)) return 'audio';
  if (/(\.pdf|\.doc|\.docx|\.xls|\.xlsx|\.ppt|\.pptx|\.txt|\.csv)$/.test(clean)) return 'document';

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

  return (
    pickFirstString(
      raw?.message?.content?.url,
      raw?.message?.content?.URL,
      raw?.message?.content?.mediaUrl,
      raw?.message?.content?.media_url,
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
      raw?.uazapi_response?.content?.url,
      raw?.uazapi_response?.content?.URL,
      raw?.uazapi_response?.content?.mediaUrl,
      raw?.uazapi_response?.content?.media_url,
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

    if (m === 'application/pdf') return 'PDF';
    if (m === 'text/plain') return 'TXT';
    if (m === 'text/csv') return 'CSV';
    if (m === 'application/zip') return 'ZIP';
    if (m === 'application/x-zip-compressed') return 'ZIP';
    if (m === 'application/msword') return 'DOC';
    if (m.includes('wordprocessingml.document')) return 'DOCX';
    if (m === 'application/vnd.ms-excel') return 'XLS';
    if (m.includes('spreadsheetml.sheet')) return 'XLSX';
    if (m === 'application/vnd.ms-powerpoint') return 'PPT';
    if (m.includes('presentationml.presentation')) return 'PPTX';

    const subtype = (m.split('/')[1] || '').trim();
    if (subtype && !subtype.includes('vnd.') && !subtype.includes('openxml')) return subtype.toUpperCase();
  }
  if (fileName) {
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

  const messageContent = raw?.message?.content ?? null;
  const docMessage = raw?.message?.documentMessage 
    ?? raw?.message?.documentWithCaptionMessage?.message?.documentMessage
    ?? null;

  const fileName =
    pickFirstString(
      messageContent?.fileName,
      messageContent?.file_name,
      messageContent?.filename,
      docMessage?.fileName,
      docMessage?.file_name,
      docMessage?.title,
      raw?.file_name,
      raw?.filename,
      raw?.name,
      raw?.uazapi_response?.content?.fileName,
      raw?.uazapi_response?.content?.file_name,
      raw?.uazapi_response?.content?.filename,
      raw?.uazapi_response?.content?.name,
      raw?.uazapi_response?.content?.docName,
      raw?.uazapi_response?.content?.doc_name,
      raw?.content?.fileName,
      raw?.content?.file_name,
      raw?.content?.filename,
      raw?.content?.name,
      raw?.content?.docName,
      raw?.content?.doc_name
    ) ||
    (() => {
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
      messageContent?.mimetype,
      messageContent?.mime_type,
      docMessage?.mimetype,
      docMessage?.mime_type,
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
      raw?.message?.text,
      messageContent?.caption,
      docMessage?.caption,
      raw?.message?.documentWithCaptionMessage?.message?.documentMessage?.caption,
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
  // Estado para o blob HD carregado em background
  const [hdBlobSrc, setHdBlobSrc] = useState<string | null>(null);
  const [isLoadingHd, setIsLoadingHd] = useState(false);

  const normalizedType = normalizeMessageType(messageType);

  // Resolve URL da mídia (pode estar no raw_data)
  const resolvedMediaUrl = useMemo(() => {
    return mediaUrl ?? extractMediaUrlFromRawData(rawData);
  }, [mediaUrl, rawData]);

  const guessedKind = guessMediaKindFromUrl(resolvedMediaUrl);
  const effectiveType =
    normalizedType === 'text' || normalizedType === 'conversation' || normalizedType === 'extendedtext'
      ? (guessedKind ?? (isImagePlaceholderText(content) ? 'image' : isVideoPlaceholderText(content) ? 'video' : normalizedType))
      : normalizedType;

  // CARREGAMENTO PROGRESSIVO:
  // 1. previewSrc = thumbnail Base64 para exibição IMEDIATA
  // 2. hdProxyUrl = URL HD via proxy para carregamento em BACKGROUND
  const previewSrc = useMemo(() => {
    return getPreviewSrc(mediaPreview, 'image');
  }, [mediaPreview]);

  const hdProxyUrl = useMemo(() => {
    return getHdProxyUrl(resolvedMediaUrl);
  }, [resolvedMediaUrl]);

  // Fonte final: HD blob (quando carregado) > Preview base64 > proxy direto (fallback)
  const displaySrc = hdBlobSrc || previewSrc || hdProxyUrl;

  // LOG DE DEBUG (temporário)
  useEffect(() => {
    if (effectiveType === 'image') {
      console.log('[WhatsAppMediaRenderer] 📊 Debug mídia:', {
        messageId,
        hasPreview: !!previewSrc,
        hasHdProxyUrl: !!hdProxyUrl,
        hasHdBlobSrc: !!hdBlobSrc,
        displaySrc: displaySrc?.slice(0, 50) + (displaySrc && displaySrc.length > 50 ? '...' : ''),
      });
    }
  }, [effectiveType, messageId, previewSrc, hdProxyUrl, hdBlobSrc, displaySrc]);

  // Efeito para carregar a imagem HD em background
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function loadHdImage() {
      // Só carrega HD se tiver URL de proxy disponível
      if (!hdProxyUrl) {
        console.log('[WhatsAppMediaRenderer] ⚠️ hdProxyUrl ausente, usando apenas preview');
        return;
      }

      // Se já temos preview, não bloquear o render - carregar HD em background
      setIsLoadingHd(true);

      try {
        // DEBUG: URL absoluta?
        console.log('[WhatsAppMediaRenderer] 🔗 Iniciando fetch HD:', {
          url: hdProxyUrl.slice(0, 80) + '...',
          isAbsolute: hdProxyUrl.startsWith('http'),
        });

        // O `media-proxy` é público (verify_jwt=false).
        // Carregamos SEM headers para evitar preflight CORS.
        const resp = await fetch(hdProxyUrl);
        
        console.log('[WhatsAppMediaRenderer] ✅ Resposta proxy:', {
          status: resp.status,
          contentType: resp.headers.get('content-type'),
          cors: resp.headers.get('access-control-allow-origin'),
        });

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const blob = await resp.blob();
        console.log('[WhatsAppMediaRenderer] 📦 Blob HD:', {
          size: blob.size,
          type: blob.type,
        });

        if (blob.size === 0) throw new Error('Blob vazio');

        objectUrl = URL.createObjectURL(blob);
        
        if (!cancelled) {
          console.log('[WhatsAppMediaRenderer] 🎉 HD carregado com sucesso!');
          setHdBlobSrc(objectUrl);
          setIsLoadingHd(false);
        }
      } catch (err) {
        console.error('[WhatsAppMediaRenderer] ❌ Falha ao carregar HD (usando preview):', err);
        if (!cancelled) {
          // Não quebra UI - continua usando preview
          setHdBlobSrc(null);
          setIsLoadingHd(false);
        }
      }
    }

    loadHdImage();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [hdProxyUrl]);

  // Reset do blob HD quando a URL muda (nova mensagem)
  useEffect(() => {
    setHdBlobSrc(null);
    setImageError(false);
    setVideoError(false);
    setAudioError(false);
  }, [resolvedMediaUrl, mediaPreview]);

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
    // Fonte final: HD > preview > proxy direto
    const finalImgSrc = displaySrc;

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
            className="w-[240px] max-w-full max-h-[320px] rounded-lg object-contain bg-muted group-hover:opacity-90 transition-opacity"
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
    const videoSrc = getBestChatMediaSrc({ preview: mediaPreview, url: resolvedMediaUrl, kind: 'video' });
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
            {/* Play icon overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <Play className="w-6 h-6 text-foreground ml-1" fill="currentColor" />
              </div>
            </div>
          </div>
          {content && 
           content !== '[Vídeo]' && 
           content !== '[video]' && 
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

  // Audio/Voice messages
  if (effectiveType === 'audio' || effectiveType === 'ptt') {
    const audioSrc = getBestChatMediaSrc({ preview: mediaPreview, url: resolvedMediaUrl, kind: 'audio' });
    if (audioSrc && !audioError) {
      return (
        <div className="flex items-center gap-2 py-0.5 min-w-[180px]">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
            fromMe ? "bg-primary-foreground/20" : "bg-muted-foreground/10"
          )}>
            <Mic className="w-4 h-4" />
          </div>
          <audio 
            controls 
            className="h-7 max-w-[180px] flex-1"
            onError={() => setAudioError(true)}
          >
            <source src={audioSrc} type="audio/ogg" />
            <source src={audioSrc} type="audio/mpeg" />
            Áudio não suportado
          </audio>
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
