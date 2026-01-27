import { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Image as ImageIcon, Video, Music, FileText, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMedia {
  id: string;
  message_type?: string | null;
  media_url?: string | null;
  media_preview?: string | null;
  content?: string | null;
  message_timestamp?: string | null;
  from_me?: boolean | null;
}

interface ChatMediaPreviewProps {
  messages: ChatMedia[];
  className?: string;
}

const mediaTypeConfig: Record<string, { label: string; icon: typeof ImageIcon }> = {
  image: { label: 'Imagem', icon: ImageIcon },
  video: { label: 'Vídeo', icon: Video },
  audio: { label: 'Áudio', icon: Music },
  ptt: { label: 'Áudio', icon: Music },
  document: { label: 'Documento', icon: FileText },
  sticker: { label: 'Sticker', icon: ImageIcon },
};

export function ChatMediaPreview({ messages, className }: ChatMediaPreviewProps) {
  // Filter only media messages
  const mediaMessages = useMemo(() => {
    return messages.filter(msg => {
      const type = msg.message_type?.toLowerCase();
      return type && ['image', 'video', 'audio', 'ptt', 'document', 'sticker'].includes(type);
    });
  }, [messages]);

  if (mediaMessages.length === 0) {
    return (
      <div className={cn("text-center py-6", className)}>
        <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
        <p className="text-xs text-muted-foreground">
          Nenhuma mídia nesta conversa
        </p>
      </div>
    );
  }

  const renderThumbnail = (item: ChatMedia) => {
    const src = item.media_preview || item.media_url;
    const type = item.message_type?.toLowerCase();
    
    if ((type === 'image' || type === 'sticker') && src) {
      return (
        <img
          src={src}
          alt="Mídia"
          className="w-full h-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      );
    }

    const config = mediaTypeConfig[type || 'document'] || mediaTypeConfig.document;
    const Icon = config.icon;
    
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
    );
  };

  return (
    <div className={cn("space-y-2", className)}>
      <h5 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        Mídias da Conversa ({mediaMessages.length})
      </h5>
      
      <ScrollArea className="h-[160px]">
        <div className="grid grid-cols-3 gap-1.5">
          {mediaMessages.slice(0, 12).map(item => {
            const type = item.message_type?.toLowerCase();
            const config = mediaTypeConfig[type || 'document'] || mediaTypeConfig.document;
            
            return (
              <div
                key={item.id}
                className="relative aspect-square rounded-md overflow-hidden cursor-pointer group border hover:border-primary/50 transition-all"
                onClick={() => {
                  const url = item.media_url || item.media_preview;
                  if (url) window.open(url, '_blank');
                }}
              >
                {renderThumbnail(item)}
                
                {/* From me badge */}
                {item.from_me && (
                  <Badge 
                    variant="secondary" 
                    className="absolute top-0.5 right-0.5 text-[8px] px-1 py-0 h-4"
                  >
                    Env
                  </Badge>
                )}
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ExternalLink className="w-4 h-4 text-white" />
                </div>
                
                {/* Type badge */}
                <div className="absolute bottom-0.5 left-0.5">
                  <config.icon className="w-3 h-3 text-white drop-shadow-md" />
                </div>
              </div>
            );
          })}
        </div>
        
        {mediaMessages.length > 12 && (
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            +{mediaMessages.length - 12} mídias
          </p>
        )}
      </ScrollArea>
    </div>
  );
}