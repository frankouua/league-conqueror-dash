import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Link as LinkIcon, 
  Video, 
  Image, 
  FileCode, 
  Plus, 
  Trash2, 
  ExternalLink,
  GripVertical 
} from "lucide-react";

interface Material {
  id: string;
  campaign_id: string;
  title: string;
  material_type: string;
  url: string | null;
  content: string | null;
  order_index: number;
}

interface CampaignMaterialsProps {
  campaignId: string;
  campaignName: string;
}

const MATERIAL_TYPES = [
  { value: "link", label: "Link", icon: LinkIcon, color: "text-blue-500" },
  { value: "pdf", label: "PDF", icon: FileText, color: "text-red-500" },
  { value: "script", label: "Script", icon: FileCode, color: "text-emerald-500" },
  { value: "image", label: "Imagem", icon: Image, color: "text-purple-500" },
  { value: "video", label: "Vídeo", icon: Video, color: "text-amber-500" },
];

const CampaignMaterials = ({ campaignId, campaignName }: CampaignMaterialsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    material_type: "link",
    url: "",
    content: "",
  });

  // Fetch materials
  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["campaign-materials", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_materials")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as Material[];
    },
    enabled: !!campaignId,
  });

  // Create material
  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("campaign_materials").insert({
        campaign_id: campaignId,
        title: formData.title,
        material_type: formData.material_type,
        url: formData.url || null,
        content: formData.content || null,
        order_index: materials.length,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Material adicionado!" });
      queryClient.invalidateQueries({ queryKey: ["campaign-materials", campaignId] });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Erro ao adicionar material", description: error.message, variant: "destructive" });
    },
  });

  // Delete material
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaign_materials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Material excluído!" });
      queryClient.invalidateQueries({ queryKey: ["campaign-materials", campaignId] });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      material_type: "link",
      url: "",
      content: "",
    });
  };

  const getTypeInfo = (type: string) => {
    return MATERIAL_TYPES.find(t => t.value === type) || MATERIAL_TYPES[0];
  };

  const handleOpen = (material: Material) => {
    if (material.url) {
      window.open(material.url, "_blank");
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Materiais da Campanha
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1">
                <Plus className="w-3 h-3" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Adicionar Material</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Script de Vendas"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Material</Label>
                  <Select
                    value={formData.material_type}
                    onValueChange={(v) => setFormData({ ...formData, material_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MATERIAL_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className={`w-4 h-4 ${type.color}`} />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.material_type !== "script" ? (
                  <div className="space-y-2">
                    <Label>URL</Label>
                    <Input
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Conteúdo do Script</Label>
                    <Textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Digite o script aqui..."
                      rows={6}
                    />
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => createMutation.mutate()}
                    disabled={!formData.title || createMutation.isPending}
                  >
                    {createMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : materials.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum material adicionado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {materials.map((material) => {
              const typeInfo = getTypeInfo(material.material_type);
              return (
                <div
                  key={material.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground/50 cursor-grab" />
                  <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center`}>
                    <typeInfo.icon className={`w-4 h-4 ${typeInfo.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{material.title}</p>
                    <Badge variant="outline" className="text-[10px]">{typeInfo.label}</Badge>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {material.url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpen(material)}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(material.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CampaignMaterials;
