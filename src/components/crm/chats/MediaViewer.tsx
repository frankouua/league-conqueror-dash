import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  ZoomIn, 
  ZoomOut,
  RotateCw,
  Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MediaViewerItem {
  id: string;
  type: 'image' | 'video' | 'audio' | 'document';
  src: string;
  preview?: string | null;
  caption?: string | null;
  timestamp?: string | null;
  fromMe?: boolean;
  contactName?: string | null;
}

interface MediaViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media: MediaViewerItem | null;
  allMedia?: MediaViewerItem[];
  onNavigate?: (direction: 'prev' | 'next') => void;
}

export function MediaViewer({ 
  open, 
  onOpenChange, 
  media, 
  allMedia = [],
  onNavigate 
}: MediaViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!media) return null;

  const currentIndex = allMedia.findIndex(m => m.id === media.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allMedia.length - 1 && currentIndex >= 0;

  const imageSrc = media.preview || media.src;

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.5, 4));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.5, 0.5));
  const handleRotate = () => setRotation(r => (r + 90) % 360);
  
  const handleOpenInNewTab = () => {
    window.open(imageSrc, '_blank');
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `imagem-${media.id || Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback se fetch falhar (CORS)
      const link = document.createElement('a');
      link.href = imageSrc;
      link.download = `imagem-${media.id || Date.now()}.jpg`;
      link.target = '_blank';
      link.click();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' && hasPrev && onNavigate) {
      onNavigate('prev');
    } else if (e.key === 'ArrowRight' && hasNext && onNavigate) {
      onNavigate('next');
    } else if (e.key === 'Escape') {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95 border-none flex flex-col [&>button]:hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-3">
            {media.contactName && (
              <span className="text-white/90 text-sm font-medium">
                {media.contactName}
              </span>
            )}
            {media.timestamp && (
              <span className="text-white/60 text-xs">
                {format(new Date(media.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            )}
            {media.fromMe && (
              <Badge variant="secondary" className="text-[10px]">Enviado</Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {media.type === 'image' && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/80 hover:text-white hover:bg-white/10"
                  onClick={handleZoomOut}
                  title="Diminuir zoom"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/80 hover:text-white hover:bg-white/10"
                  onClick={handleZoomIn}
                  title="Aumentar zoom"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/80 hover:text-white hover:bg-white/10"
                  onClick={handleRotate}
                  title="Girar"
                >
                  <RotateCw className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/80 hover:text-white hover:bg-white/10"
                  onClick={handleOpenInNewTab}
                  title="Abrir em nova guia"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
                <div className="w-px h-6 bg-white/20 mx-1" />
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-white/80 hover:text-white hover:bg-white/10"
              onClick={handleDownload}
              title="Baixar imagem"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => onOpenChange(false)}
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Navigation Arrows */}
        {allMedia.length > 1 && onNavigate && (
          <>
            {hasPrev && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-black/50 text-white hover:bg-black/70"
                onClick={() => onNavigate('prev')}
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
            )}
            {hasNext && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-black/50 text-white hover:bg-black/70"
                onClick={() => onNavigate('next')}
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            )}
          </>
        )}

        {/* Media Content */}
        <div className="flex-1 flex items-center justify-center overflow-hidden p-4">
          {media.type === 'image' && (
            <img
              src={imageSrc}
              alt={media.caption || 'Imagem'}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
              }}
              referrerPolicy="no-referrer"
              draggable={false}
            />
          )}
          
          {media.type === 'video' && (
            <video
              src={media.src}
              controls
              autoPlay
              className="max-w-full max-h-full rounded-lg"
            >
              Seu navegador não suporta vídeos
            </video>
          )}
          
          {media.type === 'audio' && (
            <div className="bg-white/10 rounded-xl p-8 flex flex-col items-center gap-4">
              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-4xl">🎵</span>
              </div>
              <audio src={media.src} controls autoPlay className="w-80" />
            </div>
          )}
        </div>

        {/* Caption */}
        {media.caption && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-white/90 text-center max-w-2xl mx-auto">
              {media.caption}
            </p>
          </div>
        )}

        {/* Counter */}
        {allMedia.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 px-3 py-1 rounded-full bg-black/60 text-white/80 text-sm">
            {currentIndex + 1} / {allMedia.length}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}