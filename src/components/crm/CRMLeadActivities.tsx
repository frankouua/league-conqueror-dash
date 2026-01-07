import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Phone,
  MessageSquare,
  Calendar,
  Target,
  FileText,
  ChevronDown,
  ChevronRight,
  Loader2,
  User,
  Filter,
  Search
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Definição dos checklists por etapa da jornada
const STAGE_CHECKLISTS: Record<string, { name: string; items: { id: string; title: string; description: string; required: boolean }[] }> = {
  // SDR Pipeline
  'novo_lead': {
    name: 'Novo Lead',
    items: [
      { id: 'first_contact', title: 'Primeiro contato em até 5 min', description: 'Entrar em contato imediatamente', required: true },
      { id: 'qualify_interest', title: 'Qualificar interesse', description: 'Identificar procedimento de interesse', required: true },
      { id: 'collect_info', title: 'Coletar informações básicas', description: 'Nome, telefone, email', required: true },
    ]
  },
  'tentando_contato': {
    name: 'Tentando Contato',
    items: [
      { id: 'attempt_1', title: '1ª tentativa de contato', description: 'Ligar ou WhatsApp', required: true },
      { id: 'attempt_2', title: '2ª tentativa (após 2h)', description: 'Tentar outro canal', required: false },
      { id: 'attempt_3', title: '3ª tentativa (próximo dia)', description: 'Última tentativa', required: false },
    ]
  },
  'contato_realizado': {
    name: 'Contato Realizado',
    items: [
      { id: 'send_material', title: 'Enviar material informativo', description: 'PDFs e vídeos do procedimento', required: true },
      { id: 'schedule_eval', title: 'Agendar avaliação', description: 'Marcar consulta com médico', required: true },
      { id: 'confirm_whatsapp', title: 'Confirmar via WhatsApp', description: 'Enviar confirmação do agendamento', required: true },
    ]
  },
  'agendado': {
    name: 'Agendado',
    items: [
      { id: 'reminder_24h', title: 'Lembrete 24h antes', description: 'Confirmar presença', required: true },
      { id: 'send_location', title: 'Enviar localização', description: 'Endereço e orientações', required: true },
      { id: 'prepare_docs', title: 'Preparar documentação', description: 'Ficha de anamnese pronta', required: false },
    ]
  },
  // Sales Pipeline
  'em_negociacao': {
    name: 'Em Negociação',
    items: [
      { id: 'present_proposal', title: 'Apresentar proposta', description: 'Valores e condições de pagamento', required: true },
      { id: 'handle_objections', title: 'Tratar objeções', description: 'Responder dúvidas e preocupações', required: true },
      { id: 'send_contract', title: 'Enviar contrato', description: 'Documentação para assinatura', required: true },
    ]
  },
  'proposta_enviada': {
    name: 'Proposta Enviada',
    items: [
      { id: 'follow_up_48h', title: 'Follow-up em 48h', description: 'Verificar se recebeu e tirar dúvidas', required: true },
      { id: 'negotiate_terms', title: 'Negociar termos', description: 'Ajustar condições se necessário', required: false },
      { id: 'urgency_close', title: 'Criar urgência', description: 'Benefícios para fechamento rápido', required: false },
    ]
  },
  'venda_fechada': {
    name: 'Venda Fechada',
    items: [
      { id: 'confirm_payment', title: 'Confirmar pagamento', description: 'Verificar entrada/primeira parcela', required: true },
      { id: 'schedule_surgery', title: 'Definir data da cirurgia', description: 'Agendar procedimento', required: true },
      { id: 'send_pre_op', title: 'Enviar orientações pré-op', description: 'Instruções e exames', required: true },
      { id: 'transfer_pos_sale', title: 'Transferir para pós-venda', description: 'Passar para equipe de acompanhamento', required: true },
    ]
  },
  // Post-Sale Pipeline
  'pre_cirurgia': {
    name: 'Pré-Cirurgia',
    items: [
      { id: 'check_exams', title: 'Verificar exames', description: 'Confirmar entrega de todos os exames', required: true },
      { id: 'confirm_surgery', title: 'Confirmar cirurgia 48h antes', description: 'Ligação de confirmação', required: true },
      { id: 'send_instructions', title: 'Enviar instruções finais', description: 'Jejum, medicamentos, horário', required: true },
      { id: 'confirm_accomp', title: 'Confirmar acompanhante', description: 'Verificar quem vai buscar', required: true },
    ]
  },
  'pos_imediato': {
    name: 'Pós-Operatório Imediato (0-3 dias)',
    items: [
      { id: 'call_day1', title: 'Ligar no D+1', description: 'Perguntar como está, verificar dor', required: true },
      { id: 'check_meds', title: 'Verificar medicação', description: 'Confirmar que está tomando remédios', required: true },
      { id: 'answer_doubts', title: 'Responder dúvidas', description: 'Orientações sobre recuperação', required: true },
    ]
  },
  'pos_recente': {
    name: 'Pós-Operatório Recente (4-14 dias)',
    items: [
      { id: 'schedule_return', title: 'Agendar retorno', description: 'Marcar consulta de revisão', required: true },
      { id: 'request_photos', title: 'Solicitar fotos', description: 'Pedir fotos de evolução', required: true },
      { id: 'check_recovery', title: 'Verificar recuperação', description: 'Perguntar sobre inchaço, dor, mobilidade', required: true },
    ]
  },
  'pos_tardio': {
    name: 'Pós-Operatório Tardio (15-30 dias)',
    items: [
      { id: 'collect_testimonial', title: 'Coletar depoimento', description: 'Pedir feedback por vídeo ou texto', required: false },
      { id: 'request_nps', title: 'Solicitar NPS', description: 'Enviar pesquisa de satisfação', required: true },
      { id: 'request_referral', title: 'Pedir indicação', description: 'Perguntar se conhece alguém interessado', required: false },
    ]
  },
  'acompanhamento': {
    name: 'Acompanhamento Contínuo',
    items: [
      { id: 'monthly_checkin', title: 'Check-in mensal', description: 'Mensagem de acompanhamento', required: false },
      { id: 'birthday_msg', title: 'Mensagem de aniversário', description: 'Enviar felicitações', required: false },
      { id: 'new_procedure', title: 'Oferecer novos procedimentos', description: 'Apresentar complementos', required: false },
    ]
  },
};

