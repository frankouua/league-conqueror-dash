import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  BookOpen, Clock, Zap, CheckCircle2, ChevronLeft, ChevronRight,
  ExternalLink, FileText
} from "lucide-react";
import { TrainingMaterial, useTrainingAcademy } from "@/hooks/useTrainingAcademy";
import { supabase } from "@/integrations/supabase/client";

interface TrainingMaterialViewerProps {
  materialId: string | null;
  onClose: () => void;
  onComplete?: () => void;
}

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  iniciante: { label: "Iniciante", color: "bg-green-500/10 text-green-600" },
  intermediario: { label: "Intermediário", color: "bg-yellow-500/10 text-yellow-600" },
  avancado: { label: "Avançado", color: "bg-red-500/10 text-red-600" },
  beginner: { label: "Iniciante", color: "bg-green-500/10 text-green-600" },
  intermediate: { label: "Intermediário", color: "bg-yellow-500/10 text-yellow-600" },
  advanced: { label: "Avançado", color: "bg-red-500/10 text-red-600" },
};

const TrainingMaterialViewer = ({ materialId, onClose, onComplete }: TrainingMaterialViewerProps) => {
  const { completeMaterial, isMaterialCompleted } = useTrainingAcademy();
  const [material, setMaterial] = useState<(TrainingMaterial & { content?: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    if (materialId) {
      loadMaterial(materialId);
    }
  }, [materialId]);

  const loadMaterial = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("training_materials")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      setMaterial(data as TrainingMaterial & { content?: string });
    } catch (error) {
      console.error("Error loading material:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const scrollPercent = (target.scrollTop / (target.scrollHeight - target.clientHeight)) * 100;
    setScrollProgress(Math.min(100, scrollPercent));
  };

  const handleComplete = async () => {
    if (material && !isMaterialCompleted(material.id)) {
      await completeMaterial({ 
        materialId: material.id, 
        xpReward: material.xp_reward 
      });
      onComplete?.();
    }
    onClose();
  };

  const renderMarkdown = (content: string) => {
    // Normalize line endings and split
    const lines = content.replace(/\\n/g, '\n').split('\n');
    const elements: React.ReactNode[] = [];
    let inTable = false;
    let tableRows: string[][] = [];
    
    const processInlineFormatting = (text: string): React.ReactNode => {
      // Handle bold text **text**
      if (text.includes('**')) {
        const parts = text.split(/\*\*(.*?)\*\*/g);
        return parts.map((part, i) => 
          i % 2 === 1 ? <strong key={i} className="font-semibold text-foreground">{part}</strong> : part
        );
      }
      // Handle italic text *text*
      if (text.includes('*') && !text.includes('**')) {
        const parts = text.split(/\*(.*?)\*/g);
        return parts.map((part, i) => 
          i % 2 === 1 ? <em key={i}>{part}</em> : part
        );
      }
      return text;
    };

    const flushTable = () => {
      if (tableRows.length > 0) {
        elements.push(
          <div key={`table-${elements.length}`} className="my-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <tbody>
                {tableRows.map((row, rowIdx) => (
                  <tr key={rowIdx} className={rowIdx === 0 ? 'bg-muted/50 font-medium' : 'border-t border-border'}>
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="py-2 px-3">{processInlineFormatting(cell.trim())}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
      }
      inTable = false;
    };
    
    lines.forEach((line, idx) => {
      // Table rows
      if (line.startsWith('|')) {
        if (line.includes('---') || line.includes(':-')) {
          return; // Skip separator
        }
        inTable = true;
        const cells = line.split('|').filter(c => c.trim());
        tableRows.push(cells);
        return;
      } else if (inTable) {
        flushTable();
      }
      
      // Headers
      if (line.startsWith('# ')) {
        elements.push(<h1 key={idx} className="text-2xl font-bold mt-6 mb-4 text-foreground">{processInlineFormatting(line.slice(2))}</h1>);
        return;
      }
      if (line.startsWith('## ')) {
        elements.push(<h2 key={idx} className="text-xl font-semibold mt-5 mb-3 text-foreground border-b border-border pb-2">{processInlineFormatting(line.slice(3))}</h2>);
        return;
      }
      if (line.startsWith('### ')) {
        elements.push(<h3 key={idx} className="text-lg font-medium mt-4 mb-2 text-foreground">{processInlineFormatting(line.slice(4))}</h3>);
        return;
      }
      if (line.startsWith('#### ')) {
        elements.push(<h4 key={idx} className="text-base font-medium mt-3 mb-2 text-foreground">{processInlineFormatting(line.slice(5))}</h4>);
        return;
      }
      
      // Blockquotes
      if (line.startsWith('> ')) {
        elements.push(
          <blockquote key={idx} className="border-l-4 border-primary pl-4 py-2 my-3 bg-primary/5 rounded-r italic">
            {processInlineFormatting(line.slice(2))}
          </blockquote>
        );
        return;
      }
      
      // Checkboxes
      if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
        const checked = line.startsWith('- [x] ');
        const text = line.slice(6);
        elements.push(
          <div key={idx} className="flex items-start gap-2 my-1 ml-4">
            <span className={`mt-0.5 ${checked ? 'text-green-500' : 'text-muted-foreground'}`}>
              {checked ? '☑' : '☐'}
            </span>
            <span className={checked ? 'line-through text-muted-foreground' : ''}>{processInlineFormatting(text)}</span>
          </div>
        );
        return;
      }
      
      // Emoji checkmarks (✅, ✔, ☑)
      if (line.startsWith('✅ ') || line.startsWith('✔ ') || line.startsWith('☑ ')) {
        elements.push(
          <div key={idx} className="flex items-start gap-2 my-1 ml-4">
            <span className="text-green-500">{line.charAt(0)}</span>
            <span>{processInlineFormatting(line.slice(2))}</span>
          </div>
        );
        return;
      }
      
      // List items with dash
      if (line.startsWith('- ')) {
        const text = line.slice(2);
        elements.push(
          <div key={idx} className="flex items-start gap-2 my-1.5 ml-4">
            <span className="text-primary mt-0.5">•</span>
            <span className="flex-1">{processInlineFormatting(text)}</span>
          </div>
        );
        return;
      }
      
      // Numbered lists
      const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
      if (numberedMatch) {
        elements.push(
          <div key={idx} className="flex items-start gap-2 my-1.5 ml-4">
            <span className="text-primary font-medium min-w-[1.5rem]">{numberedMatch[1]}.</span>
            <span className="flex-1">{processInlineFormatting(numberedMatch[2])}</span>
          </div>
        );
        return;
      }
      
      // Horizontal rules
      if (line === '---' || line === '***' || line === '___') {
        elements.push(<hr key={idx} className="my-4 border-border" />);
        return;
      }
      
      // Code blocks markers (skip)
      if (line.startsWith('```')) {
        return;
      }
      
      // Empty lines
      if (!line.trim()) {
        elements.push(<div key={idx} className="h-3" />);
        return;
      }
      
      // Script/dialog lines (quoted text)
      if (line.startsWith('"') || line.startsWith('"') || line.startsWith("'")) {
        elements.push(
          <div key={idx} className="my-2 p-3 bg-muted/50 rounded-lg border-l-4 border-amber-500 italic">
            {processInlineFormatting(line)}
          </div>
        );
        return;
      }
      
      // Regular paragraphs
      elements.push(
        <p key={idx} className="my-2 leading-relaxed text-foreground/90">
          {processInlineFormatting(line)}
        </p>
      );
    });
    
    // Flush any remaining table
    if (inTable) {
      flushTable();
    }
    
    return elements;
  };

  if (!materialId) return null;

  const isCompleted = material ? isMaterialCompleted(material.id) : false;
  const difficulty = material ? (DIFFICULTY_LABELS[material.difficulty_level] || DIFFICULTY_LABELS.iniciante) : DIFFICULTY_LABELS.iniciante;

  return (
    <Dialog open={!!materialId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0" aria-describedby={undefined}>
        <DialogHeader className="sr-only">
          <DialogTitle>{material?.title || 'Material de Treinamento'}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : material ? (
          <>
            {/* Header */}
            <div className="flex-shrink-0 p-6 border-b border-border">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  isCompleted ? 'bg-green-500/20' : 'bg-primary/10'
                }`}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <BookOpen className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline">{material.category}</Badge>
                    <Badge variant="secondary" className={difficulty.color}>
                      {difficulty.label}
                    </Badge>
                    {isCompleted && (
                      <Badge className="bg-green-500">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Concluído
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-xl font-bold">{material.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{material.description}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 mt-4 text-sm">
                <div className="flex items-center gap-1">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="font-medium">{material.xp_reward} XP</span>
                </div>
                {material.duration_minutes && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{material.duration_minutes} min de leitura</span>
                  </div>
                )}
              </div>
              
              {/* Reading Progress */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progresso de leitura</span>
                  <span>{Math.round(scrollProgress)}%</span>
                </div>
                <Progress value={scrollProgress} className="h-1" />
              </div>
            </div>

            {/* Content */}
            <ScrollArea 
              className="flex-1 px-6" 
              onScrollCapture={handleScroll}
            >
              <div className="py-4 prose prose-sm max-w-none">
                {material.content ? (
                  renderMarkdown(material.content)
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Conteúdo em desenvolvimento</p>
                    {(material.external_url || material.file_url) && (
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => window.open(material.external_url || material.file_url, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Acessar Material Externo
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="flex-shrink-0 p-4 border-t border-border bg-muted/30">
              <div className="flex justify-between items-center">
                <Button variant="outline" onClick={onClose}>
                  Fechar
                </Button>
                <Button 
                  onClick={handleComplete}
                  disabled={isCompleted}
                  className={isCompleted ? 'bg-green-500 hover:bg-green-600' : ''}
                >
                  {isCompleted ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Já Concluído
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Marcar como Concluído (+{material.xp_reward} XP)
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Material não encontrado
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TrainingMaterialViewer;
