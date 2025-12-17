import { useState, useRef } from "react";
import { Camera, Loader2, X, Upload, User, Briefcase, BadgeCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const DEPARTMENT_LABELS: Record<string, string> = {
  comercial: "Comercial",
  atendimento: "Atendimento",
  marketing: "Marketing",
  administrativo: "Administrativo",
  clinico: "Clínico",
};

const POSITION_LABELS: Record<string, string> = {
  comercial_1_captacao: "Comercial 1 - Captação",
  comercial_2_closer: "Comercial 2 - Closer",
  comercial_3_experiencia: "Comercial 3 - Experiência",
  comercial_4_farmer: "Comercial 4 - Farmer",
  sdr: "SDR",
  coordenador: "Coordenador",
  gerente: "Gerente",
  assistente: "Assistente",
  outro: "Outro",
};

interface ProfileEditDialogProps {
  children: React.ReactNode;
}

const ProfileEditDialog = ({ children }: ProfileEditDialogProps) => {
  const { user, profile, updateProfile, refreshProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma imagem.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 2MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target?.result as string);
      reader.readAsDataURL(file);

      // Upload to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      // Add cache buster
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;

      // Update profile
      const { error: updateError } = await updateProfile({ avatar_url: avatarUrl });

      if (updateError) throw updateError;

      toast({
        title: "Sucesso!",
        description: "Foto de perfil atualizada.",
      });
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Erro ao enviar foto",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast({
        title: "Erro",
        description: "O nome não pode estar vazio.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await updateProfile({ full_name: fullName.trim() });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Perfil atualizado.",
      });

      setIsOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setFullName(profile?.full_name || "");
      setPreviewUrl(null);
    }
  };

  const currentAvatarUrl = previewUrl || profile?.avatar_url;
  const initials = (profile?.full_name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Editar Perfil</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <Avatar className="w-24 h-24 border-4 border-primary/30">
                <AvatarImage src={currentAvatarUrl || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {isUploading ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="gap-2"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Alterar foto
            </Button>
          </div>

          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-foreground">
              Nome completo
            </Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome"
              className="bg-background border-border"
            />
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Email</Label>
            <Input
              value={user?.email || ""}
              disabled
              className="bg-muted border-border text-muted-foreground"
            />
          </div>

          {/* Department & Position (read-only) */}
          {(profile?.department || profile?.position) && (
            <div className="space-y-3 pt-2 border-t border-border">
              <Label className="text-muted-foreground flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Informações Profissionais
              </Label>
              <div className="flex flex-wrap gap-2">
                {profile?.department && (
                  <Badge variant="outline" className="gap-1.5 py-1.5">
                    <Briefcase className="w-3 h-3" />
                    {DEPARTMENT_LABELS[profile.department] || profile.department}
                  </Badge>
                )}
                {profile?.position && (
                  <Badge variant="secondary" className="gap-1.5 py-1.5">
                    <BadgeCheck className="w-3 h-3" />
                    {POSITION_LABELS[profile.position] || profile.position}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileEditDialog;
