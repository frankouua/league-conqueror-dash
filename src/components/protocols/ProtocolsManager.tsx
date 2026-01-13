import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus, Edit2, Trash2, Loader2, Search, Star, Syringe,
  Package, Route, Clock, Users, Gift, MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Protocol {
  id: string;
  name: string;
  description: string | null;
  protocol_type: string;
  price: number;
  promotional_price: number | null;
  target_segments: string[];
  sales_script: string | null;
  is_active: boolean;
  is_featured: boolean;
  recurrence_days: number | null;
  recurrence_type: string | null;
  recurrence_script: string | null;
  referral_bonus: number;
  referral_script: string | null;
  loyalty_points: number;
}

const PROTOCOL_TYPES = [
  { value: 'procedimento', label: 'Procedimento', icon: Syringe },
  { value: 'pacote', label: 'Pacote', icon: Package },
  { value: 'jornada', label: 'Jornada', icon: Route },
];

const RECURRENCE_TYPES = [
  { value: 'hormonal', label: 'Hormonal (6 meses)', days: 180 },
  { value: 'aesthetic_short', label: 'Estético Curto (4 meses)', days: 120 },
  { value: 'aesthetic_long', label: 'Estético Longo (12 meses)', days: 365 },
  { value: 'wellness', label: 'Bem-estar (14 dias)', days: 14 },
  { value: 'skincare', label: 'Skincare (30 dias)', days: 30 },
];

const SEGMENTS = [
  { value: 'champions', label: 'Champions' },
  { value: 'loyal', label: 'Loyal' },
  { value: 'potential', label: 'Potential' },
  { value: 'at_risk', label: 'At Risk' },
  { value: 'new', label: 'Novos' },
];

const emptyProtocol: Partial<Protocol> = {
  name: '',
  description: '',
  protocol_type: 'procedimento',
  price: 0,
  promotional_price: null,
  target_segments: [],
  sales_script: '',
  is_active: true,
  is_featured: false,
  recurrence_days: null,
  recurrence_type: null,
  recurrence_script: '',
  referral_bonus: 0,
  referral_script: '',
  loyalty_points: 0,
};

