import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  RefreshCw, Loader2, Send, Copy, Check, MessageSquare,
  Repeat, TrendingUp, Gift, UserPlus, Heart, Sparkles,
  Clock, AlertTriangle, Star, ExternalLink, Search,
  Brain, Zap, Users, Calendar, Phone
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProtocolSuggestion {
  id: string;
  lead_id: string;
  protocol_id: string;
  suggestion_type: string;
  priority: number;
  reason: string;
  personalized_script: string;
  ai_confidence: number;
  suggested_at: string;
  is_active: boolean;
  lead?: {
    id: string;
    name: string;
    phone: string;
    whatsapp: string;
    email: string;
    temperature: string;
    team_id: string;
  };
  protocol?: {
    id: string;
    name: string;
    price: number;
    promotional_price: number | null;
    description: string;
  };
}

const SUGGESTION_TYPES = {
  recurrence: { 
    label: 'Recorrência', 
    icon: Repeat, 
    color: 'bg-amber-500',
    description: 'Procedimentos que precisam ser renovados'
  },
  upsell: { 
    label: 'Upgrade', 
    icon: TrendingUp, 
    color: 'bg-purple-500',
    description: 'Oportunidades de vender mais para cliente existente'
  },
  cross_sell: { 
    label: 'Cross-sell', 
    icon: Sparkles, 
    color: 'bg-blue-500',
    description: 'Procedimentos complementares'
  },
  reactivation: { 
    label: 'Reativação', 
    icon: RefreshCw, 
    color: 'bg-orange-500',
    description: 'Clientes inativos para reativar'
  },
  referral: { 
    label: 'Indicação', 
    icon: Users, 
    color: 'bg-green-500',
    description: 'Clientes felizes que podem indicar'
  },
  loyalty: { 
    label: 'Fidelidade', 
    icon: Heart, 
    color: 'bg-pink-500',
    description: 'Reconhecer clientes fiéis'
  },
  new_client: { 
    label: 'Novo Cliente', 
    icon: UserPlus, 
    color: 'bg-cyan-500',
    description: 'Sugestões para novos clientes'
  },
};

