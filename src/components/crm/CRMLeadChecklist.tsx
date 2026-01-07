import { useState, useEffect } from 'react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CheckCircle2, Circle, AlertTriangle, Calendar, Clock,
  Stethoscope, Phone, FileCheck, Camera, MessageSquare,
  Heart, Bell
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CRMLead, CRMStage } from '@/hooks/useCRM';

interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  icon: any;
  required?: boolean;
}

interface StageChecklist {
  stage_key: string;
  stage_name: string;
  items: ChecklistItem[];
}

// Define checklists for each stage
const STAGE_CHECKLISTS: Record<string, StageChecklist> = {
  // Pipeline SDR
  'novo_lead': {
    stage_key: 'novo_lead',
    stage_name: 'Novo Lead',
    items: [
      { id: 'primeiro_contato', title: 'Realizar primeiro contato (máx 5 min)', icon: Phone, required: true },
      { id: 'identificar_interesse', title: 'Identificar interesse/procedimento desejado', icon: FileCheck, required: true },
      { id: 'coletar_dados', title: 'Coletar dados básicos (nome, telefone, email)', icon: FileCheck, required: true },
      { id: 'agendar_qualificacao', title: 'Agendar call de qualificação', icon: Calendar },
    ]
  },
  'qualificacao': {
    stage_key: 'qualificacao',
    stage_name: 'Qualificação',
    items: [
      { id: 'bant_budget', title: 'Verificar budget/capacidade financeira', icon: FileCheck, required: true },
      { id: 'bant_authority', title: 'Confirmar decisor da compra', icon: FileCheck, required: true },
      { id: 'bant_need', title: 'Entender necessidade/motivação', icon: Heart, required: true },
      { id: 'bant_timing', title: 'Definir urgência/prazo', icon: Clock, required: true },
      { id: 'enviar_materiais', title: 'Enviar materiais educativos', icon: MessageSquare },
    ]
  },
  'agendamento_consulta': {
    stage_key: 'agendamento_consulta',
    stage_name: 'Agendamento Consulta',
    items: [
      { id: 'agendar_avaliacao', title: 'Agendar consulta de avaliação', icon: Calendar, required: true },
      { id: 'enviar_confirmacao', title: 'Enviar confirmação por WhatsApp', icon: MessageSquare, required: true },
      { id: 'lembrete_24h', title: 'Programar lembrete 24h antes', icon: Bell },
      { id: 'lembrete_1h', title: 'Programar lembrete 1h antes', icon: Bell },
    ]
  },
  // Pipeline Vendas
  'em_negociacao': {
    stage_key: 'em_negociacao',
    stage_name: 'Em Negociação',
    items: [
      { id: 'apresentar_proposta', title: 'Apresentar proposta comercial', icon: FileCheck, required: true },
      { id: 'esclarecer_duvidas', title: 'Esclarecer todas as dúvidas', icon: MessageSquare, required: true },
      { id: 'oferecer_opcoes', title: 'Oferecer opções de pagamento', icon: FileCheck },
      { id: 'followup_proposta', title: 'Follow-up sobre proposta', icon: Phone },
    ]
  },
  'proposta_enviada': {
    stage_key: 'proposta_enviada',
    stage_name: 'Proposta Enviada',
    items: [
      { id: 'confirmar_recebimento', title: 'Confirmar recebimento da proposta', icon: Phone, required: true },
      { id: 'agendar_retorno', title: 'Agendar data de retorno', icon: Calendar, required: true },
      { id: 'followup_48h', title: 'Follow-up em 48h', icon: Clock },
      { id: 'contornar_objecoes', title: 'Contornar objeções identificadas', icon: MessageSquare },
    ]
  },
  'fechamento': {
    stage_key: 'fechamento',
    stage_name: 'Fechamento',
    items: [
      { id: 'confirmar_procedimento', title: 'Confirmar procedimento escolhido', icon: FileCheck, required: true },
      { id: 'assinar_contrato', title: 'Assinar contrato', icon: FileCheck, required: true },
      { id: 'receber_pagamento', title: 'Receber sinal/pagamento', icon: FileCheck, required: true },
      { id: 'agendar_cirurgia', title: 'Agendar data da cirurgia', icon: Calendar, required: true },
    ]
  },
  // Pipeline Pós-Venda
  'pre_operatorio': {
    stage_key: 'pre_operatorio',
    stage_name: 'Pré-Operatório',
    items: [
      { id: 'orientacoes_pre', title: 'Enviar orientações pré-operatórias', icon: FileCheck, required: true },
      { id: 'exames_solicitados', title: 'Confirmar exames solicitados', icon: Stethoscope, required: true },
      { id: 'exames_recebidos', title: 'Receber e conferir exames', icon: FileCheck, required: true },
      { id: 'lembrete_7dias', title: 'Lembrete 7 dias antes', icon: Bell },
      { id: 'lembrete_3dias', title: 'Lembrete 3 dias antes', icon: Bell },
      { id: 'lembrete_1dia', title: 'Lembrete véspera da cirurgia', icon: Bell, required: true },
      { id: 'confirmar_jejum', title: 'Confirmar jejum e horário', icon: Phone, required: true },
    ]
  },
  'pos_operatorio_recente': {
    stage_key: 'pos_operatorio_recente',
    stage_name: 'Pós-Operatório Recente',
    items: [
      { id: 'contato_24h', title: 'Contato 24h após cirurgia', icon: Phone, required: true },
      { id: 'contato_48h', title: 'Contato 48h após cirurgia', icon: Phone, required: true },
      { id: 'orientacoes_pos', title: 'Reforçar orientações pós-operatórias', icon: FileCheck, required: true },
      { id: 'agendar_retorno_7dias', title: 'Agendar retorno 7 dias', icon: Calendar, required: true },
      { id: 'fotos_evolucao', title: 'Solicitar fotos de evolução', icon: Camera },
    ]
  },
  'pos_operatorio_tardio': {
    stage_key: 'pos_operatorio_tardio',
    stage_name: 'Pós-Operatório Tardio',
    items: [
      { id: 'contato_30dias', title: 'Contato 30 dias', icon: Phone, required: true },
      { id: 'contato_60dias', title: 'Contato 60 dias', icon: Phone },
      { id: 'contato_90dias', title: 'Contato 90 dias', icon: Phone },
      { id: 'solicitar_depoimento', title: 'Solicitar depoimento/avaliação', icon: MessageSquare, required: true },
      { id: 'solicitar_nps', title: 'Enviar pesquisa NPS', icon: FileCheck, required: true },
      { id: 'fotos_resultado', title: 'Coletar fotos do resultado final', icon: Camera, required: true },
      { id: 'oferecer_novos', title: 'Apresentar novos procedimentos', icon: Heart },
    ]
  },
  'fidelizado': {
    stage_key: 'fidelizado',
    stage_name: 'Cliente Fidelizado',
    items: [
      { id: 'programa_indicacao', title: 'Cadastrar no programa de indicação', icon: Heart, required: true },
      { id: 'aniversario', title: 'Programar contato aniversário', icon: Calendar },
      { id: 'datas_especiais', title: 'Contato em datas especiais', icon: Bell },
      { id: 'novidades_procedimentos', title: 'Informar novidades/promoções', icon: MessageSquare },
    ]
  }
};

