import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Syringe, Package, Route, Star, Search, Send,
  Loader2, DollarSign, Copy, Check, MessageSquare,
  Phone, ExternalLink, TrendingUp, Users
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { CRMLead } from "@/hooks/useCRM";

interface Protocol {
  id: string;
  name: string;
  description: string | null;
  protocol_type: string;
  price: number;
  promotional_price: number | null;
  target_segments: string[];
  sales_script: string | null;
  whatsapp_scripts: Record<string, string>;
  is_active: boolean;
  is_featured: boolean;
}

const PROTOCOL_TYPES = {
  procedimento: { label: 'Procedimento', icon: Syringe, color: 'bg-blue-500' },
  pacote: { label: 'Pacote', icon: Package, color: 'bg-purple-500' },
  jornada: { label: 'Jornada', icon: Route, color: 'bg-green-500' },
};

interface CRMProtocolIntegrationProps {
  selectedLead?: CRMLead | null;
  onOfferSent?: () => void;
}

export function CRMProtocolIntegration({ selectedLead, onOfferSent }: CRMProtocolIntegrationProps) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch active protocols
  const { data: protocols = [], isLoading } = useQuery({
    queryKey: ['crm-protocols'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('protocols')
        .select('*')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Protocol[];
    },
  });

  // Fetch protocol offer stats
  const { data: offerStats = {} } = useQuery({
    queryKey: ['protocol-offer-stats-crm'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('protocol_offers')
        .select('protocol_id, status');
      
      if (error) throw error;
      
      const stats: Record<string, { total: number; converted: number }> = {};
      data?.forEach(offer => {
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

  // Send offer mutation
  const sendOffer = useMutation({
    mutationFn: async ({ protocol, message }: { protocol: Protocol; message: string }) => {
      if (!selectedLead) throw new Error('Nenhum lead selecionado');

      // Save offer record
      await supabase.from('protocol_offers').insert({
        protocol_id: protocol.id,
        customer_id: selectedLead.rfv_customer_id || null,
        customer_name: selectedLead.name,
        customer_segment: selectedLead.tags?.[0] || 'lead',
        offered_by: user?.id || '',
        offered_by_name: profile?.full_name || 'Usuário',
        message_sent: message,
        status: 'sent',
      });

      // Update lead with offered protocol
      const currentProcedures = selectedLead.interested_procedures || [];
      if (!currentProcedures.includes(protocol.name)) {
        const nextProcedures = [...currentProcedures, protocol.name];

        const normalizeName = (name: string) =>
          name.replace(/^\s*Com\s*\d+\s*-\s*/i, '').trim();

        // Query both raw and normalized names to cover labels with/without "Com XXX -"
        const nameCandidates = Array.from(
          new Set(nextProcedures.flatMap(n => [n.trim(), normalizeName(n)]).filter(Boolean))
        );

        const [protocolsRes, proceduresRes] = await Promise.all([
          supabase
            .from('protocols')
            .select('name, price, promotional_price')
            .in('name', nameCandidates),
          supabase
            .from('procedures')
            .select('name, price, promotional_price')
            .in('name', nameCandidates),
        ]);

        if (protocolsRes.error) throw protocolsRes.error;
        if (proceduresRes.error) throw proceduresRes.error;

        const priceByName = new Map<string, number>();
        for (const p of (protocolsRes.data || [])) {
          priceByName.set(p.name, p.promotional_price ?? p.price ?? 0);
        }
        for (const p of (proceduresRes.data || [])) {
          if (!priceByName.has(p.name)) {
            priceByName.set(p.name, p.promotional_price ?? p.price ?? 0);
          }
        }

        const getPrice = (name: string) =>
          priceByName.get(name) ?? priceByName.get(normalizeName(name)) ?? 0;

        const computedEstimatedValue = nextProcedures.reduce((sum, name) => sum + getPrice(name), 0);


        await supabase
          .from('crm_leads')
          .update({
            interested_procedures: nextProcedures,
            estimated_value: computedEstimatedValue > 0 ? computedEstimatedValue : selectedLead.estimated_value,
          })
          .eq('id', selectedLead.id);
      }

      // Add history entry
      await supabase.from('crm_lead_history').insert({
        lead_id: selectedLead.id,
        action_type: 'protocol_offered',
        title: 'Protocolo oferecido',
        description: `Protocolo "${protocol.name}" oferecido ao lead`,
        performed_by: user?.id || '',
        metadata: { protocol_id: protocol.id, protocol_name: protocol.name },
      });

      // Open WhatsApp
      const phone = selectedLead.whatsapp || selectedLead.phone;
      if (phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
        window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`, '_blank');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['protocol-offer-stats-crm'] });
      toast.success('Oferta enviada!');
      setShowOfferDialog(false);
      setCustomMessage('');
      onOfferSent?.();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const openOfferDialog = (protocol: Protocol) => {
    setSelectedProtocol(protocol);
    
    // Generate personalized message
    const leadName = selectedLead?.name.split(' ')[0] || 'Cliente';
    const baseScript = protocol.sales_script || 
      `Olá ${leadName}! 💫 Temos uma novidade especial para você: ${protocol.name}. ${protocol.description || ''} Quer saber mais?`;
    
    setCustomMessage(baseScript.replace(/{nome}/g, leadName));
    setShowOfferDialog(true);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copiado!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const getTypeConfig = (type: string) => {
    return PROTOCOL_TYPES[type as keyof typeof PROTOCOL_TYPES] || PROTOCOL_TYPES.procedimento;
  };

  const filteredProtocols = protocols.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar protocolo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Protocols Grid */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredProtocols.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum protocolo encontrado
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredProtocols.map((protocol) => {
              const typeConfig = getTypeConfig(protocol.protocol_type);
              const TypeIcon = typeConfig.icon;
              const stats = offerStats[protocol.id] || { total: 0, converted: 0 };
              const conversionRate = stats.total > 0 ? Math.round((stats.converted / stats.total) * 100) : 0;

              return (
                <Card key={protocol.id} className="relative">
                  {protocol.is_featured && (
                    <div className="absolute top-2 right-2">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${typeConfig.color}`}>
                        <TypeIcon className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{protocol.name}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {protocol.description || 'Sem descrição'}
                        </p>
                        
                        {/* Price */}
                        <div className="flex items-center gap-2 mt-2">
                          {protocol.promotional_price ? (
                            <>
                              <span className="text-xs line-through text-muted-foreground">
                                {formatCurrency(protocol.price)}
                              </span>
                              <span className="text-sm font-bold text-emerald-600">
                                {formatCurrency(protocol.promotional_price)}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm font-bold">
                              {formatCurrency(protocol.price)}
                            </span>
                          )}
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Send className="h-3 w-3" />
                            {stats.total} ofertas
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {conversionRate}% conv.
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1"
                        onClick={() => handleCopy(protocol.sales_script || protocol.name, protocol.id)}
                      >
                        {copiedId === protocol.id ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        Copiar
                      </Button>
                      {selectedLead && (
                        <Button
                          size="sm"
                          className="flex-1 gap-1"
                          onClick={() => openOfferDialog(protocol)}
                        >
                          <Send className="h-3 w-3" />
                          Ofertar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Offer Dialog */}
      <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Ofertar Protocolo
            </DialogTitle>
            <DialogDescription>
              Envie a oferta de "{selectedProtocol?.name}" para {selectedLead?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Protocol Summary */}
            {selectedProtocol && (
              <div className="p-3 rounded-lg bg-accent/50">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{selectedProtocol.name}</span>
                  <span className="font-bold text-emerald-600">
                    {formatCurrency(selectedProtocol.promotional_price || selectedProtocol.price)}
                  </span>
                </div>
              </div>
            )}

            {/* Lead Info */}
            {selectedLead && (
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="flex-1">
                  <p className="font-medium">{selectedLead.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedLead.whatsapp || selectedLead.phone || 'Sem telefone'}
                  </p>
                </div>
                {(selectedLead.whatsapp || selectedLead.phone) && (
                  <Badge variant="secondary" className="gap-1">
                    <Phone className="h-3 w-3" />
                    WhatsApp
                  </Badge>
                )}
              </div>
            )}

            {/* Custom Message */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Mensagem personalizada</label>
              <Textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={5}
                placeholder="Digite a mensagem..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOfferDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => selectedProtocol && sendOffer.mutate({ protocol: selectedProtocol, message: customMessage })}
              disabled={sendOffer.isPending || !customMessage.trim()}
              className="gap-2"
            >
              {sendOffer.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Enviar no WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CRMProtocolIntegration;