// Mapeamento de stage_id para stage_key (simplificado)
const getStageKey = (stageName: string): string => {
  const mapping: Record<string, string> = {
    'Novo Lead': 'novo_lead',
    'Tentando Contato': 'tentando_contato',
    'Contato Realizado': 'contato_realizado',
    'Agendado': 'agendado',
    'Em Negociação': 'em_negociacao',
    'Proposta Enviada': 'proposta_enviada',
    'Venda Fechada': 'venda_fechada',
    'Pré-Cirurgia': 'pre_cirurgia',
    'Pós-Op Imediato': 'pos_imediato',
    'Pós-Op Recente': 'pos_recente',
    'Pós-Op Tardio': 'pos_tardio',
    'Acompanhamento': 'acompanhamento',
  };
  return mapping[stageName] || 'novo_lead';
};

interface LeadWithChecklist {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  stage_name: string;
  stage_key: string;
  pipeline_name: string;
  surgery_date: string | null;
  assigned_to: string | null;
  assigned_name: string | null;
  days_in_stage: number | null;
  checklist_progress: Record<string, boolean>;
  notes: Record<string, string>;
}

export const CRMLeadActivities = () => {
  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set());
  const [filterStage, setFilterStage] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPending, setFilterPending] = useState(true);
  const queryClient = useQueryClient();

  // Buscar leads com seus checklists
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads-activities', filterStage, filterPending],
    queryFn: async () => {
      // Buscar leads ativos
      let query = supabase
        .from('crm_leads')
        .select(`
          id,
          name,
          phone,
          email,
          surgery_date,
          assigned_to,
          days_in_stage,
          stage:crm_stages!inner(id, name, pipeline:crm_pipelines!inner(name))
        `)
        .is('lost_at', null)
        .order('days_in_stage', { ascending: false });

      const { data: leadsData, error } = await query;
      if (error) throw error;

      // Buscar progresso dos checklists
      const leadIds = leadsData?.map(l => l.id) || [];
      const { data: checklistProgress } = await supabase
        .from('crm_lead_checklist_progress')
        .select('*')
        .in('lead_id', leadIds);

      // Buscar nomes dos usuários atribuídos
      const assignedIds = [...new Set(leadsData?.map(l => l.assigned_to).filter(Boolean) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', assignedIds);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      return leadsData?.map(lead => {
        const stageName = (lead.stage as any)?.name || '';
        const stageKey = getStageKey(stageName);
        const pipelineName = (lead.stage as any)?.pipeline?.name || '';
        
        // Construir progresso do checklist
        const progress: Record<string, boolean> = {};
        const notes: Record<string, string> = {};
        
        const leadProgress = checklistProgress?.filter(p => p.lead_id === lead.id) || [];
        const stageChecklist = STAGE_CHECKLISTS[stageKey];
        
        if (stageChecklist) {
          stageChecklist.items.forEach((item, index) => {
            const progressItem = leadProgress.find(p => p.stage_key === stageKey && p.action_index === index);
            progress[item.id] = progressItem?.completed || false;
          });
        }

        return {
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          stage_name: stageName,
          stage_key: stageKey,
          pipeline_name: pipelineName,
          surgery_date: lead.surgery_date,
          assigned_to: lead.assigned_to,
          assigned_name: lead.assigned_to ? profilesMap.get(lead.assigned_to) || null : null,
          days_in_stage: lead.days_in_stage,
          checklist_progress: progress,
          notes
        } as LeadWithChecklist;
      }) || [];
    }
  });

  // Mutation para atualizar checklist
  const updateChecklistMutation = useMutation({
    mutationFn: async ({ leadId, stageKey, actionIndex, completed }: { 
      leadId: string; 
      stageKey: string; 
      actionIndex: number; 
      completed: boolean 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data: existing } = await supabase
        .from('crm_lead_checklist_progress')
        .select('id')
        .eq('lead_id', leadId)
        .eq('stage_key', stageKey)
        .eq('action_index', actionIndex)
        .single();

      if (existing) {
        await supabase
          .from('crm_lead_checklist_progress')
          .update({ 
            completed, 
            completed_at: completed ? new Date().toISOString() : null,
            completed_by: completed ? user.id : null 
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('crm_lead_checklist_progress')
          .insert({
            lead_id: leadId,
            stage_key: stageKey,
            action_index: actionIndex,
            completed,
            completed_by: user.id,
            completed_at: completed ? new Date().toISOString() : null
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads-activities'] });
      toast.success('Atividade atualizada!');
    }
  });

  const toggleExpand = (leadId: string) => {
    setExpandedLeads(prev => {
      const next = new Set(prev);
      if (next.has(leadId)) {
        next.delete(leadId);
      } else {
        next.add(leadId);
      }
      return next;
    });
  };

  const handleToggleItem = (lead: LeadWithChecklist, itemId: string, itemIndex: number) => {
    const newCompleted = !lead.checklist_progress[itemId];
    updateChecklistMutation.mutate({
      leadId: lead.id,
      stageKey: lead.stage_key,
      actionIndex: itemIndex,
      completed: newCompleted
    });
  };

  // Filtrar leads
  const filteredLeads = leads.filter(lead => {
    if (filterStage !== 'all' && lead.stage_key !== filterStage) return false;
    if (searchTerm && !lead.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    
    if (filterPending) {
      const checklist = STAGE_CHECKLISTS[lead.stage_key];
      if (!checklist) return false;
      const hasPending = checklist.items.some(item => !lead.checklist_progress[item.id]);
      if (!hasPending) return false;
    }
    
    return true;
  });

  // Agrupar por etapa
  const groupedLeads = filteredLeads.reduce((acc, lead) => {
    const key = lead.stage_key;
    if (!acc[key]) acc[key] = [];
    acc[key].push(lead);
    return acc;
  }, {} as Record<string, LeadWithChecklist[]>);

  // Calcular estatísticas
  const totalPending = filteredLeads.reduce((acc, lead) => {
    const checklist = STAGE_CHECKLISTS[lead.stage_key];
    if (!checklist) return acc;
    return acc + checklist.items.filter(item => !lead.checklist_progress[item.id]).length;
  }, 0);

  const totalCompleted = filteredLeads.reduce((acc, lead) => {
    const checklist = STAGE_CHECKLISTS[lead.stage_key];
    if (!checklist) return acc;
    return acc + checklist.items.filter(item => lead.checklist_progress[item.id]).length;
  }, 0);

  const completionRate = totalCompleted + totalPending > 0 
    ? Math.round((totalCompleted / (totalCompleted + totalPending)) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Checklist de Atividades</h2>
          <p className="text-muted-foreground">Ações pendentes por lead em cada etapa da jornada</p>
        </div>
        <div className="flex gap-3">
          <Card className="px-4 py-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="font-bold">{totalPending}</p>
              </div>
            </div>
          </Card>
          <Card className="px-4 py-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Concluídas</p>
                <p className="font-bold">{completionRate}%</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar lead..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterStage} onValueChange={setFilterStage}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Etapa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as etapas</SelectItem>
                  {Object.entries(STAGE_CHECKLISTS).map(([key, stage]) => (
                    <SelectItem key={key} value={key}>{stage.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filterPending}
                onCheckedChange={(checked) => setFilterPending(!!checked)}
              />
              <span className="text-sm">Apenas com pendências</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Leads por Etapa */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredLeads.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p className="text-lg font-medium">Tudo em dia!</p>
            <p className="text-muted-foreground">Nenhuma atividade pendente encontrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedLeads).map(([stageKey, stageLeads]) => {
            const stageConfig = STAGE_CHECKLISTS[stageKey];
            if (!stageConfig) return null;

            return (
              <Card key={stageKey}>
                <CardHeader className="py-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      {stageConfig.name}
                    </div>
                    <Badge variant="secondary">{stageLeads.length} leads</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {stageLeads.map(lead => {
                      const isExpanded = expandedLeads.has(lead.id);
                      const checklist = stageConfig.items;
                      const completedCount = checklist.filter(item => lead.checklist_progress[item.id]).length;
                      const progress = Math.round((completedCount / checklist.length) * 100);

                      return (
                        <Collapsible key={lead.id} open={isExpanded} onOpenChange={() => toggleExpand(lead.id)}>
                          <CollapsibleTrigger className="w-full">
                            <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              
                              <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{lead.name}</span>
                                  {lead.days_in_stage && lead.days_in_stage > 3 && (
                                    <Badge variant="destructive" className="text-xs">
                                      {lead.days_in_stage} dias
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                  {lead.assigned_name && (
                                    <span className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {lead.assigned_name}
                                    </span>
                                  )}
                                  {lead.surgery_date && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      Cirurgia: {format(new Date(lead.surgery_date), "dd/MM", { locale: ptBR })}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <span className="text-sm font-medium">{completedCount}/{checklist.length}</span>
                                  <Progress value={progress} className="w-20 h-2 mt-1" />
                                </div>
                                
                                {completedCount === checklist.length ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                                ) : (
                                  <Clock className="h-5 w-5 text-orange-500" />
                                )}
                              </div>
                            </div>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <div className="ml-8 mt-2 space-y-2 pb-3">
                              {checklist.map((item, index) => {
                                const isCompleted = lead.checklist_progress[item.id];
                                return (
                                  <div 
                                    key={item.id}
                                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                                      isCompleted ? 'bg-green-50 dark:bg-green-950/20 border-green-200' : 'bg-card'
                                    }`}
                                  >
                                    <Checkbox
                                      checked={isCompleted}
                                      onCheckedChange={() => handleToggleItem(lead, item.id, index)}
                                      disabled={updateChecklistMutation.isPending}
                                    />
                                    <div className="flex-1">
                                      <p className={`font-medium text-sm ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                        {item.title}
                                        {item.required && (
                                          <span className="text-red-500 ml-1">*</span>
                                        )}
                                      </p>
                                      <p className="text-xs text-muted-foreground">{item.description}</p>
                                    </div>
                                    
                                    <div className="flex gap-1">
                                      {lead.phone && (
                                        <Button 
                                          size="sm" 
                                          variant="ghost"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(`https://wa.me/55${lead.phone?.replace(/\D/g, '')}`, '_blank');
                                          }}
                                        >
                                          <MessageSquare className="h-4 w-4" />
                                        </Button>
                                      )}
                                      {lead.phone && (
                                        <Button 
                                          size="sm" 
                                          variant="ghost"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(`tel:${lead.phone}`, '_blank');
                                          }}
                                        >
                                          <Phone className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
