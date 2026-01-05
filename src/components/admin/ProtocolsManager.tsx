import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Plus, Syringe, Package, Route, Edit2, Trash2, Send, 
  Users, Target, DollarSign, Clock, MessageSquare, Copy,
  Check, Star, TrendingUp, FileText, Crown, Heart, Zap,
  AlertTriangle, RefreshCw, Loader2, ExternalLink, Eye,
  Upload, Image, Link, File, X, Download
} from "lucide-react";
import { toast } from "sonner";

interface ProtocolMaterial {
  id: string;
  type: 'pdf' | 'image' | 'link';
  title: string;
  url: string;
  file_name?: string;
}

const PROTOCOL_TYPES = [
  { value: 'procedimento', label: 'Procedimento', icon: Syringe, color: 'bg-blue-500' },
  { value: 'pacote', label: 'Pacote de Serviços', icon: Package, color: 'bg-purple-500' },
  { value: 'jornada', label: 'Jornada do Paciente', icon: Route, color: 'bg-green-500' },
];

const RFV_SEGMENTS = [
  { value: 'champions', label: 'Campeões', icon: Crown, color: 'text-yellow-500' },
  { value: 'loyal', label: 'Fiéis', icon: Heart, color: 'text-blue-500' },
  { value: 'potential', label: 'Potenciais', icon: Zap, color: 'text-amber-500' },
  { value: 'at_risk', label: 'Em Risco', icon: AlertTriangle, color: 'text-orange-500' },
  { value: 'hibernating', label: 'Hibernando', icon: Clock, color: 'text-purple-500' },
  { value: 'lost', label: 'Perdidos', icon: RefreshCw, color: 'text-red-500' },
];

interface Protocol {
  id: string;
  name: string;
  description: string | null;
  protocol_type: string;
  price: number;
  promotional_price: number | null;
  duration_days: number | null;
  target_segments: string[];
  target_audience: string | null;
  benefits: string[] | null;
  included_items: string[] | null;
  sales_script: string | null;
  whatsapp_scripts: Record<string, string>;
  materials: any[];
  is_active: boolean;
  is_featured: boolean;
  campaign_id: string | null;
  created_at: string;
}

interface ProtocolFormData {
  name: string;
  description: string;
  protocol_type: string;
  price: string;
  promotional_price: string;
  duration_days: string;
  target_segments: string[];
  target_audience: string;
  benefits: string;
  included_items: string;
  sales_script: string;
  whatsapp_scripts: Record<string, string>;
  materials: ProtocolMaterial[];
  is_active: boolean;
  is_featured: boolean;
}

const emptyFormData: ProtocolFormData = {
  name: '',
  description: '',
  protocol_type: 'procedimento',
  price: '',
  promotional_price: '',
  duration_days: '',
  target_segments: [],
  target_audience: '',
  benefits: '',
  included_items: '',
  sales_script: '',
  whatsapp_scripts: {},
  materials: [],
  is_active: true,
  is_featured: false,
};

