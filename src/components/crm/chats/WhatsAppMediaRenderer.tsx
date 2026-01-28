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
  return type.toLowerCase().replace('message', '').trim();
}

function guessMediaKindFromUrl(url: string | null): 'image' | 'video' | 'audio' | 'document' | null {
  if (!url) return null;
  const clean = url.split('?')[0]?.toLowerCase() ?? '';

  // Common image extensions + WhatsApp CDN patterns
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

  const normalizedType = normalizeMessageType(messageType);

  // Heurística: às vezes o backend salva message_type como Conversation/Text, mas a mídia chega via media_url.
  // Nesse caso, renderizamos pelo mediaUrl (experiência estilo Direct/Messenger).
  const guessedKind = guessMediaKindFromUrl(mediaUrl);
  const effectiveType =
    normalizedType === 'text' || normalizedType === 'conversation' || normalizedType === 'extendedtext'
      ? (guessedKind ?? (isImagePlaceholderText(content) ? 'image' : isVideoPlaceholderText(content) ? 'video' : normalizedType))
      : normalizedType;

  // Extrai thumbnail base64 do raw_data para imagens recebidas (UAZAPI envia como JPEGThumbnail)
  const extractedThumbnail = useMemo(() => {
    if (mediaPreview) return null; // Já temos preview, não precisa extrair
    const raw = (rawData ?? {}) as any;
    const thumbnail = raw?.message?.content?.JPEGThumbnail 
      ?? raw?.message?.imageMessage?.jpegThumbnail
      ?? raw?.message?.videoMessage?.jpegThumbnail
      ?? null;
    if (thumbnail && typeof thumbnail === 'string' && thumbnail.length > 50) {
      // Verifica se já é data URI ou se precisa adicionar prefixo
      if (thumbnail.startsWith('data:')) return thumbnail;
      return `data:image/jpeg;base64,${thumbnail}`;
    }
    return null;
  }, [rawData, mediaPreview]);

  const displaySrc = useMemo(() => {
    // Prioriza: 1) media_preview do DB, 2) thumbnail extraído do raw_data, 3) proxy da URL
    const effectivePreview = mediaPreview || extractedThumbnail;
    return getBestChatMediaSrc({ preview: effectivePreview, url: mediaUrl, kind: 'image' });
  }, [mediaPreview, mediaUrl, extractedThumbnail]);

  // Se a mensagem for atualizada via realtime (ex.: media_preview chega depois),
  // não podemos “travar” no fallback por causa de um onError antigo.
  useEffect(() => {
    setImageError(false);
    setVideoError(false);
    setAudioError(false);
  }, [messageType, mediaUrl, mediaPreview]);

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
    if (displaySrc && !imageError) {
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
            src={displaySrc}
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
        {mediaUrl && (
          <Button
            variant="secondary"
            size="sm"
            className="h-7 px-2 text-[11px]"
            asChild
          >
            <a href={mediaUrl} target="_blank" rel="noopener noreferrer">
              Abrir original
            </a>
          </Button>
        )}
      </div>
    );
  }

  // Video messages
  if (effectiveType === 'video') {
    const videoSrc = getBestChatMediaSrc({ preview: mediaPreview, url: mediaUrl, kind: 'video' });
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
    const audioSrc = getBestChatMediaSrc({ preview: mediaPreview, url: mediaUrl, kind: 'audio' });
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
    const docUrl = mediaUrl ? getBestChatMediaSrc({ url: mediaUrl, kind: 'document' }) : null;

    const { fileName, fileFormat, caption } = extractDocumentMeta(rawData, content, mediaUrl);
    
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
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 hover:bg-muted"
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
              <Download className="w-3.5 h-3.5" />
            </Button>
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
