import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BookOpen, FileText, Video, Link as LinkIcon, Download,
  Search, Filter, Clock, Zap, CheckCircle2, ExternalLink
} from "lucide-react";
import { useTrainingAcademy, TrainingMaterial } from "@/hooks/useTrainingAcademy";

const CATEGORY_LABELS: Record<string, string> = {
  metodo_cpi: "Método CPI",
  objecoes: "Objeções",
  scripts: "Scripts",
  processos: "Processos",
  produtos: "Produtos",
  outros: "Outros",
};

const CATEGORY_COLORS: Record<string, string> = {
  metodo_cpi: "bg-purple-500/10 text-purple-500 border-purple-500/30",
  objecoes: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  scripts: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  processos: "bg-green-500/10 text-green-500 border-green-500/30",
  produtos: "bg-pink-500/10 text-pink-500 border-pink-500/30",
  outros: "bg-gray-500/10 text-gray-500 border-gray-500/30",
};

const TYPE_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  video: Video,
  ebook: BookOpen,
  apostila: BookOpen,
  link: LinkIcon,
};

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  beginner: { label: "Iniciante", color: "bg-green-500/10 text-green-600" },
  intermediate: { label: "Intermediário", color: "bg-yellow-500/10 text-yellow-600" },
  advanced: { label: "Avançado", color: "bg-red-500/10 text-red-600" },
};

const TrainingLibrary = () => {
  const { materials, completeMaterial, isMaterialCompleted, isLoading } = useTrainingAcademy();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedMaterial, setSelectedMaterial] = useState<TrainingMaterial | null>(null);

  // Filter materials
  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || m.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const groupedMaterials = filteredMaterials.reduce((acc, material) => {
    const category = material.category || "outros";
    if (!acc[category]) acc[category] = [];
    acc[category].push(material);
    return acc;
  }, {} as Record<string, TrainingMaterial[]>);

  const handleOpenMaterial = (material: TrainingMaterial) => {
    setSelectedMaterial(material);
  };

  const handleCompleteMaterial = () => {
    if (selectedMaterial && !isMaterialCompleted(selectedMaterial.id)) {
      completeMaterial({ 
        materialId: selectedMaterial.id, 
        xpReward: selectedMaterial.xp_reward 
      });
    }
  };

  const handleAccessMaterial = () => {
    if (selectedMaterial) {
      const url = selectedMaterial.external_url || selectedMaterial.file_url;
      if (url) {
        window.open(url, '_blank');
        // Mark as completed after accessing
        if (!isMaterialCompleted(selectedMaterial.id)) {
          completeMaterial({ 
            materialId: selectedMaterial.id, 
            xpReward: selectedMaterial.xp_reward 
          });
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar materiais..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Materials Grid */}
      {Object.keys(groupedMaterials).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Nenhum material encontrado</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedMaterials).map(([category, categoryMaterials]) => (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={CATEGORY_COLORS[category]}>
                {CATEGORY_LABELS[category] || category}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {categoryMaterials.length} material{categoryMaterials.length > 1 ? 'is' : ''}
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryMaterials.map((material) => {
                const Icon = TYPE_ICONS[material.material_type] || FileText;
                const completed = isMaterialCompleted(material.id);
                const difficulty = DIFFICULTY_LABELS[material.difficulty_level] || DIFFICULTY_LABELS.beginner;
                
                return (
                  <Card 
                    key={material.id}
                    className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/30 ${
                      completed ? 'border-green-500/30 bg-green-500/5' : ''
                    }`}
                    onClick={() => handleOpenMaterial(material)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          completed ? 'bg-green-500/20' : 'bg-primary/10'
                        }`}>
                          {completed ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <Icon className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{material.title}</h3>
                          {material.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {material.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="secondary" className={difficulty.color}>
                              {difficulty.label}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Zap className="w-3 h-3 text-amber-500" />
                              <span>{material.xp_reward} XP</span>
                            </div>
                            {material.duration_minutes && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>{material.duration_minutes}min</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Material Detail Dialog */}
      <Dialog open={!!selectedMaterial} onOpenChange={() => setSelectedMaterial(null)}>
        <DialogContent className="max-w-lg">
          {selectedMaterial && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={CATEGORY_COLORS[selectedMaterial.category]}>
                    {CATEGORY_LABELS[selectedMaterial.category] || selectedMaterial.category}
                  </Badge>
                  {isMaterialCompleted(selectedMaterial.id) && (
                    <Badge className="bg-green-500">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Concluído
                    </Badge>
                  )}
                </div>
                <DialogTitle>{selectedMaterial.title}</DialogTitle>
                <DialogDescription>
                  {selectedMaterial.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="font-medium">{selectedMaterial.xp_reward} XP</span>
                  </div>
                  {selectedMaterial.duration_minutes && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{selectedMaterial.duration_minutes} minutos</span>
                    </div>
                  )}
                  <Badge variant="secondary" className={DIFFICULTY_LABELS[selectedMaterial.difficulty_level]?.color}>
                    {DIFFICULTY_LABELS[selectedMaterial.difficulty_level]?.label || "Iniciante"}
                  </Badge>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setSelectedMaterial(null)}>
                  Fechar
                </Button>
                {(selectedMaterial.external_url || selectedMaterial.file_url) && (
                  <Button onClick={handleAccessMaterial} className="gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Acessar Material
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrainingLibrary;
