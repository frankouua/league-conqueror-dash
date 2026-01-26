import { useState, useEffect } from 'react';
import { Loader2, User, Phone, Mail, MessageSquare, Tag, DollarSign, Search, UserPlus, Package, Check } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CRMStage, useCRMLeads } from '@/hooks/useCRM';
import { CRMPatientSearch } from './CRMPatientSearch';
import { useQuery } from '@tanstack/react-query';

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
  const [activeTab, setActiveTab] = useState<'new' | 'search'>('new');
  const [procedureSearch, setProcedureSearch] = useState('');
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    email: '',
    cpf: '',
    prontuario: '',
    source: 'manual',
    source_detail: '',
    stage_id: initialStageId || '',
    assigned_to: '',
    team_id: profile?.team_id || '',
    estimated_value: '',
    notes: '',
    tags: '',
    patient_data_id: null as string | null,
  });

  // Buscar procedimentos do banco
  const { data: procedures = [] } = useQuery({
    queryKey: ['procedures-for-new-lead'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('procedures')
        .select('id, name, price, category')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Filtrar procedimentos baseado na busca
  const filteredProcedures = procedures.filter(p =>
    p.name.toLowerCase().includes(procedureSearch.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(procedureSearch.toLowerCase()))
  );

  const toggleProcedure = (procedureName: string) => {
    setSelectedProcedures(prev =>
      prev.includes(procedureName)
        ? prev.filter(p => p !== procedureName)
        : [...prev, procedureName]
    );
  };

  useEffect(() => {
    if (initialStageId) {
      setFormData(prev => ({ ...prev, stage_id: initialStageId }));
    }
  }, [initialStageId]);

  useEffect(() => {
    if (!open) return;

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
  }, [open, profile?.team_id, role]);

  const handlePatientSelect = (patient: any) => {
    setFormData(prev => ({
      ...prev,
      name: patient.name,
      phone: patient.phone || '',
      whatsapp: patient.whatsapp || patient.phone || '',
      email: patient.email || '',
      cpf: patient.cpf || '',
      prontuario: patient.prontuario || '',
      patient_data_id: patient.id,
      source: patient.origin || 'manual',
    }));
    setActiveTab('new');
  };

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
      patient_data_id: formData.patient_data_id,
      cpf: formData.cpf || null,
      prontuario: formData.prontuario || null,
      interested_procedures: selectedProcedures.length > 0 ? selectedProcedures : null,
    } as any, {
      onSuccess: () => {
        onClose();
        setFormData({
          name: '',
          phone: '',
          whatsapp: '',
          email: '',
          cpf: '',
          prontuario: '',
          source: 'manual',
          source_detail: '',
          stage_id: '',
          assigned_to: '',
          team_id: profile?.team_id || '',
          estimated_value: '',
          notes: '',
          tags: '',
          patient_data_id: null,
        });
        setSelectedProcedures([]);
        setProcedureSearch('');
        setActiveTab('new');
      },
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      whatsapp: '',
      email: '',
      cpf: '',
      prontuario: '',
      source: 'manual',
      source_detail: '',
      stage_id: initialStageId || '',
      assigned_to: '',
      team_id: profile?.team_id || '',
      estimated_value: '',
      notes: '',
      tags: '',
      patient_data_id: null,
    });
    setSelectedProcedures([]);
    setProcedureSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'new' | 'search')}>
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="new" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Criar Novo
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-2">
              <Search className="h-4 w-4" />
              Buscar Paciente
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="mt-0">
            <CRMPatientSearch onSelectPatient={handlePatientSelect} />
          </TabsContent>

          <TabsContent value="new" className="mt-0">
            <div className="grid gap-4 py-2">
              {formData.patient_data_id && (
                <div className="flex items-center justify-between p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <span className="text-sm text-green-600">
                    ✓ Vinculado a paciente existente
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetForm}
                    className="text-xs"
                  >
                    Limpar
                  </Button>
                </div>
              )}

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
                    <WhatsAppIcon className="h-4 w-4" />
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

              {/* CPF & Prontuario */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prontuario">Prontuário</Label>
                  <Input
                    id="prontuario"
                    value={formData.prontuario}
                    onChange={(e) => setFormData(prev => ({ ...prev, prontuario: e.target.value }))}
                    placeholder="Número"
                  />
                </div>
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

              {/* Procedimentos de Interesse */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Procedimentos de Interesse
                </Label>
                
                {/* Procedimentos selecionados */}
                {selectedProcedures.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {selectedProcedures.map(proc => (
                      <Badge 
                        key={proc} 
                        variant="secondary" 
                        className="cursor-pointer hover:bg-destructive/20"
                        onClick={() => toggleProcedure(proc)}
                      >
                        {proc} ×
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Busca de procedimentos */}
                <Input
                  value={procedureSearch}
                  onChange={(e) => setProcedureSearch(e.target.value)}
                  placeholder="Buscar procedimentos..."
                  className="mb-2"
                />

                {/* Lista de procedimentos */}
                <ScrollArea className="h-32 border rounded-md p-2">
                  {filteredProcedures.length > 0 ? (
                    <div className="space-y-1">
                      {filteredProcedures.map(proc => (
                        <div 
                          key={proc.id}
                          className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                          onClick={() => toggleProcedure(proc.name)}
                        >
                          <Checkbox 
                            checked={selectedProcedures.includes(proc.name)}
                            onCheckedChange={() => toggleProcedure(proc.name)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{proc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {proc.category} • R$ {proc.price?.toLocaleString('pt-BR')}
                            </p>
                          </div>
                          {selectedProcedures.includes(proc.name) && (
                            <Check className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      {procedureSearch ? 'Nenhum procedimento encontrado' : 'Digite para buscar'}
                    </p>
                  )}
                </ScrollArea>
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
          </TabsContent>
        </Tabs>

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
