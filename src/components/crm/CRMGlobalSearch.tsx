import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  User, 
  Phone, 
  Mail, 
  Tag, 
  Calendar,
  Clock,
  X,
  Loader2,
  Sparkles,
  Star,
  AlertTriangle,
  DollarSign,
  ArrowRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { CRMLead } from '@/hooks/useCRM';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CRMGlobalSearchProps {
  leads: CRMLead[];
  onSelectLead: (lead: CRMLead) => void;
  onNavigate: (view: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CRMGlobalSearch({
  leads,
  onSelectLead,
  onNavigate,
  isOpen,
  onOpenChange,
}: CRMGlobalSearchProps) {
  const [query, setQuery] = useState('');

  // Filter leads based on query
  const filteredLeads = useMemo(() => {
    if (!query.trim()) return [];
    
    const searchLower = query.toLowerCase();
    return leads.filter(lead => {
      return (
        lead.name?.toLowerCase().includes(searchLower) ||
        lead.email?.toLowerCase().includes(searchLower) ||
        lead.phone?.includes(query) ||
        lead.whatsapp?.includes(query) ||
        lead.cpf?.includes(query) ||
        lead.prontuario?.includes(query) ||
        lead.tags?.some(t => t.toLowerCase().includes(searchLower)) ||
        lead.source?.toLowerCase().includes(searchLower) ||
        lead.source_detail?.toLowerCase().includes(searchLower)
      );
    }).slice(0, 10);
  }, [leads, query]);

  // Group leads by status
  const groupedResults = useMemo(() => {
    const priority = filteredLeads.filter(l => l.is_priority);
    const stale = filteredLeads.filter(l => l.is_stale && !l.is_priority);
    const analyzed = filteredLeads.filter(l => l.ai_analyzed_at && !l.is_priority && !l.is_stale);
    const regular = filteredLeads.filter(l => !l.is_priority && !l.is_stale && !l.ai_analyzed_at);
    
    return { priority, stale, analyzed, regular };
  }, [filteredLeads]);

  // Quick navigation commands
  const quickCommands = [
    { label: 'Kanban', value: 'kanban', shortcut: 'K' },
    { label: 'Overview', value: 'overview', shortcut: 'O' },
    { label: 'Automações', value: 'automations', shortcut: 'A' },
    { label: 'Ranking', value: 'leaderboard', shortcut: 'R' },
    { label: 'WhatsApp IA', value: 'whatsapp', shortcut: 'W' },
    { label: 'Chat Equipe', value: 'chat', shortcut: 'C' },
    { label: 'Métricas', value: 'metrics', shortcut: 'M' },
    { label: 'Marketing', value: 'marketing', shortcut: '' },
  ];

  // Reset query when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  const renderLeadItem = (lead: CRMLead) => (
    <CommandItem
      key={lead.id}
      value={lead.id}
      onSelect={() => {
        onSelectLead(lead);
        onOpenChange(false);
      }}
      className="flex items-center gap-3 py-3 cursor-pointer"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{lead.name}</span>
          {lead.is_priority && <Star className="w-3 h-3 text-yellow-500 flex-shrink-0" />}
          {lead.is_stale && <AlertTriangle className="w-3 h-3 text-orange-500 flex-shrink-0" />}
          {lead.ai_analyzed_at && <Sparkles className="w-3 h-3 text-primary flex-shrink-0" />}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {lead.phone && (
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {lead.phone}
            </span>
          )}
          {lead.email && (
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {lead.email.length > 20 ? lead.email.slice(0, 20) + '...' : lead.email}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0">
        {lead.estimated_value && (
          <Badge variant="outline" className="text-green-600 border-green-500/50">
            <DollarSign className="w-3 h-3 mr-1" />
            {(lead.estimated_value / 1000).toFixed(0)}k
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: ptBR })}
        </span>
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </CommandItem>
  );

  return (
    <CommandDialog open={isOpen} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Buscar leads, comandos, navegação..." 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        
        {!query && (
          <CommandGroup heading="Navegação Rápida">
            {quickCommands.map((cmd) => (
              <CommandItem
                key={cmd.value}
                value={cmd.value}
                onSelect={() => {
                  onNavigate(cmd.value);
                  onOpenChange(false);
                }}
                className="flex items-center justify-between"
              >
                <span>{cmd.label}</span>
                {cmd.shortcut && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {cmd.shortcut}
                  </Badge>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {query && groupedResults.priority.length > 0 && (
          <CommandGroup heading="⭐ Prioritários">
            {groupedResults.priority.map(renderLeadItem)}
          </CommandGroup>
        )}

        {query && groupedResults.stale.length > 0 && (
          <CommandGroup heading="⚠️ Parados">
            {groupedResults.stale.map(renderLeadItem)}
          </CommandGroup>
        )}

        {query && groupedResults.analyzed.length > 0 && (
          <CommandGroup heading="✨ Analisados por IA">
            {groupedResults.analyzed.map(renderLeadItem)}
          </CommandGroup>
        )}

        {query && groupedResults.regular.length > 0 && (
          <CommandGroup heading="Leads">
            {groupedResults.regular.map(renderLeadItem)}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
