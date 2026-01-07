import { useState, useEffect } from 'react';
import { Loader2, User, Phone, Mail, MessageSquare, Tag, DollarSign } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CRMStage, useCRMLeads } from '@/hooks/useCRM';

interface CRMNewLeadDialogProps {
  open: boolean;
  onClose: () => void;
  pipelineId: string;
  initialStageId?: string;
  stages: CRMStage[];
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
  { value: 'outro', label: 'Outro' },
];

export function CRMNewLeadDialog({
  open,
  onClose,
  pipelineId,
  initialStageId,
  stages,
}: CRMNewLeadDialogProps) {
  const { user, profile, role } = useAuth();
  const { createLead } = useCRMLeads(pipelineId);

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    email: '',
    source: 'manual',
    source_detail: '',
    stage_id: initialStageId || '',
    assigned_to: '',
    team_id: profile?.team_id || '',
    estimated_value: '',
    notes: '',
    tags: '',
  });

  useEffect(() => {
    if (initialStageId) {
      setFormData(prev => ({ ...prev, stage_id: initialStageId }));
    }
  }, [initialStageId]);

  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      // Fetch team members
      let membersQuery = supabase
        .from('profiles')
        .select('user_id, full_name')
        .order('full_name');

      if (role !== 'admin' && profile?.team_id) {
        membersQuery = membersQuery.eq('team_id', profile.team_id);
      }

      const { data: members } = await membersQuery;
      if (members) setTeamMembers(members);

      // Fetch teams for admins
      if (role === 'admin') {
        const { data: teamsData } = await supabase
          .from('teams')
          .select('id, name')
          .order('name');
        if (teamsData) setTeams(teamsData);
      }
    };

    fetchData();
  }, [open, profile?.team_id, role]);

  const handleSubmit = () => {
    if (!formData.name.trim()) return;

    const stageId = formData.stage_id || stages[0]?.id;
    if (!stageId) return;

    createLead.mutate({
      name: formData.name,
      phone: formData.phone || null,
      whatsapp: formData.whatsapp || null,
      email: formData.email || null,
      source: formData.source,
      source_detail: formData.source_detail || null,
      pipeline_id: pipelineId,
      stage_id: stageId,
      assigned_to: formData.assigned_to || null,
      team_id: formData.team_id || profile?.team_id || null,
      estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
      notes: formData.notes || null,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
    }, {
      onSuccess: () => {
        onClose();
        setFormData({
          name: '',
          phone: '',
          whatsapp: '',
          email: '',
          source: 'manual',
          source_detail: '',
          stage_id: '',
          assigned_to: '',
          team_id: profile?.team_id || '',
          estimated_value: '',
          notes: '',
          tags: '',
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Nome *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nome do lead"
            />
          </div>

          {/* Contact Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefone
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(00) 0000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                WhatsApp
              </Label>
              <Input
                id="whatsapp"
                value={formData.whatsapp}
                onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="email@exemplo.com"
            />
          </div>

          {/* Source Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Origem</Label>
              <Select
                value={formData.source}
                onValueChange={(v) => setFormData(prev => ({ ...prev, source: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="source_detail">Detalhe da Origem</Label>
              <Input
                id="source_detail"
                value={formData.source_detail}
                onChange={(e) => setFormData(prev => ({ ...prev, source_detail: e.target.value }))}
                placeholder="Nome do indicador, campanha..."
              />
            </div>
          </div>

          {/* Stage */}
          <div className="space-y-2">
            <Label>Estágio Inicial</Label>
            <Select
              value={formData.stage_id}
              onValueChange={(v) => setFormData(prev => ({ ...prev, stage_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o estágio" />
              </SelectTrigger>
              <SelectContent>
                {stages.map(stage => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignment Row */}
          <div className="grid grid-cols-2 gap-3">
            {role === 'admin' && (
              <div className="space-y-2">
                <Label>Time</Label>
                <Select
                  value={formData.team_id}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, team_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o time" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
                  {teamMembers.map(member => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Value */}
          <div className="space-y-2">
            <Label htmlFor="value" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Valor Estimado
            </Label>
            <Input
              id="value"
              type="number"
              value={formData.estimated_value}
              onChange={(e) => setFormData(prev => ({ ...prev, estimated_value: e.target.value }))}
              placeholder="0,00"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Tags (separadas por vírgula)
            </Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="lipo, abdominoplastia, vip"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Informações adicionais sobre o lead..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.name.trim() || createLead.isPending}
          >
            {createLead.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar Lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
