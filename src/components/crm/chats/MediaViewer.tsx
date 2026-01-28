import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
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
  RotateCcw,
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
  const [authedBlobSrc, setAuthedBlobSrc] = useState<string | null>(null);

  // Reset zoom and rotation when switching to a different image
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setAuthedBlobSrc(null);
  }, [media?.id]);

  // Hi-res sempre tem prioridade. Preview é apenas fallback.
  // Se a src vier do proxy, fazemos fetch e exibimos via blob (mais confiável que <img src=proxyUrl>).
  const imageSrc = authedBlobSrc || media?.src || media?.preview || '';

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function run() {
      if (!media || media.type !== 'image') return;
      const src = media.src;
      if (!src) return;
      if (!src.toLowerCase().includes('/functions/v1/media-proxy')) return;

      try {
        const resp = await fetch(src);
        if (!resp.ok) throw new Error(`media-proxy http ${resp.status}`);
        const blob = await resp.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setAuthedBlobSrc(objectUrl);
      } catch {
        if (!cancelled) setAuthedBlobSrc(null);
      }
    }

    run();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [media]);

  if (!media) return null;

  const currentIndex = allMedia.findIndex(m => m.id === media.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allMedia.length - 1 && currentIndex >= 0;


  const handleZoomIn = () => setZoom(z => Math.min(z + 0.5, 4));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.5, 0.5));
  const handleRotateClockwise = () => setRotation(r => r + 90);
  const handleRotateCounterClockwise = () => setRotation(r => r - 90);
  
  const handleOpenInNewTab = () => {
    // Para Base64 ou URLs, criar uma página HTML temporária com a imagem
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Imagem</title>
            <style>
              body {
                margin: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background: #0a0a0a;
              }
              img {
                max-width: 100%;
                max-height: 100vh;
                object-fit: contain;
              }
            </style>
          </head>
          <body>
            <img src="${imageSrc}" alt="Imagem" />
          </body>
        </html>
      `);
      newWindow.document.close();
    }
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
          className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95 border-none flex flex-col [&>button[data-dialog-close]]:hidden"
        onKeyDown={handleKeyDown}
        aria-describedby={undefined}
      >
        <VisuallyHidden>
          <DialogTitle>Visualizador de mídia</DialogTitle>
        </VisuallyHidden>
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
                  onClick={handleRotateCounterClockwise}
                  title="Girar anti-horário"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/80 hover:text-white hover:bg-white/10"
                  onClick={handleRotateClockwise}
                  title="Girar horário"
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

        {/* Navigation Arrows - Always visible like WhatsApp */}
        {onNavigate && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm text-white border border-white/20 hover:bg-white/30 hover:scale-110 hover:border-white/40 transition-all duration-200 shadow-lg",
                !hasPrev && "opacity-30 cursor-not-allowed hover:scale-100 hover:bg-white/15"
              )}
              onClick={() => hasPrev && onNavigate('prev')}
              disabled={!hasPrev}
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm text-white border border-white/20 hover:bg-white/30 hover:scale-110 hover:border-white/40 transition-all duration-200 shadow-lg",
                !hasNext && "opacity-30 cursor-not-allowed hover:scale-100 hover:bg-white/15"
              )}
              onClick={() => hasNext && onNavigate('next')}
              disabled={!hasNext}
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
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

        {/* Caption - filter out placeholder texts */}
        {media.caption && 
         !media.caption.toLowerCase().match(/^\[?image\]?$/) && 
         !media.caption.toLowerCase().match(/^\[?imagem\]?$/) && 
         !media.caption.toLowerCase().includes('📷 imagem') && (
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