export function ProtocolSuggestionsPanel() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showScriptDialog, setShowScriptDialog] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<ProtocolSuggestion | null>(null);
  const [customScript, setCustomScript] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch suggestions
  const { data: suggestions = [], isLoading, refetch } = useQuery({
    queryKey: ['protocol-suggestions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('protocol_suggestions')
        .select(`
          *,
          lead:crm_leads(id, name, phone, whatsapp, email, temperature, team_id),
          protocol:protocols(id, name, price, promotional_price, description)
        `)
        .eq('is_active', true)
        .order('priority', { ascending: true })
        .order('ai_confidence', { ascending: false })
        .limit(200);
      
      if (error) throw error;
      return data as ProtocolSuggestion[];
    },
  });

  // Generate suggestions mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-protocol-suggestions', {
        body: { batch_mode: true, limit: 500 },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`${data.suggestions_generated} sugestões geradas para ${data.leads_analyzed} leads!`);
      queryClient.invalidateQueries({ queryKey: ['protocol-suggestions'] });
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Mark as acted mutation
  const markActedMutation = useMutation({
    mutationFn: async ({ suggestionId, result }: { suggestionId: string; result: string }) => {
      const { error } = await supabase
        .from('protocol_suggestions')
        .update({ 
          acted_at: new Date().toISOString(),
          action_result: result,
        })
        .eq('id', suggestionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['protocol-suggestions'] });
    },
  });

  const openScriptDialog = (suggestion: ProtocolSuggestion) => {
    setSelectedSuggestion(suggestion);
    setCustomScript(suggestion.personalized_script || '');
    setShowScriptDialog(true);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Script copiado!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendWhatsApp = (suggestion: ProtocolSuggestion, script: string) => {
    const phone = suggestion.lead?.whatsapp || suggestion.lead?.phone;
    if (!phone) {
      toast.error('Lead sem telefone cadastrado');
      return;
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(script)}`, '_blank');
    
    // Mark as acted
    markActedMutation.mutate({ suggestionId: suggestion.id, result: 'whatsapp_sent' });
    setShowScriptDialog(false);
    toast.success('WhatsApp aberto!');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const getTypeConfig = (type: string) => {
    return SUGGESTION_TYPES[type as keyof typeof SUGGESTION_TYPES] || SUGGESTION_TYPES.new_client;
  };

  const filteredSuggestions = suggestions.filter(s => {
    const matchesTab = activeTab === 'all' || s.suggestion_type === activeTab;
    const matchesSearch = !searchQuery || 
      s.lead?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.protocol?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.reason.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const suggestionCounts = Object.keys(SUGGESTION_TYPES).reduce((acc, type) => {
    acc[type] = suggestions.filter(s => s.suggestion_type === type).length;
    return acc;
  }, {} as Record<string, number>);

  const prioritySuggestions = filteredSuggestions.filter(s => s.priority === 1);
  const normalSuggestions = filteredSuggestions.filter(s => s.priority > 1);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Sugestões Inteligentes de Protocolos
          </h2>
          <p className="text-muted-foreground">
            IA analisa leads e sugere protocolos para recorrência, upsell, indicação e mais
          </p>
        </div>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="gap-2"
        >
          {generateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          Gerar Sugestões IA
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {Object.entries(SUGGESTION_TYPES).map(([key, config]) => {
          const Icon = config.icon;
          const count = suggestionCounts[key] || 0;
          return (
            <Card 
              key={key} 
              className={`cursor-pointer transition-all hover:scale-105 ${activeTab === key ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setActiveTab(activeTab === key ? 'all' : key)}
            >
              <CardContent className="p-3 text-center">
                <div className={`mx-auto w-8 h-8 rounded-full ${config.color} flex items-center justify-center mb-1`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="text-xl font-bold">{count}</div>
                <div className="text-xs text-muted-foreground truncate">{config.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente, protocolo ou motivo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all" className="gap-1">
            Todas ({suggestions.length})
          </TabsTrigger>
          {Object.entries(SUGGESTION_TYPES).slice(0, 4).map(([key, config]) => (
            <TabsTrigger key={key} value={key} className="gap-1">
              <config.icon className="h-3 w-3" />
              {config.label} ({suggestionCounts[key] || 0})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredSuggestions.length === 0 && (
        <Card className="py-12">
          <CardContent className="text-center">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma sugestão encontrada</h3>
            <p className="text-muted-foreground mb-4">
              Clique em "Gerar Sugestões IA" para analisar seus leads
            </p>
            <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
              <Zap className="h-4 w-4 mr-2" />
              Gerar Sugestões
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Priority Suggestions */}
      {prioritySuggestions.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-4 w-4" />
            Prioridade Alta ({prioritySuggestions.length})
          </h3>
          <div className="grid gap-3">
            {prioritySuggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onOpenScript={openScriptDialog}
                onCopy={handleCopy}
                copiedId={copiedId}
                formatCurrency={formatCurrency}
                getTypeConfig={getTypeConfig}
              />
            ))}
          </div>
        </div>
      )}

      {/* Normal Suggestions */}
      {normalSuggestions.length > 0 && (
        <div className="space-y-3">
          {prioritySuggestions.length > 0 && (
            <h3 className="font-semibold text-muted-foreground">
              Outras Oportunidades ({normalSuggestions.length})
            </h3>
          )}
          <ScrollArea className="h-[500px]">
            <div className="grid gap-3 pr-4">
              {normalSuggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onOpenScript={openScriptDialog}
                  onCopy={handleCopy}
                  copiedId={copiedId}
                  formatCurrency={formatCurrency}
                  getTypeConfig={getTypeConfig}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Script Dialog */}
      <Dialog open={showScriptDialog} onOpenChange={setShowScriptDialog}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Script Personalizado
            </DialogTitle>
            <DialogDescription>
              Envie para {selectedSuggestion?.lead?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Lead Info */}
            {selectedSuggestion?.lead && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <div className="flex-1">
                  <p className="font-medium">{selectedSuggestion.lead.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedSuggestion.lead.whatsapp || selectedSuggestion.lead.phone || 'Sem telefone'}
                  </p>
                </div>
                <Badge variant="secondary">
                  <Phone className="h-3 w-3 mr-1" />
                  WhatsApp
                </Badge>
              </div>
            )}

            {/* Protocol Info */}
            {selectedSuggestion?.protocol && (
              <div className="p-3 rounded-lg border">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{selectedSuggestion.protocol.name}</span>
                  <span className="font-bold text-emerald-600">
                    {formatCurrency(selectedSuggestion.protocol.promotional_price || selectedSuggestion.protocol.price)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedSuggestion.reason}
                </p>
              </div>
            )}

            {/* Script Editor */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Mensagem</label>
              <Textarea
                value={customScript}
                onChange={(e) => setCustomScript(e.target.value)}
                rows={8}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                handleCopy(customScript, selectedSuggestion?.id || '');
              }}
              className="gap-2"
            >
              {copiedId === selectedSuggestion?.id ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Copiar
            </Button>
            <Button
              onClick={() => selectedSuggestion && handleSendWhatsApp(selectedSuggestion, customScript)}
              className="gap-2"
              disabled={!selectedSuggestion?.lead?.phone && !selectedSuggestion?.lead?.whatsapp}
            >
              <ExternalLink className="h-4 w-4" />
              Enviar WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Suggestion Card Component
interface SuggestionCardProps {
  suggestion: ProtocolSuggestion;
  onOpenScript: (suggestion: ProtocolSuggestion) => void;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
  formatCurrency: (value: number) => string;
  getTypeConfig: (type: string) => typeof SUGGESTION_TYPES[keyof typeof SUGGESTION_TYPES];
}

function SuggestionCard({ 
  suggestion, 
  onOpenScript, 
  onCopy, 
  copiedId, 
  formatCurrency, 
  getTypeConfig 
}: SuggestionCardProps) {
  const config = getTypeConfig(suggestion.suggestion_type);
  const Icon = config.icon;
  const confidence = Math.round((suggestion.ai_confidence || 0) * 100);

  return (
    <Card className={`transition-all hover:shadow-md ${suggestion.priority === 1 ? 'border-amber-500 bg-amber-500/5' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Type Icon */}
          <div className={`p-2 rounded-lg ${config.color} shrink-0`}>
            <Icon className="h-4 w-4 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-medium">{suggestion.lead?.name || 'Cliente'}</h4>
                <p className="text-sm text-muted-foreground">
                  {suggestion.protocol?.name}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-emerald-600">
                  {formatCurrency(suggestion.protocol?.promotional_price || suggestion.protocol?.price || 0)}
                </div>
                <Badge variant="outline" className="text-xs">
                  {confidence}% confiança
                </Badge>
              </div>
            </div>

            {/* Reason */}
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {suggestion.reason}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              <Badge className={config.color}>
                {config.label}
              </Badge>
              <div className="flex-1" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCopy(suggestion.personalized_script || '', suggestion.id)}
                className="gap-1"
              >
                {copiedId === suggestion.id ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                Script
              </Button>
              <Button
                size="sm"
                onClick={() => onOpenScript(suggestion)}
                className="gap-1"
              >
                <Send className="h-3 w-3" />
                Enviar
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ProtocolSuggestionsPanel;
