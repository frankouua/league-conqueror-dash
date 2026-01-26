import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Phone, MessageSquare, Mail, FileText, Clock,
  CheckCircle2, AlertTriangle, TrendingUp, History,
  DollarSign, Calendar, User, ThumbsUp, ThumbsDown,
  FileSignature, Sparkles, ArrowRight
} from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { CRMLead } from '@/hooks/useCRM';

interface CRMLeadSummaryProps {
  lead: CRMLead;
  history: any[];
  tasks: any[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const actionTypeIcons: Record<string, any> = {
  'note': FileText,
  'call': Phone,
  'whatsapp': WhatsAppIcon,
  'email': Mail,
  'stage_change': ArrowRight,
  'negotiation_change': DollarSign,
  'won': ThumbsUp,
  'lost': ThumbsDown,
  'contract': FileSignature,
  'task_completed': CheckCircle2,
  'ai_analysis': Sparkles,
  'transfer': User,
};

const actionTypeLabels: Record<string, string> = {
  'note': 'Observação',
  'call': 'Ligação',
  'whatsapp': 'WhatsApp',
  'email': 'E-mail',
  'stage_change': 'Mudança de Etapa',
  'negotiation_change': 'Negociação Atualizada',
  'won': 'Venda Fechada',
  'lost': 'Lead Perdido',
  'contract': 'Contrato',
  'task_completed': 'Tarefa Concluída',
  'ai_analysis': 'Análise IA',
  'transfer': 'Transferência',
};

const actionTypeColors: Record<string, string> = {
  'note': 'border-blue-500 bg-blue-500/5',
  'call': 'border-cyan-500 bg-cyan-500/5',
  'whatsapp': 'border-green-500 bg-green-500/5',
  'email': 'border-orange-500 bg-orange-500/5',
  'stage_change': 'border-purple-500 bg-purple-500/5',
  'negotiation_change': 'border-emerald-500 bg-emerald-500/5',
  'won': 'border-green-600 bg-green-600/10',
  'lost': 'border-destructive bg-destructive/5',
  'contract': 'border-indigo-500 bg-indigo-500/5',
  'task_completed': 'border-green-500 bg-green-500/5',
  'ai_analysis': 'border-violet-500 bg-violet-500/5',
  'transfer': 'border-amber-500 bg-amber-500/5',
};

export function CRMLeadSummary({ lead, history, tasks }: CRMLeadSummaryProps) {
  // Calculate stats
  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.is_completed).length;
    const overdueTasks = tasks.filter(t => !t.is_completed && new Date(t.due_date) < new Date()).length;
    const pendingTasks = totalTasks - completedTasks;
    
    const notes = history.filter(h => h.action_type === 'note').length;
    const calls = history.filter(h => h.action_type === 'call').length;
    const whatsapps = history.filter(h => h.action_type === 'whatsapp').length;
    const emails = history.filter(h => h.action_type === 'email').length;
    const stageChanges = history.filter(h => h.action_type === 'stage_change').length;
    const negotiations = history.filter(h => h.action_type === 'negotiation_change').length;

    return {
      totalTasks,
      completedTasks,
      overdueTasks,
      pendingTasks,
      notes,
      calls,
      whatsapps,
      emails,
      stageChanges,
      negotiations,
      totalInteractions: notes + calls + whatsapps + emails,
    };
  }, [history, tasks]);

  // Sort history by date
  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [history]);

  return (
    <div className="space-y-4">
      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 gap-2">
        {/* Tasks Progress */}
        <Card className={cn(
          stats.overdueTasks > 0 ? "border-destructive/50" : "border-green-500/30"
        )}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className={cn(
                "h-4 w-4",
                stats.overdueTasks > 0 ? "text-destructive" : "text-green-500"
              )} />
              <span className="text-xs font-medium">Tarefas</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{stats.completedTasks}</span>
              <span className="text-sm text-muted-foreground">/ {stats.totalTasks}</span>
            </div>
            {stats.totalTasks > 0 && (
              <Progress 
                value={(stats.completedTasks / stats.totalTasks) * 100} 
                className="h-1.5 mt-2"
              />
            )}
            {stats.overdueTasks > 0 && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {stats.overdueTasks} atrasada(s)
              </p>
            )}
          </CardContent>
        </Card>

        {/* Interactions Summary */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <History className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">Interações</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalInteractions}</div>
            <div className="flex gap-2 mt-2">
              {stats.calls > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  <Phone className="h-2.5 w-2.5 mr-0.5" /> {stats.calls}
                </Badge>
              )}
              {stats.whatsapps > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500 text-green-600">
                  <WhatsAppIcon className="h-2.5 w-2.5 mr-0.5" /> {stats.whatsapps}
                </Badge>
              )}
              {stats.notes > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500 text-blue-600">
                  <FileText className="h-2.5 w-2.5 mr-0.5" /> {stats.notes}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Negotiation Info */}
      {(lead.estimated_value || 0) > 0 && (
        <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/5 border-green-500/30">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  Valor em Negociação
                </p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(lead.estimated_value || 0)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Procedimentos</p>
                <p className="text-lg font-bold">{lead.interested_procedures?.length || 0}</p>
              </div>
            </div>
            {stats.negotiations > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {stats.negotiations} atualização(ões) de negociação
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Surgery Date */}
      {lead.surgery_date && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Data da Cirurgia</p>
              <p className="font-semibold">
                {format(new Date(lead.surgery_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline / History */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico Completo
            <Badge variant="secondary" className="text-xs">{history.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <ScrollArea className="h-[300px] pr-2">
            <div className="space-y-2">
              {sortedHistory.map((entry) => {
                const Icon = actionTypeIcons[entry.action_type] || FileText;
                const label = actionTypeLabels[entry.action_type] || entry.action_type;
                const colorClass = actionTypeColors[entry.action_type] || 'border-muted';
                
                return (
                  <div 
                    key={entry.id}
                    className={cn(
                      "border-l-2 pl-3 py-2 rounded-r-md",
                      colorClass
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {label}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(entry.created_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                        </div>
                        <p className="font-medium text-sm mt-1">{entry.title}</p>
                        {entry.description && (
                          <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                            {entry.description}
                          </p>
                        )}
                        {/* Show old/new values for stage changes */}
                        {entry.action_type === 'stage_change' && entry.old_value && entry.new_value && (
                          <div className="flex items-center gap-1 mt-1 text-xs">
                            <Badge variant="outline" className="text-[10px]">
                              {entry.old_value}
                            </Badge>
                            <ArrowRight className="h-3 w-3" />
                            <Badge className="text-[10px] bg-primary/20 text-primary">
                              {entry.new_value}
                            </Badge>
                          </div>
                        )}
                        {/* Show negotiation changes */}
                        {entry.action_type === 'negotiation_change' && (
                          <div className="text-xs text-emerald-600 mt-1 font-medium">
                            {entry.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {sortedHistory.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum histórico registrado</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
