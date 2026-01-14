import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, User, Phone, Mail, MessageSquare, Tag, DollarSign, Save, X, Target, FileText, Briefcase, Thermometer, Syringe, Package, Route, Search, Sparkles, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CRMLead, CRMStage, useCRMLeads, LeadTemperature } from '@/hooks/useCRM';
import { CRMTemperatureSelector } from './CRMTemperatureBadge';
import { CRMClearNegotiationDialog } from './CRMClearNegotiationDialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CRMLeadEditFormProps {
  lead: CRMLead;
  stages: CRMStage[];
  onClose: () => void;
}

interface TeamMember {
  user_id: string;
  full_name: string;
}

interface Team {
  id: string;
  name: string;
}

const SOURCES = [
  { value: 'manual', label: 'Entrada Manual' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'campanha', label: 'Campanha' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'google', label: 'Google' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'presencial', label: 'Presencial' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'site', label: 'Site' },
  { value: 'evento', label: 'Evento' },
  { value: 'parceiro', label: 'Parceiro' },
  { value: 'outro', label: 'Outro' },
];

interface Protocol {
  id: string;
  name: string;
  price: number;
  promotional_price: number | null;
  protocol_type: string;
  is_active: boolean;
}

interface Procedure {
  id: string;
  name: string;
  category: string;
  price: number;
  promotional_price: number | null;
}

const PROTOCOL_TYPE_ICONS: Record<string, any> = {
  procedimento: Syringe,
  pacote: Package,
  jornada: Route,
};

const CATEGORY_LABELS: Record<string, string> = {
  cirurgia: 'Cirurgias',
  consulta: 'Consultas',
  genetica: 'Genética',
  implantes: 'Implantes',
  injetaveis: 'Injetáveis',
  soroterapia: 'Soroterapia',
  laser: 'Laser',
  estetica: 'Estética',
  outros: 'Outros',
};

