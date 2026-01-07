import { useEffect, useState } from 'react';
import { 
  Keyboard, 
  LayoutGrid, 
  Plus, 
  Search, 
  RefreshCw,
  PieChart,
  Zap,
  Trophy,
  MessageSquare,
  Phone,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface KeyboardShortcut {
  key: string;
  description: string;
  icon: typeof Keyboard;
  category: 'navigation' | 'actions' | 'views';
}

const shortcuts: KeyboardShortcut[] = [
  // Navigation
  { key: 'K', description: 'Ir para Kanban', icon: LayoutGrid, category: 'navigation' },
  { key: 'O', description: 'Ir para Overview', icon: PieChart, category: 'navigation' },
  { key: 'A', description: 'Ir para Automações', icon: Zap, category: 'navigation' },
  { key: 'R', description: 'Ir para Ranking', icon: Trophy, category: 'navigation' },
  { key: 'C', description: 'Ir para Chat', icon: MessageSquare, category: 'navigation' },
  { key: 'W', description: 'Ir para WhatsApp IA', icon: Phone, category: 'navigation' },
  
  // Actions
  { key: 'N', description: 'Novo Lead', icon: Plus, category: 'actions' },
  { key: '/', description: 'Focar na busca', icon: Search, category: 'actions' },
  { key: 'F5', description: 'Atualizar dados', icon: RefreshCw, category: 'actions' },
  { key: 'Esc', description: 'Fechar modal/painel', icon: X, category: 'actions' },
  { key: '?', description: 'Mostrar atalhos', icon: Keyboard, category: 'actions' },
];

interface CRMKeyboardShortcutsProps {
  onNavigate: (view: string) => void;
  onNewLead: () => void;
  onRefresh: () => void;
  onFocusSearch: () => void;
}

export function CRMKeyboardShortcuts({
  onNavigate,
  onNewLead,
  onRefresh,
  onFocusSearch,
}: CRMKeyboardShortcutsProps) {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        // Only allow Escape
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      // Check for modifier keys
      const hasModifier = e.ctrlKey || e.metaKey || e.altKey;

      switch (e.key.toLowerCase()) {
        case 'k':
          if (!hasModifier) {
            e.preventDefault();
            onNavigate('kanban');
          }
          break;
        case 'o':
          if (!hasModifier) {
            e.preventDefault();
            onNavigate('overview');
          }
          break;
        case 'a':
          if (!hasModifier) {
            e.preventDefault();
            onNavigate('automations');
          }
          break;
        case 'r':
          if (!hasModifier) {
            e.preventDefault();
            onNavigate('leaderboard');
          }
          break;
        case 'c':
          if (!hasModifier) {
            e.preventDefault();
            onNavigate('chat');
          }
          break;
        case 'w':
          if (!hasModifier) {
            e.preventDefault();
            onNavigate('whatsapp');
          }
          break;
        case 'n':
          if (!hasModifier) {
            e.preventDefault();
            onNewLead();
          }
          break;
        case '/':
          e.preventDefault();
          onFocusSearch();
          break;
        case '?':
          e.preventDefault();
          setShowHelp(true);
          break;
        case 'escape':
          setShowHelp(false);
          break;
        case 'f5':
          e.preventDefault();
          onRefresh();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigate, onNewLead, onRefresh, onFocusSearch]);

  const navigationShortcuts = shortcuts.filter(s => s.category === 'navigation');
  const actionShortcuts = shortcuts.filter(s => s.category === 'actions');

  return (
    <>
      {/* Keyboard hint button */}
      <button
        onClick={() => setShowHelp(true)}
        className="fixed bottom-4 right-4 z-40 bg-background/80 backdrop-blur-sm border rounded-full p-2 shadow-lg hover:bg-accent transition-colors"
        title="Atalhos de teclado (?)"
      >
        <Keyboard className="w-4 h-4 text-muted-foreground" />
      </button>

      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="w-5 h-5" />
              Atalhos de Teclado
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Navegação</h4>
              <div className="space-y-2">
                {navigationShortcuts.map((shortcut) => (
                  <div key={shortcut.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <shortcut.icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{shortcut.description}</span>
                    </div>
                    <Badge variant="outline" className="font-mono">
                      {shortcut.key}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Ações</h4>
              <div className="space-y-2">
                {actionShortcuts.map((shortcut) => (
                  <div key={shortcut.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <shortcut.icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{shortcut.description}</span>
                    </div>
                    <Badge variant="outline" className="font-mono">
                      {shortcut.key}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