export function ProtocolsManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<Protocol | null>(null);
  const [formData, setFormData] = useState<Partial<Protocol>>(emptyProtocol);

  // Fetch protocols
  const { data: protocols = [], isLoading } = useQuery({
    queryKey: ['protocols-manager'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('protocols')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Protocol[];
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Protocol>) => {
      const { recurrence_days, recurrence_type, recurrence_script, referral_bonus, referral_script, loyalty_points, ...baseData } = data;
      if (editingProtocol) {
        const { error } = await supabase
          .from('protocols')
          .update(baseData)
          .eq('id', editingProtocol.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('protocols')
          .insert({ ...data, created_by: user?.id || '' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingProtocol ? 'Protocolo atualizado!' : 'Protocolo criado!');
      queryClient.invalidateQueries({ queryKey: ['protocols-manager'] });
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('protocols').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Protocolo excluído!');
      queryClient.invalidateQueries({ queryKey: ['protocols-manager'] });
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleOpenNew = () => {
    setEditingProtocol(null);
    setFormData(emptyProtocol);
    setShowDialog(true);
  };

  const handleEdit = (protocol: Protocol) => {
    setEditingProtocol(protocol);
    setFormData(protocol);
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingProtocol(null);
    setFormData(emptyProtocol);
  };

  const handleRecurrenceTypeChange = (type: string) => {
    const config = RECURRENCE_TYPES.find(t => t.value === type);
    setFormData(prev => ({
      ...prev,
      recurrence_type: type,
      recurrence_days: config?.days || null,
    }));
  };

  const handleSegmentToggle = (segment: string) => {
    const current = formData.target_segments || [];
    const updated = current.includes(segment)
      ? current.filter(s => s !== segment)
      : [...current, segment];
    setFormData(prev => ({ ...prev, target_segments: updated }));
  };

  const handleSave = () => {
    if (!formData.name?.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    saveMutation.mutate(formData);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const filteredProtocols = protocols.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeIcon = (type: string) => {
    const config = PROTOCOL_TYPES.find(t => t.value === type);
    return config?.icon || Syringe;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Gerenciar Protocolos
          </h2>
          <p className="text-muted-foreground">
            Configure protocolos com recorrência, indicação e fidelidade
          </p>
        </div>
        <Button onClick={handleOpenNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Protocolo
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar protocolo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <Card>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Recorrência</TableHead>
                  <TableHead>Indicação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProtocols.map((protocol) => {
                  const TypeIcon = getTypeIcon(protocol.protocol_type);
                  return (
                    <TableRow key={protocol.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {protocol.is_featured && (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          )}
                          <div>
                            <div className="font-medium">{protocol.name}</div>
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {protocol.description || 'Sem descrição'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <TypeIcon className="h-3 w-3" />
                          {PROTOCOL_TYPES.find(t => t.value === protocol.protocol_type)?.label || protocol.protocol_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{formatCurrency(protocol.price)}</div>
                          {protocol.promotional_price && (
                            <div className="text-sm text-emerald-600">
                              {formatCurrency(protocol.promotional_price)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {protocol.recurrence_days ? (
                          <Badge variant="secondary" className="gap-1">
                            <Clock className="h-3 w-3" />
                            {protocol.recurrence_days} dias
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {protocol.referral_bonus > 0 ? (
                          <Badge variant="secondary" className="gap-1">
                            <Gift className="h-3 w-3" />
                            {formatCurrency(protocol.referral_bonus)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={protocol.is_active ? 'default' : 'secondary'}>
                          {protocol.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(protocol)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteMutation.mutate(protocol.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProtocol ? 'Editar Protocolo' : 'Novo Protocolo'}
            </DialogTitle>
            <DialogDescription>
              Configure todas as informações do protocolo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome do protocolo"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição do protocolo"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.protocol_type || 'procedimento'}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, protocol_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROTOCOL_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Preço (R$)</Label>
                <Input
                  type="number"
                  value={formData.price || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Preço Promocional (R$)</Label>
                <Input
                  type="number"
                  value={formData.promotional_price || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, promotional_price: parseFloat(e.target.value) || null }))}
                  placeholder="Opcional"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label>Ativo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
                  />
                  <Label>Destaque</Label>
                </div>
              </div>
            </div>

            {/* Recurrence */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recorrência
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Recorrência</Label>
                    <Select
                      value={formData.recurrence_type || ''}
                      onValueChange={handleRecurrenceTypeChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sem recorrência</SelectItem>
                        {RECURRENCE_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Dias até renovação</Label>
                    <Input
                      type="number"
                      value={formData.recurrence_days || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, recurrence_days: parseInt(e.target.value) || null }))}
                      placeholder="Ex: 180"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Script de Recorrência</Label>
                  <Textarea
                    value={formData.recurrence_script || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, recurrence_script: e.target.value }))}
                    placeholder="Olá {nome}! Seu tratamento está vencendo..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">Use {'{nome}'} para o nome do cliente</p>
                </div>
              </CardContent>
            </Card>

            {/* Referral & Loyalty */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  Indicação & Fidelidade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bônus por Indicação (R$)</Label>
                    <Input
                      type="number"
                      value={formData.referral_bonus || 0}
                      onChange={(e) => setFormData(prev => ({ ...prev, referral_bonus: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pontos de Fidelidade</Label>
                    <Input
                      type="number"
                      value={formData.loyalty_points || 0}
                      onChange={(e) => setFormData(prev => ({ ...prev, loyalty_points: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Script de Indicação</Label>
                  <Textarea
                    value={formData.referral_script || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, referral_script: e.target.value }))}
                    placeholder="Olá {nome}! Indique uma amiga e ganhe..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Target Segments */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Segmentos Alvo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {SEGMENTS.map(segment => (
                    <Badge
                      key={segment.value}
                      variant={formData.target_segments?.includes(segment.value) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => handleSegmentToggle(segment.value)}
                    >
                      {segment.label}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sales Script */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Script de Vendas
              </Label>
              <Textarea
                value={formData.sales_script || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, sales_script: e.target.value }))}
                placeholder="Olá {nome}! Tenho uma oferta especial..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingProtocol ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProtocolsManager;
