import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Search,
  Eye,
  FileText,
  Send,
  Copy,
  ExternalLink,
  Loader2,
  ClipboardList,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Link2,
  Plus
} from "lucide-react";

interface FormTemplate {
  id: string;
  name: string;
  slug: string;
  description: string;
  form_type: string;
  is_active: boolean;
}

interface FormResponse {
  id: string;
  template_id: string;
  patient_name: string | null;
  patient_email: string | null;
  patient_phone: string | null;
  patient_cpf: string | null;
  patient_prontuario: string | null;
  lead_id: string | null;
  form_type: string;
  form_source: string;
  responses: Record<string, any>;
  nps_score: number | null;
  nps_category: string | null;
  submitted_at: string;
  form_templates?: { id: string; name: string; slug: string; form_type: string } | null;
  crm_leads?: { name: string } | null;
}

export function FormResponsesManager() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFormType, setSelectedFormType] = useState<string>("all");
  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(null);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [selectedTemplateForLink, setSelectedTemplateForLink] = useState<string>("");
  const [linkPatientData, setLinkPatientData] = useState({
    patient_name: "",
    patient_email: "",
    patient_phone: ""
  });

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ["form-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("form_templates")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as FormTemplate[];
    }
  });

  // Fetch responses
  const { data: responses = [], isLoading } = useQuery({
    queryKey: ["form-responses", selectedFormType],
    queryFn: async () => {
      let query = supabase
        .from("form_responses")
        .select(`
          *,
          form_templates (id, name, slug, form_type),
          crm_leads (name)
        `)
        .order("submitted_at", { ascending: false })
        .limit(200);

      if (selectedFormType !== "all") {
        query = query.eq("form_type", selectedFormType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FormResponse[];
    }
  });

  // Create form link mutation
  const createLinkMutation = useMutation({
    mutationFn: async (data: { template_id: string; patient_name: string; patient_email: string; patient_phone: string }) => {
      const { data: result, error } = await supabase
        .from("form_links")
        .insert({
          template_id: data.template_id,
          patient_name: data.patient_name || null,
          patient_email: data.patient_email || null,
          patient_phone: data.patient_phone || null,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      const url = `${window.location.origin}/formulario?token=${data.token}`;
      navigator.clipboard.writeText(url);
      toast.success("Link criado e copiado para a área de transferência!");
      setIsLinkDialogOpen(false);
      setLinkPatientData({ patient_name: "", patient_email: "", patient_phone: "" });
    },
    onError: (error: any) => {
      toast.error("Erro ao criar link: " + error.message);
    }
  });

  // Filter responses by search
  const filteredResponses = responses.filter(response => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      response.patient_name?.toLowerCase().includes(query) ||
      response.patient_email?.toLowerCase().includes(query) ||
      response.patient_phone?.includes(query) ||
      response.patient_prontuario?.includes(query)
    );
  });

  // NPS stats
  const npsResponses = responses.filter(r => r.nps_score !== null);
  const promoters = npsResponses.filter(r => r.nps_score! >= 9).length;
  const passives = npsResponses.filter(r => r.nps_score! >= 7 && r.nps_score! < 9).length;
  const detractors = npsResponses.filter(r => r.nps_score! < 7).length;
  const npsScore = npsResponses.length > 0 
    ? Math.round(((promoters - detractors) / npsResponses.length) * 100)
    : 0;

  const getSourceBadge = (source: string) => {
    const colors: Record<string, string> = {
      sistema: "bg-blue-500",
      typeform: "bg-purple-500",
      webhook: "bg-amber-500",
      tablet: "bg-green-500"
    };
    return (
      <Badge className={colors[source] || "bg-gray-500"}>
        {source}
      </Badge>
    );
  };

  const getNPSBadge = (score: number | null, category: string | null) => {
    if (score === null) return null;
    
    const config = {
      promotor: { icon: ThumbsUp, color: "text-green-500", bg: "bg-green-100" },
      neutro: { icon: Minus, color: "text-amber-500", bg: "bg-amber-100" },
      detrator: { icon: ThumbsDown, color: "text-red-500", bg: "bg-red-100" }
    };
    
    const cfg = config[category as keyof typeof config] || config.neutro;
    const Icon = cfg.icon;
    
    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded ${cfg.bg}`}>
        <Icon className={`h-4 w-4 ${cfg.color}`} />
        <span className={`font-semibold ${cfg.color}`}>{score}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Central de Formulários
          </h2>
          <p className="text-muted-foreground">
            Gerencie formulários e visualize respostas dos pacientes
          </p>
        </div>

        <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Gerar Link de Formulário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gerar Link de Formulário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium">Tipo de Formulário</label>
                <Select value={selectedTemplateForLink} onValueChange={setSelectedTemplateForLink}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o formulário" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Nome do Paciente (opcional)</label>
                <Input
                  value={linkPatientData.patient_name}
                  onChange={(e) => setLinkPatientData(p => ({ ...p, patient_name: e.target.value }))}
                  placeholder="Nome do paciente"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email (opcional)</label>
                <Input
                  type="email"
                  value={linkPatientData.patient_email}
                  onChange={(e) => setLinkPatientData(p => ({ ...p, patient_email: e.target.value }))}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Telefone (opcional)</label>
                <Input
                  value={linkPatientData.patient_phone}
                  onChange={(e) => setLinkPatientData(p => ({ ...p, patient_phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <Button 
                className="w-full" 
                onClick={() => {
                  if (!selectedTemplateForLink) {
                    toast.error("Selecione um formulário");
                    return;
                  }
                  createLinkMutation.mutate({
                    template_id: selectedTemplateForLink,
                    ...linkPatientData
                  });
                }}
                disabled={createLinkMutation.isPending}
              >
                {createLinkMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                Gerar e Copiar Link
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* NPS Summary Card */}
      {npsResponses.length > 0 && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-primary">{npsScore}</div>
                <div className="text-sm text-muted-foreground">NPS Score</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{npsResponses.length}</div>
                <div className="text-sm text-muted-foreground">Total Respostas</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{promoters}</div>
                <div className="text-sm text-muted-foreground">Promotores</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">{passives}</div>
                <div className="text-sm text-muted-foreground">Neutros</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{detractors}</div>
                <div className="text-sm text-muted-foreground">Detratores</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email, telefone ou prontuário..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedFormType} onValueChange={setSelectedFormType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tipo de formulário" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="nps">NPS</SelectItem>
            <SelectItem value="pre_op">Pré-Operatório</SelectItem>
            <SelectItem value="pos_op">Pós-Operatório</SelectItem>
            <SelectItem value="spa">Spa</SelectItem>
            <SelectItem value="pre_consulta">Pré-Consulta</SelectItem>
            <SelectItem value="tablet">Tablet</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Responses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Respostas Recebidas</CardTitle>
          <CardDescription>
            {filteredResponses.length} respostas encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Formulário</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>NPS</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResponses.map((response) => (
                  <TableRow key={response.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(response.submitted_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {response.form_templates?.name || response.form_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{response.patient_name || "—"}</div>
                        <div className="text-sm text-muted-foreground">
                          {response.patient_email || response.patient_phone || "—"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getSourceBadge(response.form_source)}</TableCell>
                    <TableCell>
                      {getNPSBadge(response.nps_score, response.nps_category)}
                    </TableCell>
                    <TableCell>
                      {response.crm_leads?.name ? (
                        <Badge variant="secondary" className="cursor-pointer">
                          {response.crm_leads.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedResponse(response)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>
                              Detalhes da Resposta
                            </DialogTitle>
                          </DialogHeader>
                          {selectedResponse && (
                            <ScrollArea className="max-h-[60vh]">
                              <div className="space-y-4 p-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm text-muted-foreground">Paciente</label>
                                    <p className="font-medium">{selectedResponse.patient_name || "—"}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm text-muted-foreground">Email</label>
                                    <p className="font-medium">{selectedResponse.patient_email || "—"}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm text-muted-foreground">Telefone</label>
                                    <p className="font-medium">{selectedResponse.patient_phone || "—"}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm text-muted-foreground">Prontuário</label>
                                    <p className="font-medium">{selectedResponse.patient_prontuario || "—"}</p>
                                  </div>
                                </div>

                                <div className="border-t pt-4">
                                  <h4 className="font-semibold mb-3">Respostas</h4>
                                  <div className="space-y-3">
                                    {Object.entries(selectedResponse.responses).map(([key, value]) => (
                                      <div key={key} className="bg-muted/50 p-3 rounded-lg">
                                        <label className="text-sm text-muted-foreground block mb-1">
                                          {key}
                                        </label>
                                        <p className="font-medium">
                                          {Array.isArray(value) 
                                            ? value.join(", ") 
                                            : typeof value === "object"
                                            ? JSON.stringify(value)
                                            : String(value)}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </ScrollArea>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredResponses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma resposta encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Webhook Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Integração via Webhook
          </CardTitle>
          <CardDescription>
            Use este endpoint para receber formulários do Typeform ou outras fontes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg font-mono text-sm flex items-center justify-between">
            <span className="truncate">
              {window.location.origin.replace('localhost', 'mbnjjwatnqjjqxogmaju.supabase.co')}/functions/v1/form-webhook?form=nps
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(
                  `https://mbnjjwatnqjjqxogmaju.supabase.co/functions/v1/form-webhook?form=nps`
                );
                toast.success("URL copiada!");
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Parâmetros aceitos: <code className="bg-muted px-1">form=</code> (nps, pre-operatorio, pos-operatorio, spa, pre-consulta, tablet)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}