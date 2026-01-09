import { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Clock, CheckCircle2, Copy, Check, X, 
  ChevronLeft, ExternalLink, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useKnowledgeBaseReads } from '@/hooks/useKnowledgeBaseReads';
import { useToast } from '@/hooks/use-toast';

interface Article {
  id: string;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  created_at?: string;
}

interface KnowledgeBaseArticleViewerProps {
  article: Article | null;
  open: boolean;
  onClose: () => void;
}

export function KnowledgeBaseArticleViewer({ 
  article, 
  open, 
  onClose 
}: KnowledgeBaseArticleViewerProps) {
  const { toast } = useToast();
  const { 
    isArticleCompleted, 
    markAsRead, 
    getReadProgress,
    isMarkingRead 
  } = useKnowledgeBaseReads();
  
  const [timeSpent, setTimeSpent] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const isCompleted = article ? isArticleCompleted(article.id) : false;
  const readProgress = article ? getReadProgress(article.id) : null;

  // Track time spent
  useEffect(() => {
    if (open && article) {
      // Start timer
      intervalRef.current = setInterval(() => {
        setTimeSpent(prev => prev + 1);
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      setTimeSpent(0);
    }
  }, [open, article?.id]);

  // Track scroll progress
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollHeight = target.scrollHeight - target.clientHeight;
    const progress = scrollHeight > 0 ? (target.scrollTop / scrollHeight) * 100 : 100;
    setScrollProgress(progress);
  };

  const handleMarkAsRead = () => {
    if (!article) return;
    
    markAsRead({
      articleId: article.id,
      timeSpent,
      completed: true
    });

    toast({
      title: '✅ Artigo marcado como lido!',
      description: `Tempo de leitura: ${formatTime(timeSpent)}`
    });
  };

  const handleCopyContent = (content: string, sectionId: string) => {
    navigator.clipboard.writeText(content);
    setCopiedSection(sectionId);
    toast({ title: '📋 Copiado!', description: 'Conteúdo copiado para área de transferência' });
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}min ${secs}s`;
  };

  if (!article) return null;

  // Parse content for copyable sections (code blocks, scripts, etc.)
  const contentSections = article.content.split(/```|"""/).map((section, i) => ({
    id: `section-${i}`,
    content: section.trim(),
    isCode: i % 2 === 1 // Odd indices are code blocks
  }));

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-4 border-b bg-muted/30">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isCompleted ? 'bg-green-500/20' : 'bg-primary/10'
              }`}>
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <BookOpen className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-lg truncate">
                  {article.title}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                  {article.category && (
                    <Badge variant="outline" className="text-xs">
                      {article.category}
                    </Badge>
                  )}
                  {isCompleted && (
                    <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Lido
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Progress bar */}
        <div className="px-4 py-2 border-b bg-background">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <div className="flex items-center gap-2">
              <Eye className="h-3 w-3" />
              <span>{Math.round(scrollProgress)}% lido</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span>{formatTime(timeSpent)}</span>
            </div>
          </div>
          <Progress value={scrollProgress} className="h-1" />
        </div>

        {/* Content */}
        <ScrollArea 
          className="flex-1 p-4" 
          onScrollCapture={handleScroll}
          ref={scrollRef}
        >
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {contentSections.map((section) => {
              if (!section.content) return null;
              
              if (section.isCode) {
                return (
                  <div key={section.id} className="relative my-4">
                    <pre className="bg-muted p-3 rounded-lg overflow-x-auto text-xs">
                      <code>{section.content}</code>
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2 h-7 gap-1"
                      onClick={() => handleCopyContent(section.content, section.id)}
                    >
                      {copiedSection === section.id ? (
                        <>
                          <Check className="h-3 w-3 text-green-500" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Copiar
                        </>
                      )}
                    </Button>
                  </div>
                );
              }

              // Check if section looks like a script (contains script patterns)
              const isScript = section.content.includes('💫') || 
                section.content.includes('🌟') ||
                section.content.includes('[NOME]') ||
                section.content.match(/^(Oi|Olá|Bom dia|Boa tarde)/);

              if (isScript) {
                return (
                  <div key={section.id} className="relative my-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap pr-20">{section.content}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2 h-7 gap-1"
                      onClick={() => handleCopyContent(section.content, section.id)}
                    >
                      {copiedSection === section.id ? (
                        <>
                          <Check className="h-3 w-3 text-green-500" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Copiar
                        </>
                      )}
                    </Button>
                  </div>
                );
              }

              return (
                <div key={section.id} className="my-4">
                  <p className="text-sm whitespace-pre-wrap">{section.content}</p>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/30">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              {readProgress && (
                <span>Última leitura: {formatTime(readProgress.time_spent_seconds || 0)}</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyContent(article.content, 'full-content')}
              >
                {copiedSection === 'full-content' ? (
                  <>
                    <Check className="h-4 w-4 mr-1 text-green-500" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar Tudo
                  </>
                )}
              </Button>
              {!isCompleted && (
                <Button
                  size="sm"
                  onClick={handleMarkAsRead}
                  disabled={isMarkingRead}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Marcar como Lido
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default KnowledgeBaseArticleViewer;
