import { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Image as ImageIcon, Video, Music, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MediaViewer, MediaViewerItem } from './MediaViewer';
import { getBestChatMediaSrc } from './mediaSrc';

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

const mediaTypeConfig: Record<string, { label: string; icon: typeof ImageIcon; type: 'image' | 'video' | 'audio' | 'document' }> = {
  image: { label: 'Imagem', icon: ImageIcon, type: 'image' },
  video: { label: 'Vídeo', icon: Video, type: 'video' },
  audio: { label: 'Áudio', icon: Music, type: 'audio' },
  ptt: { label: 'Áudio', icon: Music, type: 'audio' },
  document: { label: 'Documento', icon: FileText, type: 'document' },
  sticker: { label: 'Sticker', icon: ImageIcon, type: 'image' },
};

export function ChatMediaPreview({ messages, className }: ChatMediaPreviewProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaViewerItem | null>(null);

  // Filter only media messages
  const mediaMessages = useMemo(() => {
    return messages.filter(msg => {
      const type = msg.message_type?.toLowerCase();
      return type && ['image', 'video', 'audio', 'ptt', 'document', 'sticker'].includes(type);
    });
  }, [messages]);

  // Convert to viewer format
  const viewerItems: MediaViewerItem[] = useMemo(() => {
    return mediaMessages.map(msg => {
      const type = msg.message_type?.toLowerCase() || 'document';
      const config = mediaTypeConfig[type] || mediaTypeConfig.document;

      const kind =
        type === 'video'
          ? 'video'
          : type === 'audio' || type === 'ptt'
            ? 'audio'
            : type === 'document'
              ? 'document'
              : 'image';

      return {
        id: msg.id,
        type: config.type,
        // Garante que URLs do WhatsApp passem pelo proxy também no visualizador
        src: getBestChatMediaSrc({ preview: null, url: msg.media_url, kind }) || '',
        preview: msg.media_preview,
        caption: msg.content,
        timestamp: msg.message_timestamp,
        fromMe: msg.from_me ?? false,
      };
    });
  }, [mediaMessages]);

  const handleMediaClick = (item: MediaViewerItem) => {
    setSelectedMedia(item);
    setViewerOpen(true);
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (!selectedMedia) return;
    const currentIndex = viewerItems.findIndex(m => m.id === selectedMedia.id);
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < viewerItems.length) {
      setSelectedMedia(viewerItems[newIndex]);
    }
  };

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
    const type = item.message_type?.toLowerCase();
    const kind = type === 'video' ? 'video' : type === 'audio' || type === 'ptt' ? 'audio' : type === 'document' ? 'document' : 'image';
    const src = getBestChatMediaSrc({ preview: item.media_preview, url: item.media_url, kind });
    
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
            const viewerItem = viewerItems.find(v => v.id === item.id);
            
            return (
              <div
                key={item.id}
                className="relative aspect-square rounded-md overflow-hidden cursor-pointer group border hover:border-primary/50 transition-all"
                onClick={() => viewerItem && handleMediaClick(viewerItem)}
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
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-xs font-medium">Ver</span>
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

      {/* Media Viewer Modal */}
      <MediaViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        media={selectedMedia}
        allMedia={viewerItems}
        onNavigate={handleNavigate}
      />
    </div>
  );
}