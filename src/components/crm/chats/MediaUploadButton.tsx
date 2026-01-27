import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { 
  Paperclip, 
  Image as ImageIcon, 
  Video, 
  FileText, 
  MapPin, 
  User,
  X,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export type MediaType = 'image' | 'video' | 'document' | 'location' | 'contact';

export interface MediaFile {
  type: MediaType;
  file?: File;
  preview?: string;
  caption?: string;
  // Location specific
  latitude?: number;
  longitude?: number;
  locationName?: string;
  locationAddress?: string;
  // Contact specific
  contactName?: string;
  contactPhone?: string;
}

interface MediaUploadButtonProps {
  disabled?: boolean;
  onMediaSelect: (media: MediaFile) => void;
  className?: string;
}

const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB

export function MediaUploadButton({ disabled, onMediaSelect, className }: MediaUploadButtonProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Location state
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  
  // Contact state
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((type: MediaType, file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande. Máximo 16MB.');
      return;
    }

    const preview = type === 'image' || type === 'video' 
      ? URL.createObjectURL(file) 
      : undefined;
    
    setSelectedMedia({
      type,
      file,
      preview
    });
    setCaption('');
    setPreviewDialogOpen(true);
    setPopoverOpen(false);
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect('image', file);
    e.target.value = '';
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect('video', file);
    e.target.value = '';
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect('document', file);
    e.target.value = '';
  };

  const handleLocationSubmit = () => {
    if (!latitude || !longitude) {
      toast.error('Latitude e longitude são obrigatórias');
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Coordenadas inválidas');
      return;
    }

    onMediaSelect({
      type: 'location',
      latitude: lat,
      longitude: lng,
      locationName: locationName || undefined,
      locationAddress: locationAddress || undefined
    });

    setLocationDialogOpen(false);
    resetLocationForm();
    toast.success('Localização adicionada');
  };

  const handleContactSubmit = () => {
    if (!contactName || !contactPhone) {
      toast.error('Nome e telefone são obrigatórios');
      return;
    }

    onMediaSelect({
      type: 'contact',
      contactName,
      contactPhone: contactPhone.replace(/\D/g, '')
    });

    setContactDialogOpen(false);
    resetContactForm();
    toast.success('Contato adicionado');
  };

  const handleMediaConfirm = () => {
    if (!selectedMedia) return;
    
    onMediaSelect({
      ...selectedMedia,
      caption: caption || undefined
    });

    setPreviewDialogOpen(false);
    setSelectedMedia(null);
    setCaption('');
  };

  const resetLocationForm = () => {
    setLocationName('');
    setLocationAddress('');
    setLatitude('');
    setLongitude('');
  };

  const resetContactForm = () => {
    setContactName('');
    setContactPhone('');
  };

  const getCurrentLocation = () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toString());
          setLongitude(position.coords.longitude.toString());
          setLoading(false);
          toast.success('Localização obtida');
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast.error('Não foi possível obter a localização');
          setLoading(false);
        }
      );
    } else {
      toast.error('Geolocalização não suportada');
      setLoading(false);
    }
  };

  return (
    <>
      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageChange}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleVideoChange}
      />
      <input
        ref={documentInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
        className="hidden"
        onChange={handleDocumentChange}
      />

      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("h-9 w-9 shrink-0", className)}
            disabled={disabled}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1.5" side="top" align="start">
          <div className="grid gap-0.5">
            <button
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors w-full text-left"
              onClick={() => imageInputRef.current?.click()}
            >
              <ImageIcon className="w-4 h-4 text-blue-500" />
              <span>Imagem</span>
            </button>
            <button
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors w-full text-left"
              onClick={() => videoInputRef.current?.click()}
            >
              <Video className="w-4 h-4 text-purple-500" />
              <span>Vídeo</span>
            </button>
            <button
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors w-full text-left"
              onClick={() => documentInputRef.current?.click()}
            >
              <FileText className="w-4 h-4 text-orange-500" />
              <span>Documento</span>
            </button>
            <button
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors w-full text-left"
              onClick={() => {
                setPopoverOpen(false);
                setLocationDialogOpen(true);
              }}
            >
              <MapPin className="w-4 h-4 text-green-500" />
              <span>Localização</span>
            </button>
            <button
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors w-full text-left"
              onClick={() => {
                setPopoverOpen(false);
                setContactDialogOpen(true);
              }}
            >
              <User className="w-4 h-4 text-cyan-500" />
              <span>Contato</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Media Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedMedia?.type === 'image' && '📷 Enviar Imagem'}
              {selectedMedia?.type === 'video' && '🎬 Enviar Vídeo'}
              {selectedMedia?.type === 'document' && '📄 Enviar Documento'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedMedia?.type === 'image' && selectedMedia.preview && (
              <img 
                src={selectedMedia.preview} 
                alt="Preview" 
                className="w-full max-h-64 object-contain rounded-lg bg-muted"
              />
            )}
            {selectedMedia?.type === 'video' && selectedMedia.preview && (
              <video 
                src={selectedMedia.preview} 
                controls 
                className="w-full max-h-64 rounded-lg bg-muted"
              />
            )}
            {selectedMedia?.type === 'document' && selectedMedia.file && (
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <FileText className="w-10 h-10 text-orange-500" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedMedia.file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedMedia.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Legenda (opcional)</Label>
              <Textarea
                placeholder="Digite uma legenda..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleMediaConfirm}>
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Location Dialog */}
      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>📍 Enviar Localização</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={getCurrentLocation}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <MapPin className="w-4 h-4 mr-2" />
              )}
              Usar minha localização atual
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Latitude *</Label>
                <Input
                  placeholder="-23.5505"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude *</Label>
                <Input
                  placeholder="-46.6333"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome do local (opcional)</Label>
              <Input
                placeholder="Ex: Escritório Central"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Endereço (opcional)</Label>
              <Input
                placeholder="Ex: Av. Paulista, 1000"
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLocationDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleLocationSubmit}>
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>👤 Enviar Contato</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do contato *</Label>
              <Input
                placeholder="Ex: João Silva"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Telefone *</Label>
              <Input
                placeholder="Ex: 5511999999999"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setContactDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleContactSubmit}>
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