// Predefined tags organized by category
const PREDEFINED_TAGS = {
  'Perfil': [
    'VIP', 'Primeira consulta', 'Retorno', 'Indicação', 'Influenciador',
    'Paciente antigo', 'Lead qualificado', 'Lead frio'
  ],
  'Interesse': [
    'Interessado em cirurgia', 'Interessado em procedimentos', 'Pesquisando preços',
    'Comparando clínicas', 'Urgente', 'Agendamento pendente'
  ],
  'Financeiro': [
    'Orçamento aprovado', 'Aguardando financiamento', 'Pagamento à vista',
    'Parcelamento', 'Restrição financeira', 'Alto valor'
  ],
  'Status': [
    'Aguardando retorno', 'Sem resposta', 'Reagendar', 'Documentação pendente',
    'Exames pendentes', 'Liberado para cirurgia', 'Pré-operatório'
  ],
  'Origem': [
    'Instagram', 'Facebook', 'Google', 'Indicação médica', 'Indicação paciente',
    'Evento', 'Parceiro'
  ]
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export function CRMLeadEditForm({ lead, stages, onClose }: CRMLeadEditFormProps) {
  const { toast } = useToast();
  const { profile, role } = useAuth();
  const { updateLead, moveLead } = useCRMLeads(lead?.pipeline_id || '');

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [saving, setSaving] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [procedureSearch, setProcedureSearch] = useState('');
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [pendingProcedureRemoval, setPendingProcedureRemoval] = useState<string | null>(null);

  // Fetch protocols from database
  const { data: protocols = [], isLoading: loadingProtocols } = useQuery({
    queryKey: ['protocols-for-crm'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('protocols')
        .select('id, name, price, promotional_price, protocol_type, is_active')
        .eq('is_active', true)
        .order('protocol_type')
        .order('name');
      
      if (error) throw error;
      return data as Protocol[];
    },
  });

  // Fetch individual procedures from database
  const { data: procedures = [], isLoading: loadingProcedures } = useQuery({
    queryKey: ['procedures-for-crm'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('procedures')
        .select('id, name, category, price, promotional_price')
        .eq('is_active', true)
        .order('category')
        .order('name');
      
      if (error) throw error;
      return data as Procedure[];
    },
  });
  
  const [formData, setFormData] = useState({
    name: lead?.name || '',
    phone: lead?.phone || '',
    whatsapp: lead?.whatsapp || '',
    email: lead?.email || '',
    cpf: lead?.cpf || '',
    prontuario: lead?.prontuario || '',
    source: lead?.source || 'manual',
    source_detail: lead?.source_detail || '',
    stage_id: lead?.stage_id || '',
    assigned_to: lead?.assigned_to || '',
    team_id: lead?.team_id || '',
    estimated_value: lead?.estimated_value?.toString() || '',
    contract_value: lead?.contract_value?.toString() || '',
    notes: lead?.notes || '',
    tags: lead?.tags || [],
    interested_procedures: lead?.interested_procedures || [],
    is_priority: lead?.is_priority || false,
    temperature: lead?.temperature || 'warm' as LeadTemperature,
    // BANT Scores
    budget_score: lead?.budget_score || 0,
    authority_score: lead?.authority_score || 0,
    need_score: lead?.need_score || 0,
    timing_score: lead?.timing_score || 0,
    // Discount and payment fields
    discount_percentage: lead?.discount_percentage?.toString() || '',
    discount_amount: lead?.discount_amount?.toString() || '',
    payment_method: lead?.payment_method || '',
    payment_installments: lead?.payment_installments?.toString() || '',
  });

  // Track if user manually overrode the value
  const [isValueManuallySet, setIsValueManuallySet] = useState(false);

  // Normalize labels like "Com 100 - Abdominoplastia" -> "Abdominoplastia"
  const normalizeProcedureName = (name: string) =>
    name.replace(/^\s*Com\s*\d+\s*-\s*/i, '').trim();

  // Calculate expected value based on selected procedures
  const computeSelectedTotal = useMemo(() => {
    return (selected: string[]) => {
      if (!selected.length) return 0;

      const protocolPriceByName = new Map(
        protocols.map(p => [p.name, (p.promotional_price || p.price) as number])
      );
      const procedurePriceByName = new Map(
        procedures.map(p => [p.name, (p.promotional_price || p.price) as number])
      );

      const getPrice = (name: string) => {
        const raw = name.trim();
        const normalized = normalizeProcedureName(raw);
        return (
          procedurePriceByName.get(raw) ??
          procedurePriceByName.get(normalized) ??
          protocolPriceByName.get(raw) ??
          protocolPriceByName.get(normalized) ??
          0
        );
      };

      return selected.reduce((sum, name) => sum + getPrice(name), 0);
    };
  }, [protocols, procedures]);

  // Calculate current computed value based on selected procedures
  const currentComputedValue = useMemo(() => {
    return computeSelectedTotal(formData.interested_procedures);
  }, [formData.interested_procedures, computeSelectedTotal]);

  // Determine initial mode: if saved value differs significantly from computed, user had overridden
  useEffect(() => {
    if (!lead || protocols.length === 0 && procedures.length === 0) return;
    
    const savedValue = lead.estimated_value || 0;
    const computedFromSavedProcedures = computeSelectedTotal(lead.interested_procedures || []);
    
    // If there's a significant difference, user had manually set a value
    // Allow for small floating point differences
    if (Math.abs(savedValue - computedFromSavedProcedures) > 1) {
      setIsValueManuallySet(true);
    }
  }, [lead, protocols, procedures, computeSelectedTotal]);

  useEffect(() => {
    if (!lead) return;
    
    const fetchData = async () => {
      let membersQuery = supabase
        .from('profiles')
        .select('user_id, full_name')
        .order('full_name');

      if (role !== 'admin' && profile?.team_id) {
        membersQuery = membersQuery.eq('team_id', profile.team_id);
      }

      const { data: members } = await membersQuery;
      if (members) setTeamMembers(members);

      if (role === 'admin') {
        const { data: teamsData } = await supabase
          .from('teams')
          .select('id, name')
          .order('name');
        if (teamsData) setTeams(teamsData);
      }
    };

    fetchData();
  }, [lead, profile?.team_id, role]);

  // Guard against missing lead - MUST be after all hooks
  if (!lead) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Lead não encontrado</p>
        <Button variant="outline" onClick={onClose} className="mt-4">
          Voltar
        </Button>
      </Card>
    );
  }

  const handleProcedureToggle = (procedure: string) => {
    const isCurrentlySelected = formData.interested_procedures.includes(procedure);
    
    // If removing the last procedure, show confirmation dialog
    if (isCurrentlySelected && formData.interested_procedures.length === 1) {
      const currentValue = parseFloat(formData.estimated_value) || currentComputedValue;
      if (currentValue > 0) {
        setPendingProcedureRemoval(procedure);
        setShowClearDialog(true);
        return;
      }
    }

    // Normal toggle logic
    setFormData(prev => {
      const newProcedures = isCurrentlySelected
        ? prev.interested_procedures.filter(p => p !== procedure)
        : [...prev.interested_procedures, procedure];

      const computedTotal = computeSelectedTotal(newProcedures);

      return {
        ...prev,
        interested_procedures: newProcedures,
        // If user hasn't manually set value, keep synced with procedures
        estimated_value: isValueManuallySet
          ? prev.estimated_value
          : computedTotal.toString(),
      };
    });
  };

  const handleClearValueConfirm = () => {
    if (pendingProcedureRemoval) {
      setFormData(prev => ({
        ...prev,
        interested_procedures: prev.interested_procedures.filter(p => p !== pendingProcedureRemoval),
        estimated_value: '0',
      }));
      setIsValueManuallySet(false);
    }
    setPendingProcedureRemoval(null);
    setShowClearDialog(false);
  };

  const handleKeepValue = () => {
    if (pendingProcedureRemoval) {
      setFormData(prev => ({
        ...prev,
        interested_procedures: prev.interested_procedures.filter(p => p !== pendingProcedureRemoval),
        // Keep the current value
      }));
      setIsValueManuallySet(true);
    }
    setPendingProcedureRemoval(null);
    setShowClearDialog(false);
  };

  const handleValueChange = (value: string) => {
    setIsValueManuallySet(true);
    setFormData(prev => ({ ...prev, estimated_value: value }));
  };

  const handleResetToComputed = () => {
    setIsValueManuallySet(false);
    setFormData(prev => ({
      ...prev,
      estimated_value: computeSelectedTotal(prev.interested_procedures).toString(),
    }));
    toast({ title: 'Valor resetado', description: 'O valor agora segue os procedimentos selecionados.' });
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  // Determine what value to save
  const getValueToSave = () => {
    if (isValueManuallySet) {
      return formData.estimated_value ? parseFloat(formData.estimated_value) : 0;
    }
    return computeSelectedTotal(formData.interested_procedures);
  };

  // Get display value for the form
  const getDisplayValue = () => {
    if (isValueManuallySet) {
      return parseFloat(formData.estimated_value) || 0;
    }
    return currentComputedValue;
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const valueToSave = getValueToSave();

      // Log negotiation change to history if value or procedures changed
      const oldValue = lead.estimated_value || 0;
      const oldProcedures = lead.interested_procedures || [];
      const proceduresChanged = JSON.stringify(oldProcedures.sort()) !== JSON.stringify(formData.interested_procedures.sort());
      const valueChanged = Math.abs(oldValue - valueToSave) > 0.01;

      await updateLead.mutateAsync({
        id: lead.id,
        name: formData.name,
        phone: formData.phone || null,
        whatsapp: formData.whatsapp || null,
        email: formData.email || null,
        cpf: formData.cpf || null,
        prontuario: formData.prontuario || null,
        source: formData.source,
        source_detail: formData.source_detail || null,
        assigned_to: formData.assigned_to || null,
        team_id: formData.team_id || null,
        estimated_value: valueToSave,
        contract_value: formData.contract_value ? parseFloat(formData.contract_value) : null,
        notes: formData.notes || null,
        tags: formData.tags.length > 0 ? formData.tags : null,
        interested_procedures: formData.interested_procedures.length > 0 ? formData.interested_procedures : null,
        is_priority: formData.is_priority,
        temperature: formData.temperature,
        budget_score: formData.budget_score || null,
        authority_score: formData.authority_score || null,
        need_score: formData.need_score || null,
        timing_score: formData.timing_score || null,
        // Discount and payment fields
        discount_percentage: formData.discount_percentage ? parseFloat(formData.discount_percentage) : null,
        discount_amount: formData.discount_amount ? parseFloat(formData.discount_amount) : null,
        payment_method: formData.payment_method || null,
        payment_installments: formData.payment_installments ? parseInt(formData.payment_installments) : null,
      });

      // Log negotiation change if there were changes
      if (proceduresChanged || valueChanged) {
        try {
          await supabase.from('crm_lead_history').insert({
            lead_id: lead.id,
            action_type: 'negotiation_change',
            performed_by: profile?.user_id,
            old_value: JSON.stringify({
              procedures: oldProcedures,
              value: oldValue,
            }),
            new_value: JSON.stringify({
              procedures: formData.interested_procedures,
              value: valueToSave,
            }),
            description: `Negociação atualizada: ${formatCurrency(valueToSave)} (${formData.interested_procedures.length} procedimentos)`,
          });
        } catch (e) {
          console.warn('Could not log negotiation change:', e);
        }
      }

      // Move to new stage if changed
      if (formData.stage_id !== lead.stage_id) {
        await moveLead.mutateAsync({
          leadId: lead.id,
          toStageId: formData.stage_id,
        });
      }

      toast({ title: 'Lead atualizado com sucesso!' });
      onClose();
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar lead', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Header Actions */}
        <Card className="border-primary/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                Editar Lead
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSubmit} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  Salvar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Nome *
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome do lead"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  E-mail
                </Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  Telefone
                </Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  WhatsApp
                </Label>
                <Input
                  value={formData.whatsapp}
                  onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            {/* CPF and Prontuario */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input
                  value={formData.cpf}
                  onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                  placeholder="000.000.000-00"
                />
              </div>
              <div className="space-y-2">
                <Label>Prontuário</Label>
                <Input
                  value={formData.prontuario}
                  onChange={(e) => setFormData(prev => ({ ...prev, prontuario: e.target.value }))}
                  placeholder="Número do prontuário"
                />
              </div>
            </div>

            {/* Stage and Source */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estágio</Label>
                <Select value={formData.stage_id} onValueChange={(v) => setFormData(prev => ({ ...prev, stage_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map(stage => (
                      <SelectItem key={stage.id} value={stage.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                          {stage.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Origem</Label>
                <Select 
                  value={formData.source} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, source: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCES.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Source Detail & Assignment */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Detalhe da Origem</Label>
                <Input
                  value={formData.source_detail}
                  onChange={(e) => setFormData(prev => ({ ...prev, source_detail: e.target.value }))}
                  placeholder="Nome indicador, campanha..."
                />
              </div>
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Select
                  value={formData.assigned_to || '__none__'}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, assigned_to: v === '__none__' ? '' : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem responsável</SelectItem>
                    {teamMembers.map(member => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Value and Priority */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  Valor da Oportunidade
                  {isValueManuallySet && (
                    <Badge variant="outline" className="text-[10px] ml-1 text-yellow-600 border-yellow-500">
                      Manual
                    </Badge>
                  )}
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={formData.estimated_value}
                    onChange={(e) => handleValueChange(e.target.value)}
                    placeholder="0"
                    className={cn(isValueManuallySet && "border-yellow-500")}
                  />
                  {isValueManuallySet && formData.interested_procedures.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleResetToComputed}
                      title="Resetar para valor calculado"
                      className="shrink-0"
                    >
                      <Target className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {isValueManuallySet && formData.interested_procedures.length > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    Valor calculado: {formatCurrency(currentComputedValue)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Valor Contrato</Label>
                <Input
                  type="number"
                  value={formData.contract_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, contract_value: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Button
                  type="button"
                  variant={formData.is_priority ? "default" : "outline"}
                  className={cn(
                    "w-full justify-start",
                    formData.is_priority && "bg-yellow-500 hover:bg-yellow-600"
                  )}
                  onClick={() => setFormData(prev => ({ ...prev, is_priority: !prev.is_priority }))}
                >
                  ⭐ {formData.is_priority ? 'Prioritário' : 'Marcar Prioritário'}
                </Button>
              </div>
            </div>

            {/* Discount and Payment - NEGOTIATION CONDITIONS */}
            <div className="space-y-3 pt-2 border-t">
              <Label className="flex items-center gap-2 text-green-600">
                <DollarSign className="h-4 w-4" />
                Condições da Negociação
              </Label>
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Desconto %</Label>
                  <Input
                    type="number"
                    value={formData.discount_percentage}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_percentage: e.target.value }))}
                    placeholder="0"
                    min="0"
                    max="100"
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Desconto R$</Label>
                  <Input
                    type="number"
                    value={formData.discount_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_amount: e.target.value }))}
                    placeholder="0"
                    min="0"
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Forma Pgto</Label>
                  <Select
                    value={formData.payment_method || '__none__'}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, payment_method: v === '__none__' ? '' : v }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Não definido</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="credit_card">Cartão Crédito</SelectItem>
                      <SelectItem value="debit">Cartão Débito</SelectItem>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                      <SelectItem value="financing">Financiamento</SelectItem>
                      <SelectItem value="installment">Parcelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Parcelas</Label>
                  <Input
                    type="number"
                    value={formData.payment_installments}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_installments: e.target.value }))}
                    placeholder="1"
                    min="1"
                    max="48"
                    className="h-8"
                  />
                </div>
              </div>
            </div>

            {/* Temperature */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="flex items-center gap-2">
                <Thermometer className="h-4 w-4" />
                Temperatura do Lead
              </Label>
              <CRMTemperatureSelector
                value={formData.temperature}
                onChange={(temp) => setFormData(prev => ({ ...prev, temperature: temp }))}
              />
            </div>

            {/* BANT Qualification */}
            <div className="space-y-3 pt-2 border-t">
              <Label className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Qualificação BANT
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Budget (Orçamento)</span>
                    <span className="font-medium">{formData.budget_score}/10</span>
                  </div>
                  <Slider
                    value={[formData.budget_score]}
                    onValueChange={([v]) => setFormData(prev => ({ ...prev, budget_score: v }))}
                    max={10}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Authority (Autoridade)</span>
                    <span className="font-medium">{formData.authority_score}/10</span>
                  </div>
                  <Slider
                    value={[formData.authority_score]}
                    onValueChange={([v]) => setFormData(prev => ({ ...prev, authority_score: v }))}
                    max={10}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Need (Necessidade)</span>
                    <span className="font-medium">{formData.need_score}/10</span>
                  </div>
                  <Slider
                    value={[formData.need_score]}
                    onValueChange={([v]) => setFormData(prev => ({ ...prev, need_score: v }))}
                    max={10}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Timing (Urgência)</span>
                    <span className="font-medium">{formData.timing_score}/10</span>
                  </div>
                  <Slider
                    value={[formData.timing_score]}
                    onValueChange={([v]) => setFormData(prev => ({ ...prev, timing_score: v }))}
                    max={10}
                    step={1}
                  />
                </div>
              </div>
            </div>

            {/* Procedures from Database - NEGOTIATION SECTION */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Procedimentos de Interesse
                  {(loadingProtocols || loadingProcedures) && <Loader2 className="h-3 w-3 animate-spin" />}
                </Label>
                
                {/* NEGOTIATION VALUE - HIGHLIGHTED */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-500/20 to-emerald-500/10 rounded-lg border-2 border-green-500/40">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium text-muted-foreground">Oportunidade:</span>
                  <span className="text-lg font-black text-green-600">
                    {formatCurrency(getDisplayValue())}
                  </span>
                  {formData.interested_procedures.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {formData.interested_procedures.length} itens
                    </Badge>
                  )}
                  {isValueManuallySet && (
                    <Badge variant="outline" className="text-[10px] text-yellow-600 border-yellow-500">
                      <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                      Manual
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Empty state warning */}
              {formData.interested_procedures.length === 0 && getDisplayValue() === 0 && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Nenhum procedimento selecionado. Selecione os procedimentos de interesse do cliente.
                </div>
              )}
              
              {/* Search/Filter Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={procedureSearch}
                  onChange={(e) => setProcedureSearch(e.target.value)}
                  placeholder="Buscar procedimento..."
                  className="pl-9"
                />
              </div>
              
              {(protocols.length === 0 && procedures.length === 0) && !loadingProtocols && !loadingProcedures ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum procedimento cadastrado.
                </p>
              ) : (
                <div className="space-y-4 max-h-80 overflow-y-auto pr-2 scrollbar-thin">
                  {/* Individual Procedures by Category */}
                  {procedures.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-xs font-semibold text-primary uppercase tracking-wide">
                        Procedimentos Individuais ({procedures.filter(p => p.name.toLowerCase().includes(procedureSearch.toLowerCase())).length})
                      </div>
                      {Object.keys(CATEGORY_LABELS).map(category => {
                        const categoryProcedures = procedures.filter(p => 
                          p.category === category && 
                          p.name.toLowerCase().includes(procedureSearch.toLowerCase())
                        );
                        if (categoryProcedures.length === 0) return null;
                        
                        return (
                          <div key={category} className="space-y-2">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium sticky top-0 bg-card py-1">
                              <Syringe className="h-3 w-3" />
                              {CATEGORY_LABELS[category] || category} ({categoryProcedures.length})
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {categoryProcedures.map(proc => {
                                const isSelected = formData.interested_procedures.includes(proc.name);
                                const displayPrice = proc.promotional_price || proc.price;
                                const hasPromo = proc.promotional_price && proc.promotional_price < proc.price;
                                
                                return (
                                  <Badge
                                    key={proc.id}
                                    variant={isSelected ? "default" : "outline"}
                                    className={cn(
                                      "cursor-pointer transition-all hover:scale-105 gap-1.5 py-1.5",
                                      isSelected && "ring-2 ring-primary/50"
                                    )}
                                    onClick={() => handleProcedureToggle(proc.name)}
                                  >
                                    <span className="font-medium">{proc.name}</span>
                                    <span className={cn(
                                      "text-[10px]",
                                      isSelected ? "text-primary-foreground/80" : "text-muted-foreground",
                                      hasPromo && "text-green-500"
                                    )}>
                                      {hasPromo && <span className="line-through mr-1 text-muted-foreground/50">{formatCurrency(proc.price)}</span>}
                                      {formatCurrency(displayPrice)}
                                    </span>
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Protocols/Packages Section */}
                  {protocols.length > 0 && (
                    <div className="space-y-3 pt-3 border-t">
                      <div className="text-xs font-semibold text-primary uppercase tracking-wide">
                        Pacotes & Protocolos ({protocols.filter(p => p.name.toLowerCase().includes(procedureSearch.toLowerCase())).length})
                      </div>
                      {['procedimento', 'pacote', 'jornada'].map(type => {
                        const typeProtocols = protocols.filter(p => 
                          p.protocol_type === type && 
                          p.name.toLowerCase().includes(procedureSearch.toLowerCase())
                        );
                        if (typeProtocols.length === 0) return null;
                        
                        const TypeIcon = PROTOCOL_TYPE_ICONS[type] || FileText;
                        const typeLabel = type === 'procedimento' ? 'Protocolos' : 
                                         type === 'pacote' ? 'Pacotes' : 'Jornadas';
                        
                        return (
                          <div key={type} className="space-y-2">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium sticky top-0 bg-card py-1">
                              <TypeIcon className="h-3 w-3" />
                              {typeLabel} ({typeProtocols.length})
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {typeProtocols.map(protocol => {
                                const isSelected = formData.interested_procedures.includes(protocol.name);
                                const displayPrice = protocol.promotional_price || protocol.price;
                                const hasPromo = protocol.promotional_price && protocol.promotional_price < protocol.price;
                                
                                return (
                                  <Badge
                                    key={protocol.id}
                                    variant={isSelected ? "default" : "outline"}
                                    className={cn(
                                      "cursor-pointer transition-all hover:scale-105 gap-1.5 py-1.5",
                                      isSelected && "ring-2 ring-primary/50"
                                    )}
                                    onClick={() => handleProcedureToggle(protocol.name)}
                                  >
                                    <span className="font-medium">{protocol.name}</span>
                                    <span className={cn(
                                      "text-[10px]",
                                      isSelected ? "text-primary-foreground/80" : "text-muted-foreground",
                                      hasPromo && "text-green-500"
                                    )}>
                                      {hasPromo && <span className="line-through mr-1 text-muted-foreground/50">{formatCurrency(protocol.price)}</span>}
                                      {formatCurrency(displayPrice)}
                                    </span>
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* No results message */}
                  {procedureSearch && 
                    protocols.filter(p => p.name.toLowerCase().includes(procedureSearch.toLowerCase())).length === 0 &&
                    procedures.filter(p => p.name.toLowerCase().includes(procedureSearch.toLowerCase())).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum procedimento encontrado para "{procedureSearch}"
                    </p>
                  )}
                </div>
              )}
              
              {/* Show selected procedures summary */}
              {formData.interested_procedures.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{formData.interested_procedures.length} procedimento(s) selecionado(s)</span>
                    <span className="text-primary font-bold">
                      {formatCurrency(currentComputedValue)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {formData.interested_procedures.map(proc => (
                      <Badge 
                        key={proc} 
                        variant="secondary" 
                        className="text-xs cursor-pointer hover:bg-destructive/20"
                        onClick={() => handleProcedureToggle(proc)}
                      >
                        {proc}
                        <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-3 pt-2 border-t">
              <Label className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                Tags
              </Label>
              
              {/* Selected Tags */}
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-muted/50 rounded-lg">
                  {formData.tags.map(tag => (
                    <Badge key={tag} variant="default" className="gap-1 py-1">
                      <Check className="h-3 w-3" />
                      {tag}
                      <button onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              
              {/* AI Suggested Tags */}
              {formData.interested_procedures.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-yellow-500" />
                    Sugestões baseadas nos procedimentos
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {['Interessado em cirurgia', 'Lead qualificado', 'Orçamento aprovado'].map(tag => (
                      !formData.tags.includes(tag) && (
                        <Badge 
                          key={tag}
                          variant="outline" 
                          className="cursor-pointer hover:bg-primary/10 text-xs"
                          onClick={() => setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }))}
                        >
                          + {tag}
                        </Badge>
                      )
                    ))}
                  </div>
                </div>
              )}
              
              {/* Predefined Tags by Category */}
              <div className="space-y-2">
                {Object.entries(PREDEFINED_TAGS).map(([category, tags]) => (
                  <div key={category} className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">{category}</p>
                    <div className="flex flex-wrap gap-1">
                      {tags.map(tag => (
                        !formData.tags.includes(tag) && (
                          <Badge 
                            key={tag}
                            variant="outline" 
                            className="cursor-pointer hover:bg-primary/10 text-xs"
                            onClick={() => setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }))}
                          >
                            + {tag}
                          </Badge>
                        )
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Custom Tag Input */}
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Adicionar tag personalizada..."
                  onKeyDown={(e) => e.key === 'Enter' && addTag()}
                  className="text-sm"
                />
                <Button type="button" size="sm" onClick={addTag}>
                  Adicionar
                </Button>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2 pt-2 border-t">
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notas sobre o lead..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Sticky Footer for Mobile */}
        <div className="sticky bottom-0 p-4 bg-background border-t md:hidden">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </div>
        </div>
      </div>

      {/* Clear Negotiation Dialog */}
      <CRMClearNegotiationDialog
        open={showClearDialog}
        onOpenChange={setShowClearDialog}
        currentValue={parseFloat(formData.estimated_value) || currentComputedValue}
        onConfirmClear={handleClearValueConfirm}
        onKeepValue={handleKeepValue}
      />
    </>
  );
}