// Map stage names to checklist keys
const STAGE_NAME_TO_KEY: Record<string, string> = {
  'Novo Lead': 'novo_lead',
  'Qualificação': 'qualificacao',
  'Qualificado': 'qualificacao',
  'Agendamento': 'agendamento_consulta',
  'Consulta Agendada': 'agendamento_consulta',
  'Em Negociação': 'em_negociacao',
  'Negociação': 'em_negociacao',
  'Proposta Enviada': 'proposta_enviada',
  'Proposta': 'proposta_enviada',
  'Fechamento': 'fechamento',
  'Contrato': 'fechamento',
  'Pré-Operatório': 'pre_operatorio',
  'Pré-Op': 'pre_operatorio',
  'Pós-Operatório': 'pos_operatorio_recente',
  'Pós-Op Recente': 'pos_operatorio_recente',
  'Pós-Op Tardio': 'pos_operatorio_tardio',
  'Pós-Operatório Tardio': 'pos_operatorio_tardio',
  'Fidelizado': 'fidelizado',
  'Cliente': 'fidelizado',
};

interface CRMLeadChecklistProps {
  lead: CRMLead;
  stage: CRMStage | null;
  onSurgeryDateChange?: (date: string | null) => void;
}

interface ChecklistProgress {
  [key: string]: boolean;
}