const ProtocolsManager = () => {
  const { user, role, profile } = useAuth();
  const queryClient = useQueryClient();
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<Protocol | null>(null);
  const [formData, setFormData] = useState<ProtocolFormData>(emptyFormData);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [selectedSegmentForOffer, setSelectedSegmentForOffer] = useState<string>('');
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  // Fetch protocols
  const { data: protocols = [], isLoading } = useQuery({
    queryKey: ['protocols'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('protocols')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Protocol[];
    },
  });

  // Fetch RFV customers for offers
  const { data: rfvCustomers = [] } = useQuery({
    queryKey: ['rfv-customers-for-protocols', selectedSegmentForOffer],
    queryFn: async () => {
      if (!selectedSegmentForOffer) return [];
      const { data, error } = await supabase
        .from('rfv_customers')
        .select('id, name, phone, whatsapp, segment, average_ticket')
        .eq('segment', selectedSegmentForOffer)
        .order('average_ticket', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSegmentForOffer,
  });

  // Fetch protocol offer stats
  const { data: offerStats = {} } = useQuery({
    queryKey: ['protocol-offer-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('protocol_offers')
        .select('protocol_id, status');
      
      if (error) throw error;
      
      const stats: Record<string, { total: number; converted: number }> = {};
      data.forEach(offer => {
        if (!stats[offer.protocol_id]) {
          stats[offer.protocol_id] = { total: 0, converted: 0 };
        }
        stats[offer.protocol_id].total++;
        if (offer.status === 'converted') {
          stats[offer.protocol_id].converted++;
        }
      });
      return stats;
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: ProtocolFormData) => {
      const payload = {
        name: data.name,
        description: data.description || null,
        protocol_type: data.protocol_type,
        price: parseFloat(data.price) || 0,
        promotional_price: data.promotional_price ? parseFloat(data.promotional_price) : null,
        duration_days: data.duration_days ? parseInt(data.duration_days) : null,
        target_segments: data.target_segments,
        target_audience: data.target_audience || null,
        benefits: data.benefits ? data.benefits.split('\n').filter(b => b.trim()) : null,
        included_items: data.included_items ? data.included_items.split('\n').filter(i => i.trim()) : null,
        sales_script: data.sales_script || null,
        whatsapp_scripts: data.whatsapp_scripts,
        materials: JSON.parse(JSON.stringify(data.materials)),
        is_active: data.is_active,
        is_featured: data.is_featured,
        created_by: user?.id || '',
      };

      if (editingProtocol) {
        const { error } = await supabase
          .from('protocols')
          .update(payload)
          .eq('id', editingProtocol.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('protocols')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['protocols'] });
      toast.success(editingProtocol ? 'Protocolo atualizado!' : 'Protocolo criado!');
      handleCloseForm();
    },
    onError: (error) => {
      console.error('Error saving protocol:', error);
      toast.error('Erro ao salvar protocolo');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('protocols')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['protocols'] });
      toast.success('Protocolo excluído!');
    },
    onError: (error) => {
      console.error('Error deleting protocol:', error);
      toast.error('Erro ao excluir protocolo');
    },
  });

  const handleOpenCreate = () => {
    setEditingProtocol(null);
    setFormData(emptyFormData);
    setShowFormDialog(true);
  };

  const handleOpenEdit = (protocol: Protocol) => {
    setEditingProtocol(protocol);
    setFormData({
      name: protocol.name,
      description: protocol.description || '',
      protocol_type: protocol.protocol_type,
      price: protocol.price.toString(),
      promotional_price: protocol.promotional_price?.toString() || '',
      duration_days: protocol.duration_days?.toString() || '',
      target_segments: protocol.target_segments || [],
      target_audience: protocol.target_audience || '',
      benefits: protocol.benefits?.join('\n') || '',
      included_items: protocol.included_items?.join('\n') || '',
      sales_script: protocol.sales_script || '',
      whatsapp_scripts: protocol.whatsapp_scripts || {},
      materials: (protocol.materials as ProtocolMaterial[]) || [],
      is_active: protocol.is_active,
      is_featured: protocol.is_featured,
    });
    setShowFormDialog(true);
  };

  const handleCloseForm = () => {
    setShowFormDialog(false);
    setEditingProtocol(null);
    setFormData(emptyFormData);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleOpenOffer = (protocol: Protocol) => {
    setSelectedProtocol(protocol);
    setSelectedSegmentForOffer('');
    setShowOfferDialog(true);
  };

  const getWhatsAppScript = (protocol: Protocol, segment: string, customerName: string) => {
    const baseScript = protocol.whatsapp_scripts[segment] || protocol.sales_script || 
      `Olá {nome}! 💫 Temos uma novidade especial para você: ${protocol.name}. ${protocol.description || ''} Quer saber mais?`;
    
    return baseScript.replace(/{nome}/g, customerName.split(' ')[0]);
  };

  const handleCopyScript = (script: string, key: string) => {
    navigator.clipboard.writeText(script);
    setCopiedScript(key);
    toast.success('Script copiado!');
    setTimeout(() => setCopiedScript(null), 2000);
  };

  const handleSendWhatsApp = async (customer: any, protocol: Protocol) => {
    const phone = customer.whatsapp || customer.phone;
    if (!phone) {
      toast.error('Cliente sem telefone cadastrado');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const message = getWhatsAppScript(protocol, customer.segment, customer.name);
    
    // Save offer to database
    try {
      await supabase.from('protocol_offers').insert({
        protocol_id: protocol.id,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_segment: customer.segment,
        offered_by: user?.id || '',
        offered_by_name: profile?.full_name || 'Usuário',
        message_sent: message,
        status: 'sent',
      });
      queryClient.invalidateQueries({ queryKey: ['protocol-offer-stats'] });
    } catch (error) {
      console.error('Error saving offer:', error);
    }

    const whatsappUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    toast.success('Abrindo WhatsApp...');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getTypeConfig = (type: string) => {
    return PROTOCOL_TYPES.find(t => t.value === type) || PROTOCOL_TYPES[0];
  };

  const isAdmin = role === 'admin';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Protocolos</h2>
          <p className="text-muted-foreground">Gerencie procedimentos, pacotes e jornadas de pacientes</p>
        </div>
        {isAdmin && (
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Protocolo
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Syringe className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Procedimentos</p>
                <p className="text-2xl font-bold">
                  {protocols.filter(p => p.protocol_type === 'procedimento').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Package className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pacotes</p>
                <p className="text-2xl font-bold">
                  {protocols.filter(p => p.protocol_type === 'pacote').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Route className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Jornadas</p>
                <p className="text-2xl font-bold">
                  {protocols.filter(p => p.protocol_type === 'jornada').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Star className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Destaques</p>
                <p className="text-2xl font-bold">
                  {protocols.filter(p => p.is_featured).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Protocols List */}
      {protocols.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum protocolo cadastrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crie protocolos para ofertar aos pacientes da matriz RFV
            </p>
            {isAdmin && (
              <Button onClick={handleOpenCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Criar Primeiro Protocolo
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {protocols.map((protocol) => {
            const typeConfig = getTypeConfig(protocol.protocol_type);
            const TypeIcon = typeConfig.icon;
            const stats = offerStats[protocol.id] || { total: 0, converted: 0 };
            const conversionRate = stats.total > 0 ? Math.round((stats.converted / stats.total) * 100) : 0;

            return (
              <Card key={protocol.id} className={`relative ${!protocol.is_active ? 'opacity-60' : ''}`}>
                {protocol.is_featured && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-yellow-500 text-yellow-900 gap-1">
                      <Star className="h-3 w-3" />
                      Destaque
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${typeConfig.color}`}>
                      <TypeIcon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{protocol.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {protocol.description || 'Sem descrição'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Price */}
                  <div className="flex items-baseline gap-2">
                    {protocol.promotional_price ? (
                      <>
                        <span className="text-2xl font-bold text-green-600">
                          {formatCurrency(protocol.promotional_price)}
                        </span>
                        <span className="text-sm text-muted-foreground line-through">
                          {formatCurrency(protocol.price)}
                        </span>
                      </>
                    ) : (
                      <span className="text-2xl font-bold">{formatCurrency(protocol.price)}</span>
                    )}
                  </div>

                  {/* Target Segments */}
                  {protocol.target_segments && protocol.target_segments.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {protocol.target_segments.map(seg => {
                        const segConfig = RFV_SEGMENTS.find(s => s.value === seg);
                        if (!segConfig) return null;
                        const SegIcon = segConfig.icon;
                        return (
                          <Badge key={seg} variant="outline" className={`text-xs gap-1 ${segConfig.color}`}>
                            <SegIcon className="h-3 w-3" />
                            {segConfig.label}
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-muted-foreground text-xs">Ofertas</p>
                      <p className="font-bold">{stats.total}</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-muted-foreground text-xs">Conversões</p>
                      <p className="font-bold text-green-600">{stats.converted}</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-muted-foreground text-xs">Taxa</p>
                      <p className="font-bold">{conversionRate}%</p>
                    </div>
                  </div>

                  {/* Materials Badge */}
                  {protocol.materials && (protocol.materials as ProtocolMaterial[]).length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      <span>{(protocol.materials as ProtocolMaterial[]).length} materiais de apoio</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button 
                      size="sm" 
                      className="flex-1 gap-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleOpenOffer(protocol)}
                    >
                      <Send className="h-4 w-4" />
                      Ofertar
                    </Button>
                    {isAdmin && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleOpenEdit(protocol)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm('Excluir este protocolo?')) {
                              deleteMutation.mutate(protocol.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingProtocol ? 'Editar Protocolo' : 'Novo Protocolo'}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes do protocolo e scripts de venda
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="info">Informações</TabsTrigger>
                <TabsTrigger value="details">Detalhes</TabsTrigger>
                <TabsTrigger value="scripts">Scripts</TabsTrigger>
                <TabsTrigger value="materials">Materiais</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Nome do Protocolo *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Harmonização Facial Premium"
                    />
                  </div>

                  <div>
                    <Label>Tipo</Label>
                    <Select
                      value={formData.protocol_type}
                      onValueChange={(v) => setFormData({ ...formData, protocol_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROTOCOL_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Duração (dias)</Label>
                    <Input
                      type="number"
                      value={formData.duration_days}
                      onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                      placeholder="Ex: 30"
                    />
                  </div>

                  <div>
                    <Label>Preço (R$)</Label>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <Label>Preço Promocional (R$)</Label>
                    <Input
                      type="number"
                      value={formData.promotional_price}
                      onChange={(e) => setFormData({ ...formData, promotional_price: e.target.value })}
                      placeholder="Deixe vazio se não houver"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>Descrição</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descreva o protocolo..."
                      rows={3}
                    />
                  </div>

                  <div className="col-span-2 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(c) => setFormData({ ...formData, is_active: !!c })}
                      />
                      <Label htmlFor="is_active">Ativo</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="is_featured"
                        checked={formData.is_featured}
                        onCheckedChange={(c) => setFormData({ ...formData, is_featured: !!c })}
                      />
                      <Label htmlFor="is_featured">Destaque</Label>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-4 mt-4">
                <div>
                  <Label>Segmentos RFV Alvo</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {RFV_SEGMENTS.map(seg => {
                      const SegIcon = seg.icon;
                      const isSelected = formData.target_segments.includes(seg.value);
                      return (
                        <div
                          key={seg.value}
                          className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                          }`}
                          onClick={() => {
                            const newSegments = isSelected
                              ? formData.target_segments.filter(s => s !== seg.value)
                              : [...formData.target_segments, seg.value];
                            setFormData({ ...formData, target_segments: newSegments });
                          }}
                        >
                          <Checkbox checked={isSelected} />
                          <SegIcon className={`h-4 w-4 ${seg.color}`} />
                          <span className="text-sm">{seg.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label>Público-Alvo</Label>
                  <Input
                    value={formData.target_audience}
                    onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                    placeholder="Ex: Mulheres 30-50 anos que buscam rejuvenescimento"
                  />
                </div>

                <div>
                  <Label>Benefícios (um por linha)</Label>
                  <Textarea
                    value={formData.benefits}
                    onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                    placeholder="Resultado natural&#10;Procedimento rápido&#10;Mínimo desconforto"
                    rows={4}
                  />
                </div>

                <div>
                  <Label>Itens Incluídos (um por linha)</Label>
                  <Textarea
                    value={formData.included_items}
                    onChange={(e) => setFormData({ ...formData, included_items: e.target.value })}
                    placeholder="Consulta inicial&#10;Aplicação de toxina&#10;Retorno em 15 dias"
                    rows={4}
                  />
                </div>
              </TabsContent>

              <TabsContent value="scripts" className="space-y-4 mt-4">
                <div>
                  <Label>Script de Vendas Geral</Label>
                  <Textarea
                    value={formData.sales_script}
                    onChange={(e) => setFormData({ ...formData, sales_script: e.target.value })}
                    placeholder="Use {nome} para personalizar com o nome do cliente..."
                    rows={4}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Scripts por Segmento RFV (opcional)</Label>
                  {RFV_SEGMENTS.map(seg => {
                    const SegIcon = seg.icon;
                    return (
                      <div key={seg.value} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <SegIcon className={`h-4 w-4 ${seg.color}`} />
                          <span className="text-sm font-medium">{seg.label}</span>
                        </div>
                        <Textarea
                          value={formData.whatsapp_scripts[seg.value] || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            whatsapp_scripts: {
                              ...formData.whatsapp_scripts,
                              [seg.value]: e.target.value,
                            },
                          })}
                          placeholder={`Script específico para ${seg.label}... (deixe vazio para usar o geral)`}
                          rows={2}
                        />
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="materials" className="space-y-4 mt-4">
                {/* Add Link Material */}
                <div className="space-y-3">
                  <Label>Adicionar Material de Apoio</Label>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {/* Link Form */}
                    <div className="p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Link className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Link Externo</span>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          id="link-title"
                          placeholder="Título do link"
                          className="flex-1"
                        />
                        <Input
                          id="link-url"
                          placeholder="https://..."
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const titleInput = document.getElementById('link-title') as HTMLInputElement;
                            const urlInput = document.getElementById('link-url') as HTMLInputElement;
                            if (titleInput.value && urlInput.value) {
                              const newMaterial: ProtocolMaterial = {
                                id: crypto.randomUUID(),
                                type: 'link',
                                title: titleInput.value,
                                url: urlInput.value,
                              };
                              setFormData({
                                ...formData,
                                materials: [...formData.materials, newMaterial],
                              });
                              titleInput.value = '';
                              urlInput.value = '';
                              toast.success('Link adicionado!');
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* File Upload */}
                    <div className="p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Upload className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Upload de Arquivo (PDF ou Imagem)</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <Input
                          id="file-title"
                          placeholder="Título do arquivo"
                          className="flex-1"
                        />
                        <Input
                          id="file-upload"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          className="flex-1"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            const titleInput = document.getElementById('file-title') as HTMLInputElement;
                            if (!file) return;
                            
                            const title = titleInput.value || file.name;
                            const fileExt = file.name.split('.').pop()?.toLowerCase();
                            const isImage = ['jpg', 'jpeg', 'png', 'webp'].includes(fileExt || '');
                            const fileName = `${Date.now()}-${file.name}`;
                            
                            toast.loading('Enviando arquivo...', { id: 'upload' });
                            
                            const { data: uploadData, error: uploadError } = await supabase.storage
                              .from('protocol-materials')
                              .upload(fileName, file);
                            
                            if (uploadError) {
                              toast.error('Erro no upload: ' + uploadError.message, { id: 'upload' });
                              return;
                            }
                            
                            const { data: { publicUrl } } = supabase.storage
                              .from('protocol-materials')
                              .getPublicUrl(fileName);
                            
                            const newMaterial: ProtocolMaterial = {
                              id: crypto.randomUUID(),
                              type: isImage ? 'image' : 'pdf',
                              title,
                              url: publicUrl,
                              file_name: fileName,
                            };
                            
                            setFormData({
                              ...formData,
                              materials: [...formData.materials, newMaterial],
                            });
                            
                            e.target.value = '';
                            titleInput.value = '';
                            toast.success('Arquivo enviado!', { id: 'upload' });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Materials List */}
                <div className="space-y-2">
                  <Label>Materiais Adicionados ({formData.materials.length})</Label>
                  {formData.materials.length === 0 ? (
                    <div className="text-center py-6 border rounded-lg bg-muted/20">
                      <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhum material adicionado</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {formData.materials.map((material, index) => (
                        <div 
                          key={material.id}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                        >
                          <div className="p-2 rounded-lg bg-muted">
                            {material.type === 'pdf' && <FileText className="h-4 w-4 text-red-500" />}
                            {material.type === 'image' && <Image className="h-4 w-4 text-green-500" />}
                            {material.type === 'link' && <Link className="h-4 w-4 text-blue-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{material.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{material.url}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              asChild
                            >
                              <a href={material.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={async () => {
                                // If it's a file, delete from storage
                                if (material.file_name) {
                                  await supabase.storage
                                    .from('protocol-materials')
                                    .remove([material.file_name]);
                                }
                                setFormData({
                                  ...formData,
                                  materials: formData.materials.filter(m => m.id !== material.id),
                                });
                                toast.success('Material removido');
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCloseForm}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                editingProtocol ? 'Atualizar' : 'Criar Protocolo'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Offer Dialog */}
      <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-green-500" />
              Ofertar Protocolo
            </DialogTitle>
            {selectedProtocol && (
              <DialogDescription>
                <span className="font-medium">{selectedProtocol.name}</span>
                {selectedProtocol.promotional_price ? (
                  <span className="ml-2 text-green-600 font-medium">
                    {formatCurrency(selectedProtocol.promotional_price)}
                  </span>
                ) : (
                  <span className="ml-2 font-medium">{formatCurrency(selectedProtocol.price)}</span>
                )}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4 py-4 flex-1 overflow-hidden">
            {/* Materials Section */}
            {selectedProtocol && (selectedProtocol.materials as ProtocolMaterial[])?.length > 0 && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <Label className="text-sm font-medium mb-2 block">Materiais de Apoio</Label>
                <div className="flex flex-wrap gap-2">
                  {(selectedProtocol.materials as ProtocolMaterial[]).map(material => (
                    <Button
                      key={material.id}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      asChild
                    >
                      <a href={material.url} target="_blank" rel="noopener noreferrer">
                        {material.type === 'pdf' && <FileText className="h-3 w-3 text-red-500" />}
                        {material.type === 'image' && <Image className="h-3 w-3 text-green-500" />}
                        {material.type === 'link' && <Link className="h-3 w-3 text-blue-500" />}
                        {material.title}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Segment Selection */}
            <div>
              <Label className="mb-2 block">Selecione o segmento RFV:</Label>
              <div className="flex flex-wrap gap-2">
                {RFV_SEGMENTS.map(seg => {
                  const SegIcon = seg.icon;
                  const isTarget = selectedProtocol?.target_segments?.includes(seg.value);
                  return (
                    <Button
                      key={seg.value}
                      variant={selectedSegmentForOffer === seg.value ? 'default' : 'outline'}
                      size="sm"
                      className={`gap-2 ${isTarget ? 'ring-2 ring-primary/50' : ''}`}
                      onClick={() => setSelectedSegmentForOffer(seg.value)}
                    >
                      <SegIcon className={`h-4 w-4 ${seg.color}`} />
                      {seg.label}
                      {isTarget && <Star className="h-3 w-3 text-yellow-500" />}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Customer List */}
            {selectedSegmentForOffer && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Pacientes do segmento ({rfvCustomers.length}):</Label>
                </div>
                <ScrollArea className="h-[250px] border rounded-lg p-2">
                  {rfvCustomers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhum paciente neste segmento</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {rfvCustomers.map(customer => {
                        const phone = customer.whatsapp || customer.phone;
                        const script = selectedProtocol 
                          ? getWhatsAppScript(selectedProtocol, customer.segment, customer.name)
                          : '';
                        
                        return (
                          <div 
                            key={customer.id}
                            className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{customer.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {phone ? (
                                  <span className="text-green-600">{phone}</span>
                                ) : (
                                  <span className="text-yellow-600">Sem telefone</span>
                                )}
                                <span>•</span>
                                <span className="font-medium">
                                  Ticket: {formatCurrency(customer.average_ticket)}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCopyScript(script, customer.id)}
                              >
                                {copiedScript === customer.id ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                className="gap-1 bg-green-600 hover:bg-green-700"
                                disabled={!phone}
                                onClick={() => selectedProtocol && handleSendWhatsApp(customer, selectedProtocol)}
                              >
                                <MessageSquare className="h-4 w-4" />
                                Enviar
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}

            {/* Script Preview */}
            {selectedProtocol && selectedSegmentForOffer && rfvCustomers.length > 0 && (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <Label className="text-xs text-muted-foreground">Preview da mensagem:</Label>
                <p className="text-sm mt-1">
                  {getWhatsAppScript(selectedProtocol, selectedSegmentForOffer, rfvCustomers[0]?.name || 'Cliente')}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOfferDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProtocolsManager;
