import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Image as ImageIcon, 
  Video, 
  Music, 
  FileText, 
  Trash2, 
  Archive, 
  RotateCcw,
  Download,
  HardDrive,
  Filter,
  X,
  CheckSquare,
  Square
} from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { useMediaLibrary, MediaItem, ChannelType, MediaType } from '@/hooks/useMediaLibrary';

interface MediaLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultChannel?: ChannelType;
}

const channelConfig = {
  whatsapp: { label: 'WhatsApp', icon: WhatsAppIcon, color: 'text-green-500' },
  instagram: { label: 'Instagram', icon: ImageIcon, color: 'text-pink-500' },
  facebook: { label: 'Facebook', icon: ImageIcon, color: 'text-blue-500' },
  telegram: { label: 'Telegram', icon: ImageIcon, color: 'text-sky-500' },
  email: { label: 'Email', icon: FileText, color: 'text-gray-500' },
};

const mediaTypeConfig = {
  image: { label: 'Imagens', icon: ImageIcon },
  video: { label: 'Vídeos', icon: Video },
  audio: { label: 'Áudios', icon: Music },
  document: { label: 'Documentos', icon: FileText },
  sticker: { label: 'Stickers', icon: ImageIcon },
};

export function MediaLibraryDialog({ open, onOpenChange, defaultChannel = 'whatsapp' }: MediaLibraryDialogProps) {
  const [activeChannel, setActiveChannel] = useState<ChannelType>(defaultChannel);
  const [activeMediaType, setActiveMediaType] = useState<MediaType | 'all'>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null);

  const { media, stats, loading, archiveMedia, restoreMedia, deleteMedia } = useMediaLibrary({
    channel: activeChannel,
    mediaType: activeMediaType === 'all' ? undefined : activeMediaType,
    includeArchived: showArchived,
    limit: 200,
  });

  const filteredMedia = useMemo(() => {
    if (showArchived) {
      return media.filter(m => m.is_archived);
    }
    return media.filter(m => !m.is_archived);
  }, [media, showArchived]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredMedia.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMedia.map(m => m.id)));
    }
  };

  const handleArchive = async () => {
    if (selectedIds.size === 0) return;
    await archiveMedia(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleRestore = async () => {
    if (selectedIds.size === 0) return;
    await restoreMedia(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Deletar permanentemente ${selectedIds.size} mídia(s)? Esta ação não pode ser desfeita.`)) {
      return;
    }
    await deleteMedia(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const renderMediaThumbnail = (item: MediaItem) => {
    const src = item.media_preview || item.media_url;
    
    if (item.media_type === 'image' && src) {
      return (
        <img
          src={src}
          alt={item.caption || 'Imagem'}
          className="w-full h-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      );
    }

    if (item.media_type === 'video' && src) {
      return (
        <div className="w-full h-full bg-black/80 flex items-center justify-center">
          <Video className="w-8 h-8 text-white/80" />
        </div>
      );
    }

    const IconComponent = mediaTypeConfig[item.media_type]?.icon || FileText;
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <IconComponent className="w-8 h-8 text-muted-foreground" />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Biblioteca de Mídias
          </DialogTitle>
        </DialogHeader>

        {/* Stats Bar */}
        {stats && (
          <div className="flex flex-wrap gap-2 py-2 border-b shrink-0">
            <Badge variant="outline" className="gap-1">
              <ImageIcon className="w-3 h-3" />
              {stats.image_count} imagens
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Video className="w-3 h-3" />
              {stats.video_count} vídeos
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Music className="w-3 h-3" />
              {stats.audio_count} áudios
            </Badge>
            <Badge variant="outline" className="gap-1">
              <FileText className="w-3 h-3" />
              {stats.document_count} documentos
            </Badge>
            <Badge variant="secondary" className="ml-auto gap-1">
              <HardDrive className="w-3 h-3" />
              ~{stats.estimated_size_mb} MB
            </Badge>
          </div>
        )}

        {/* Channel Tabs */}
        <Tabs value={activeChannel} onValueChange={(v) => setActiveChannel(v as ChannelType)} className="shrink-0">
          <TabsList className="grid w-full grid-cols-3">
            {(['whatsapp', 'instagram', 'facebook'] as ChannelType[]).map(ch => {
              const config = channelConfig[ch];
              const Icon = config.icon;
              return (
                <TabsTrigger key={ch} value={ch} className="gap-1.5">
                  <Icon className={cn("w-4 h-4", config.color)} />
                  {config.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Filters Bar */}
        <div className="flex items-center gap-2 py-2 shrink-0">
          <div className="flex gap-1">
            <Button
              variant={activeMediaType === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveMediaType('all')}
            >
              Todos
            </Button>
            {(['image', 'video', 'audio', 'document'] as MediaType[]).map(mt => {
              const config = mediaTypeConfig[mt];
              const Icon = config.icon;
              return (
                <Button
                  key={mt}
                  variant={activeMediaType === mt ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveMediaType(mt)}
                  className="gap-1"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {config.label}
                </Button>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant={showArchived ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
              className="gap-1"
            >
              <Archive className="w-3.5 h-3.5" />
              Arquivados
            </Button>
          </div>
        </div>

        {/* Selection Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg shrink-0">
            <Button variant="ghost" size="sm" onClick={selectAll} className="gap-1">
              {selectedIds.size === filteredMedia.length ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {selectedIds.size} selecionado(s)
            </Button>
            <div className="flex-1" />
            {showArchived ? (
              <Button variant="outline" size="sm" onClick={handleRestore} className="gap-1">
                <RotateCcw className="w-4 h-4" />
                Restaurar
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleArchive} className="gap-1">
                <Archive className="w-4 h-4" />
                Arquivar
              </Button>
            )}
            <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-1">
              <Trash2 className="w-4 h-4" />
              Deletar
            </Button>
          </div>
        )}

        {/* Media Grid */}
        <ScrollArea className="flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ImageIcon className="w-12 h-12 mb-2 opacity-40" />
              <p>Nenhuma mídia encontrada</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 p-1">
              {filteredMedia.map(item => (
                <div
                  key={item.id}
                  className={cn(
                    "relative aspect-square rounded-lg overflow-hidden cursor-pointer group",
                    "border-2 transition-all",
                    selectedIds.has(item.id) 
                      ? "border-primary ring-2 ring-primary/30" 
                      : "border-transparent hover:border-muted-foreground/30"
                  )}
                  onClick={() => setPreviewMedia(item)}
                >
                  {renderMediaThumbnail(item)}
                  
                  {/* Selection checkbox */}
                  <div 
                    className="absolute top-1 left-1 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(item.id);
                    }}
                  >
                    <Checkbox 
                      checked={selectedIds.has(item.id)} 
                      className="bg-background/80 backdrop-blur-sm"
                    />
                  </div>

                  {/* From me badge */}
                  {item.from_me && (
                    <Badge 
                      variant="secondary" 
                      className="absolute top-1 right-1 text-[10px] px-1 py-0"
                    >
                      Enviado
                    </Badge>
                  )}

                  {/* Overlay with info */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] text-white truncate">
                      {item.contact_name || item.contact_number || 'Desconhecido'}
                    </p>
                    <p className="text-[9px] text-white/70">
                      {format(new Date(item.media_timestamp), 'dd/MM/yy HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Preview Modal */}
        {previewMedia && (
          <Dialog open={!!previewMedia} onOpenChange={() => setPreviewMedia(null)}>
            <DialogContent className="max-w-3xl p-0 bg-black/95 border-none">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 text-white hover:bg-white/20 z-50"
                onClick={() => setPreviewMedia(null)}
              >
                <X className="w-5 h-5" />
              </Button>
              
              <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
                {previewMedia.media_type === 'image' && (
                  <img
                    src={previewMedia.media_preview || previewMedia.media_url || ''}
                    alt={previewMedia.caption || 'Imagem'}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                )}
                {previewMedia.media_type === 'video' && previewMedia.media_url && (
                  <video
                    src={previewMedia.media_url}
                    controls
                    className="max-w-full max-h-[70vh] rounded-lg"
                  />
                )}
                {previewMedia.media_type === 'audio' && previewMedia.media_url && (
                  <audio src={previewMedia.media_url} controls className="w-full max-w-md" />
                )}
                
                {previewMedia.caption && (
                  <p className="mt-4 text-white/90 text-center max-w-md">
                    {previewMedia.caption}
                  </p>
                )}
                
                <div className="mt-4 flex gap-2">
                  {previewMedia.media_url && (
                    <Button variant="secondary" size="sm" asChild>
                      <a href={previewMedia.media_url} target="_blank" rel="noopener noreferrer" download>
                        <Download className="w-4 h-4 mr-1" />
                        Baixar
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