export function CRMLeadChecklist({ lead, stage, onSurgeryDateChange }: CRMLeadChecklistProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [progress, setProgress] = useState<ChecklistProgress>({});
  const [loading, setLoading] = useState(true);
  const [surgeryDate, setSurgeryDate] = useState<string>(lead.surgery_date || '');

  // Get the checklist for current stage
  const stageKey = stage?.name ? STAGE_NAME_TO_KEY[stage.name] : null;
  const checklist = stageKey ? STAGE_CHECKLISTS[stageKey] : null;

  // Load checklist progress
  useEffect(() => {
    if (!lead.id || !stageKey) {
      setLoading(false);
      return;
    }

    const loadProgress = async () => {
      const { data, error } = await supabase
        .from('crm_lead_checklist_progress')
        .select('*')
        .eq('lead_id', lead.id)
        .eq('stage_key', stageKey);

      if (!error && data) {
        const progressMap: ChecklistProgress = {};
        data.forEach(item => {
          progressMap[`${stageKey}_${item.action_index}`] = item.completed;
        });
        setProgress(progressMap);
      }
      setLoading(false);
    };

    loadProgress();
  }, [lead.id, stageKey]);

  // Calculate surgery date alerts
  const getSurgeryDateAlert = () => {
    if (!lead.surgery_date) {
      return { type: 'warning', message: 'Data da cirurgia não definida!' };
    }
    
    const surgeryDateObj = new Date(lead.surgery_date);
    const today = new Date();
    const daysUntil = differenceInDays(surgeryDateObj, today);
    
    if (daysUntil < 0) {
      return { type: 'info', message: `Cirurgia realizada há ${Math.abs(daysUntil)} dias` };
    } else if (daysUntil === 0) {
      return { type: 'urgent', message: '🚨 Cirurgia é HOJE!' };
    } else if (daysUntil <= 3) {
      return { type: 'urgent', message: `⚠️ Cirurgia em ${daysUntil} dias!` };
    } else if (daysUntil <= 7) {
      return { type: 'warning', message: `Cirurgia em ${daysUntil} dias` };
    } else {
      return { type: 'normal', message: `Cirurgia em ${daysUntil} dias` };
    }
  };

  const handleToggleItem = async (itemIndex: number, itemId: string) => {
    if (!stageKey || !user) return;

    const key = `${stageKey}_${itemIndex}`;
    const newValue = !progress[key];

    // Optimistic update
    setProgress(prev => ({ ...prev, [key]: newValue }));

    try {
      if (newValue) {
        // Insert or update
        await supabase
          .from('crm_lead_checklist_progress')
          .upsert({
            lead_id: lead.id,
            stage_key: stageKey,
            action_index: itemIndex,
            completed: true,
            completed_by: user.id,
            completed_at: new Date().toISOString(),
          }, {
            onConflict: 'lead_id,stage_key,action_index'
          });
      } else {
        // Update to uncompleted
        await supabase
          .from('crm_lead_checklist_progress')
          .update({ completed: false, completed_by: null, completed_at: null })
          .eq('lead_id', lead.id)
          .eq('stage_key', stageKey)
          .eq('action_index', itemIndex);
      }
    } catch (error) {
      // Rollback on error
      setProgress(prev => ({ ...prev, [key]: !newValue }));
      toast({ title: 'Erro ao atualizar checklist', variant: 'destructive' });
    }
  };

  const handleSurgeryDateChange = async (newDate: string) => {
    setSurgeryDate(newDate);
    
    try {
      await supabase
        .from('crm_leads')
        .update({ surgery_date: newDate || null })
        .eq('id', lead.id);
      
      onSurgeryDateChange?.(newDate || null);
      toast({ title: 'Data da cirurgia atualizada' });
    } catch (error) {
      toast({ title: 'Erro ao atualizar data', variant: 'destructive' });
    }
  };

  // Calculate completion percentage
  const getCompletionPercentage = () => {
    if (!checklist) return 0;
    const completedCount = checklist.items.filter((_, i) => progress[`${stageKey}_${i}`]).length;
    return Math.round((completedCount / checklist.items.length) * 100);
  };

  const surgeryAlert = getSurgeryDateAlert();
  const completionPercentage = getCompletionPercentage();

  if (!checklist) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 text-center text-muted-foreground">
          <FileCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum checklist definido para este estágio</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileCheck className="w-4 h-4" />
            Checklist: {checklist.stage_name}
          </CardTitle>
          <Badge variant={completionPercentage === 100 ? 'default' : 'secondary'}>
            {completionPercentage}%
          </Badge>
        </div>
        <Progress value={completionPercentage} className="h-2 mt-2" />
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Surgery Date Section */}
        <div className={cn(
          "p-3 rounded-lg border",
          surgeryAlert.type === 'urgent' && "bg-red-500/10 border-red-500",
          surgeryAlert.type === 'warning' && "bg-yellow-500/10 border-yellow-500",
          surgeryAlert.type === 'normal' && "bg-muted",
          surgeryAlert.type === 'info' && "bg-blue-500/10 border-blue-500"
        )}>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className={cn(
              "w-4 h-4",
              surgeryAlert.type === 'urgent' && "text-red-500",
              surgeryAlert.type === 'warning' && "text-yellow-500"
            )} />
            <Label className="text-xs font-medium">Data da Cirurgia</Label>
          </div>
          
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={surgeryDate}
              onChange={(e) => handleSurgeryDateChange(e.target.value)}
              className="text-sm h-8"
            />
          </div>
          
          <p className={cn(
            "text-xs mt-2 font-medium",
            surgeryAlert.type === 'urgent' && "text-red-500",
            surgeryAlert.type === 'warning' && "text-yellow-500"
          )}>
            {surgeryAlert.message}
          </p>
        </div>

        {/* Checklist Items */}
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-2">
            {checklist.items.map((item, index) => {
              const isCompleted = progress[`${stageKey}_${index}`];
              const Icon = item.icon;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleToggleItem(index, item.id)}
                  className={cn(
                    "w-full flex items-start gap-3 p-2 rounded-lg border transition-all text-left",
                    isCompleted 
                      ? "bg-green-500/10 border-green-500/30" 
                      : "hover:bg-muted border-transparent"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className={cn(
                        "text-sm",
                        isCompleted && "line-through text-muted-foreground"
                      )}>
                        {item.title}
                      </span>
                      {item.required && !isCompleted && (
                        <Badge variant="outline" className="text-xs h-5 border-yellow-500 text-yellow-500">
                          Obrigatório
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.description}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {/* Required items warning */}
        {checklist.items.some((item, i) => item.required && !progress[`${stageKey}_${i}`]) && (
          <div className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded-lg text-yellow-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs">Existem itens obrigatórios pendentes</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
