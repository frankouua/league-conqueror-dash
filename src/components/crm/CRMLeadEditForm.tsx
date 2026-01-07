import { useState, useEffect } from 'react';
import { Loader2, User, Phone, Mail, MessageSquare, Tag, DollarSign, Save, X, Target, FileText, Briefcase } from 'lucide-react';
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
import { CRMLead, CRMStage, useCRMLeads } from '@/hooks/useCRM';
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

const PROCEDURES = [
  'Lipoaspiração',
  'Abdominoplastia',
  'Mamoplastia',
  'Rinoplastia',
  'Bichectomia',
  'Lifting Facial',
  'Botox',
  'Preenchimento',
  'Harmonização Facial',
  'Prótese de Silicone',
  'Lipoescultura',
  'Blefaroplastia',
  'Otoplastia',
  'Gluteoplastia',
  'Ritidoplastia',
];

export function CRMLeadEditForm({ lead, stages, onClose }: CRMLeadEditFormProps) {
  const { toast } = useToast();
  const { profile, role } = useAuth();
  const { updateLead, moveLead } = useCRMLeads(lead.pipeline_id);

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [saving, setSaving] = useState(false);
  const [newTag, setNewTag] = useState('');
  
  const [formData, setFormData] = useState({
    name: lead.name || '',
    phone: lead.phone || '',
    whatsapp: lead.whatsapp || '',
    email: lead.email || '',
    cpf: lead.cpf || '',
    prontuario: lead.prontuario || '',
    source: lead.source || 'manual',
    source_detail: lead.source_detail || '',
    stage_id: lead.stage_id,
    assigned_to: lead.assigned_to || '',
    team_id: lead.team_id || '',
    estimated_value: lead.estimated_value?.toString() || '',
    contract_value: lead.contract_value?.toString() || '',
    notes: lead.notes || '',
    tags: lead.tags || [],
    interested_procedures: lead.interested_procedures || [],
    is_priority: lead.is_priority || false,
    // BANT Scores
    budget_score: lead.budget_score || 0,
    authority_score: lead.authority_score || 0,
    need_score: lead.need_score || 0,
    timing_score: lead.timing_score || 0,
  });

  useEffect(() => {
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
  }, [profile?.team_id, role]);

  const handleProcedureToggle = (procedure: string) => {
    setFormData(prev => ({
      ...prev,
      interested_procedures: prev.interested_procedures.includes(procedure)
        ? prev.interested_procedures.filter(p => p !== procedure)
        : [...prev.interested_procedures, procedure],
    }));
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

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
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
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
        contract_value: formData.contract_value ? parseFloat(formData.contract_value) : null,
        notes: formData.notes || null,
        tags: formData.tags.length > 0 ? formData.tags : null,
        interested_procedures: formData.interested_procedures.length > 0 ? formData.interested_procedures : null,
        is_priority: formData.is_priority,
        budget_score: formData.budget_score || null,
        authority_score: formData.authority_score || null,
        need_score: formData.need_score || null,
        timing_score: formData.timing_score || null,
      });

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
                value={formData.assigned_to}
                onValueChange={(v) => setFormData(prev => ({ ...prev, assigned_to: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem responsável</SelectItem>
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
                Valor Estimado
              </Label>
              <Input
                type="number"
                value={formData.estimated_value}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_value: e.target.value }))}
                placeholder="0"
              />
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

          {/* Procedures */}
          <div className="space-y-2 pt-2 border-t">
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Procedimentos de Interesse
            </Label>
            <div className="flex flex-wrap gap-2">
              {PROCEDURES.map(proc => (
                <Badge
                  key={proc}
                  variant={formData.interested_procedures.includes(proc) ? "default" : "outline"}
                  className="cursor-pointer transition-all hover:scale-105"
                  onClick={() => handleProcedureToggle(proc)}
                >
                  {proc}
                </Badge>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2 pt-2 border-t">
            <Label className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              Tags
            </Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Nova tag"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" variant="outline" onClick={addTag}>
                Adicionar
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2 pt-2 border-t">
            <Label>Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Informações adicionais sobre o lead..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
