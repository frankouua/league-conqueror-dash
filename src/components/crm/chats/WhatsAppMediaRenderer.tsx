import { useState } from 'react';
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
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

interface WhatsAppMediaRendererProps {
  messageType: string | null;
  content: string | null;
  mediaUrl: string | null;
  fromMe: boolean;
}

export function WhatsAppMediaRenderer({ 
  messageType, 
  content, 
  mediaUrl, 
  fromMe 
}: WhatsAppMediaRendererProps) {
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Text messages
  if (!messageType || messageType === 'text' || messageType === 'conversation' || messageType === 'extendedTextMessage') {
    return (
      <p className="text-sm break-words whitespace-pre-wrap">
        {content || ''}
      </p>
    );
  }

  // Image messages
  if (messageType === 'image' || messageType === 'imageMessage') {
    if (mediaUrl && !imageError) {
      return (
        <Dialog>
          <DialogTrigger asChild>
            <div className="cursor-pointer">
              <img
                src={mediaUrl}
                alt="Imagem"
                className="max-w-[280px] max-h-[300px] rounded-lg object-cover hover:opacity-90 transition-opacity"
                onError={() => setImageError(true)}
              />
              {content && (
                <p className="text-sm mt-2 break-words whitespace-pre-wrap">
                  {content}
                </p>
              )}
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-4xl p-0 bg-transparent border-none">
            <img
              src={mediaUrl}
              alt="Imagem ampliada"
              className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
            />
          </DialogContent>
        </Dialog>
      );
    }
    
    return (
      <div className="flex items-center gap-2 py-2">
        <div className={cn(
          "p-3 rounded-lg",
          fromMe ? "bg-primary-foreground/20" : "bg-muted-foreground/10"
        )}>
          <ImageIcon className="w-8 h-8 opacity-60" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">📷 Imagem</p>
          {content && <p className="text-xs opacity-70 truncate max-w-[180px]">{content}</p>}
        </div>
      </div>
    );
  }

  // Video messages
  if (messageType === 'video' || messageType === 'videoMessage') {
    if (mediaUrl && !videoError) {
      return (
        <div className="space-y-2">
          <div className="relative max-w-[280px] rounded-lg overflow-hidden bg-black/20">
            <video
              src={mediaUrl}
              controls
              className="max-w-full max-h-[300px]"
              onError={() => setVideoError(true)}
            >
              Seu navegador não suporta vídeos
            </video>
          </div>
          {content && (
            <p className="text-sm break-words whitespace-pre-wrap">
              {content}
            </p>
          )}
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2 py-2">
        <div className={cn(
          "p-3 rounded-lg relative",
          fromMe ? "bg-primary-foreground/20" : "bg-muted-foreground/10"
        )}>
          <Video className="w-8 h-8 opacity-60" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Play className="w-4 h-4" />
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">🎬 Vídeo</p>
          {content && <p className="text-xs opacity-70 truncate max-w-[180px]">{content}</p>}
        </div>
      </div>
    );
  }

  // Audio/Voice messages
  if (messageType === 'audio' || messageType === 'audioMessage' || messageType === 'ptt') {
    if (mediaUrl) {
      return (
        <div className="flex items-center gap-2 py-1 min-w-[200px]">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
            fromMe ? "bg-primary-foreground/20" : "bg-muted-foreground/10"
          )}>
            <Mic className="w-5 h-5" />
          </div>
          <audio controls className="h-8 max-w-[200px]">
            <source src={mediaUrl} type="audio/ogg" />
            <source src={mediaUrl} type="audio/mpeg" />
            Áudio não suportado
          </audio>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2 py-2">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center",
          fromMe ? "bg-primary-foreground/20" : "bg-muted-foreground/10"
        )}>
          <Mic className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">🎤 Áudio</p>
          <p className="text-xs opacity-70">Mensagem de voz</p>
        </div>
      </div>
    );
  }

  // Document messages
  if (messageType === 'document' || messageType === 'documentMessage' || messageType === 'documentWithCaptionMessage') {
    const fileName = content || 'Documento';
    
    return (
      <div className="flex items-center gap-3 py-2 min-w-[200px]">
        <div className={cn(
          "p-3 rounded-lg",
          fromMe ? "bg-primary-foreground/20" : "bg-muted-foreground/10"
        )}>
          <FileText className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileName}</p>
          <p className="text-xs opacity-70">Documento</p>
        </div>
        {mediaUrl && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            asChild
          >
            <a href={mediaUrl} target="_blank" rel="noopener noreferrer" download>
              <Download className="w-4 h-4" />
            </a>
          </Button>
        )}
      </div>
    );
  }

  // Sticker messages
  if (messageType === 'sticker' || messageType === 'stickerMessage') {
    if (mediaUrl) {
      return (
        <img
          src={mediaUrl}
          alt="Sticker"
          className="w-32 h-32 object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }
    
    return (
      <div className="flex items-center gap-2 py-2">
        <Sticker className="w-8 h-8 opacity-60" />
        <span className="text-sm">Sticker</span>
      </div>
    );
  }

  // Location messages
  if (messageType === 'location' || messageType === 'locationMessage' || messageType === 'liveLocationMessage') {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className={cn(
          "p-3 rounded-lg",
          fromMe ? "bg-primary-foreground/20" : "bg-muted-foreground/10"
        )}>
          <MapPin className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">📍 Localização</p>
          {content && <p className="text-xs opacity-70 truncate max-w-[180px]">{content}</p>}
        </div>
        {mediaUrl && (
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <a href={mediaUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
        )}
      </div>
    );
  }

  // Contact/vCard messages
  if (messageType === 'contact' || messageType === 'contactMessage' || messageType === 'contactsArrayMessage') {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className={cn(
          "p-3 rounded-lg",
          fromMe ? "bg-primary-foreground/20" : "bg-muted-foreground/10"
        )}>
          <User className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">👤 Contato</p>
          {content && <p className="text-xs opacity-70 truncate max-w-[180px]">{content}</p>}
        </div>
      </div>
    );
  }

  // Reaction messages
  if (messageType === 'reaction' || messageType === 'reactionMessage') {
    return (
      <div className="text-2xl py-1">
        {content || '👍'}
      </div>
    );
  }

  // Poll messages
  if (messageType === 'poll' || messageType === 'pollCreationMessage') {
    return (
      <div className="py-2">
        <p className="text-sm font-medium mb-1">📊 Enquete</p>
        {content && <p className="text-sm opacity-90">{content}</p>}
      </div>
    );
  }

  // Protocol/system messages
  if (messageType === 'protocol' || messageType === 'protocolMessage') {
    return (
      <p className="text-xs italic opacity-70">
        Mensagem do sistema
      </p>
    );
  }

  // Button/Interactive messages
  if (messageType === 'buttons' || messageType === 'buttonsMessage' || messageType === 'templateMessage' || messageType === 'listMessage') {
    return (
      <div className="py-2">
        {content && <p className="text-sm break-words whitespace-pre-wrap">{content}</p>}
        <p className="text-xs opacity-70 mt-1">📱 Mensagem interativa</p>
      </div>
    );
  }

  // Default fallback for unknown types
  return (
    <div className="flex items-center gap-2 py-2">
      <File className="w-5 h-5 opacity-60" />
      <div className="flex-1">
        {content ? (
          <p className="text-sm break-words whitespace-pre-wrap">{content}</p>
        ) : (
          <p className="text-sm opacity-70">
            {messageType ? `[${messageType}]` : '[Mídia]'}
          </p>
        )}
      </div>
    </div>
  );
}
