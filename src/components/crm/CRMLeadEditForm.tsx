import { useState } from 'react';
import { 
  Edit2, 
  Save, 
  X, 
  Phone, 
  Mail, 
  MessageSquare,
  DollarSign,
  User,
  Tag,
  Building
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CRMLead, CRMStage, useCRMLeads } from '@/hooks/useCRM';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface CRMLeadEditFormProps {
  lead: CRMLead;
  stages: CRMStage[];
  onClose: () => void;
}

const sourceOptions = [
  { value: 'indicacao', label: 'Indicação' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'google', label: 'Google' },
  { value: 'site', label: 'Site' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'evento', label: 'Evento' },
  { value: 'parceiro', label: 'Parceiro' },
  { value: 'outro', label: 'Outro' },
];

const procedureOptions = [
  'Rinoplastia',
  'Lipoaspiração',
  'Abdominoplastia',
  'Mamoplastia',
  'Blefaroplastia',
  'Lifting Facial',
  'Botox',
  'Preenchimento',
  'Harmonização Facial',
  'Otoplastia',
  'Ritidoplastia',
];

export function CRMLeadEditForm({ lead, stages, onClose }: CRMLeadEditFormProps) {
  const { toast } = useToast();
  const { updateLead, moveLead } = useCRMLeads(lead.pipeline_id);
  
  const [formData, setFormData] = useState({
    name: lead.name,
    email: lead.email || '',
    phone: lead.phone || '',
    whatsapp: lead.whatsapp || '',
    cpf: lead.cpf || '',
    source: lead.source || '',
    source_detail: lead.source_detail || '',
    estimated_value: lead.estimated_value || 0,
    notes: lead.notes || '',
    tags: lead.tags || [],
    interested_procedures: lead.interested_procedures || [],
    is_priority: lead.is_priority || false,
  });
  
  const [newTag, setNewTag] = useState('');
  const [selectedStage, setSelectedStage] = useState(lead.stage_id);

  const handleSubmit = async () => {
    try {
      // Update lead data
      await updateLead.mutateAsync({
        id: lead.id,
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        whatsapp: formData.whatsapp || null,
        cpf: formData.cpf || null,
        source: formData.source || null,
        source_detail: formData.source_detail || null,
        estimated_value: formData.estimated_value || null,
        notes: formData.notes || null,
        tags: formData.tags.length > 0 ? formData.tags : null,
        interested_procedures: formData.interested_procedures.length > 0 ? formData.interested_procedures : null,
        is_priority: formData.is_priority,
      });

      // Move to new stage if changed
      if (selectedStage !== lead.stage_id) {
        await moveLead.mutateAsync({
          leadId: lead.id,
          toStageId: selectedStage,
        });
      }

      toast({ title: 'Lead atualizado com sucesso!' });
      onClose();
    } catch (error: any) {
      toast({ 
        title: 'Erro ao atualizar lead', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
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

  const toggleProcedure = (procedure: string) => {
    setFormData(prev => ({
      ...prev,
      interested_procedures: prev.interested_procedures.includes(procedure)
        ? prev.interested_procedures.filter(p => p !== procedure)
        : [...prev.interested_procedures, procedure],
    }));
  };

  return (
    <Card className="border-primary/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Edit2 className="h-4 w-4" />
            Editar Lead
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={updateLead.isPending}
            >
              <Save className="h-4 w-4 mr-1" />
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
              Nome
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

        {/* Stage and Source */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Estágio</Label>
            <Select value={selectedStage} onValueChange={setSelectedStage}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {stages.map(stage => (
                  <SelectItem key={stage.id} value={stage.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
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
              value={formData.source || ''} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, source: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {sourceOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Value and Priority */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              Valor Estimado
            </Label>
            <Input
              type="number"
              value={formData.estimated_value}
              onChange={(e) => setFormData(prev => ({ ...prev, estimated_value: Number(e.target.value) }))}
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
              ⭐ {formData.is_priority ? 'Prioritário' : 'Marcar como Prioritário'}
            </Button>
          </div>
        </div>

        {/* Procedures */}
        <div className="space-y-2">
          <Label>Procedimentos de Interesse</Label>
          <div className="flex flex-wrap gap-2">
            {procedureOptions.map(proc => (
              <Badge
                key={proc}
                variant={formData.interested_procedures.includes(proc) ? "default" : "outline"}
                className="cursor-pointer transition-all hover:scale-105"
                onClick={() => toggleProcedure(proc)}
              >
                {proc}
              </Badge>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
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
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Notas</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Observações sobre o lead..."
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
}
