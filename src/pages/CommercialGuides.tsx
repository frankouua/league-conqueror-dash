import { useState, useMemo } from "react";
import { ArrowLeft, Book, Users, Target, FileText, MessageSquare, AlertTriangle, Gift, CreditCard, Copy, Check, ChevronDown, ChevronRight, Phone, Clock, Sparkles, Search, X, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { COMMERCIAL_SCRIPTS, OBJECTION_HANDLERS, BENEFIT_PROJECTS, PAYMENT_CONDITIONS, StageScripts, ActionScript } from "@/constants/commercialScripts";

const CommercialGuides = () => {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopiedText(null), 2000);
  };

  const stageColors: Record<number, string> = {
    1: "from-blue-500 to-cyan-500",
    2: "from-purple-500 to-pink-500",
    3: "from-green-500 to-emerald-500",
    4: "from-amber-500 to-orange-500"
  };

  const stageIcons: Record<number, React.ReactNode> = {
    1: <Phone className="h-5 w-5" />,
    2: <Target className="h-5 w-5" />,
    3: <Users className="h-5 w-5" />,
    4: <Sparkles className="h-5 w-5" />
  };

  // Função de busca
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const results: { type: string; stageId: number; title: string; content: string }[] = [];

    COMMERCIAL_SCRIPTS.forEach((stage) => {
      stage.actions.forEach((action) => {
        if (action.action.toLowerCase().includes(query) || action.script?.toLowerCase().includes(query) || action.description?.toLowerCase().includes(query)) {
          results.push({ type: 'action', stageId: stage.stageId, title: action.action, content: action.script || action.description || '' });
        }
      });
      if (stage.transitionScript?.toLowerCase().includes(query)) {
        results.push({ type: 'script', stageId: stage.stageId, title: 'Script de Transição', content: stage.transitionScript });
      }
    });

    OBJECTION_HANDLERS.forEach((obj) => {
      if (obj.objection.toLowerCase().includes(query) || obj.response.toLowerCase().includes(query)) {
        results.push({ type: 'objection', stageId: 2, title: obj.objection, content: obj.response });
      }
    });

    BENEFIT_PROJECTS.forEach((proj) => {
      if (proj.name.toLowerCase().includes(query) || proj.description.toLowerCase().includes(query)) {
        results.push({ type: 'project', stageId: 2, title: proj.name, content: proj.description });
      }
    });

    return filterType === 'all' ? results : results.filter(r => r.type === filterType);
  }, [searchQuery, filterType]);

  const isSearchMode = searchQuery.trim().length > 0;

  const currentStage = COMMERCIAL_SCRIPTS.find(s => s.stageId === selectedStage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center gap-4 px-4">
          <Link to="/patient-kanban">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Book className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Guias Comerciais</h1>
          </div>
          <Badge variant="secondary" className="ml-auto">
            Unique Plástica Avançada
          </Badge>
        </div>
      </header>

      <main className="container px-4 py-6">
        {/* Search Bar */}
        <Card className="mb-6 border-primary/20 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar scripts, objeções, dossiês..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background/50"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[180px] bg-background/50">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="action">Ações</SelectItem>
                  <SelectItem value="script">Scripts</SelectItem>
                  <SelectItem value="objection">Objeções</SelectItem>
                  <SelectItem value="project">Projetos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isSearchMode && (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">{searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''}</Badge>
                <span>encontrado{searchResults.length !== 1 ? 's' : ''} para "{searchQuery}"</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search Results */}
        {isSearchMode ? (
          <div className="space-y-4">
            {searchResults.length > 0 ? (
              searchResults.map((result, index) => (
                <Card key={index} className="border-border/50 hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={
                        result.type === 'action' ? 'border-blue-500 text-blue-500' :
                        result.type === 'script' ? 'border-green-500 text-green-500' :
                        result.type === 'objection' ? 'border-orange-500 text-orange-500' :
                        'border-purple-500 text-purple-500'
                      }>
                        {result.type === 'action' && <FileText className="h-3 w-3 mr-1" />}
                        {result.type === 'script' && <MessageSquare className="h-3 w-3 mr-1" />}
                        {result.type === 'objection' && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {result.type === 'project' && <Gift className="h-3 w-3 mr-1" />}
                        {result.type === 'action' ? 'Ação' : result.type === 'script' ? 'Script' : result.type === 'objection' ? 'Objeção' : 'Projeto'}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Comercial {result.stageId}
                      </Badge>
                    </div>
                    <CardTitle className="text-base">{result.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/30 rounded-lg p-3 text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                      {result.content}
                    </div>
                    <div className="flex justify-end mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(result.content, `result-${index}`)}
                      >
                        {copiedText === `result-${index}` ? (
                          <><Check className="h-4 w-4 mr-1 text-green-500" /> Copiado</>
                        ) : (
                          <><Copy className="h-4 w-4 mr-1" /> Copiar</>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum resultado encontrado</h3>
                  <p className="text-muted-foreground mb-4">
                    Tente buscar por outros termos ou altere o filtro
                  </p>
                  <Button variant="outline" onClick={() => { setSearchQuery(""); setFilterType("all"); }}>
                    Limpar busca
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <>
            {/* Stage Selector */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {COMMERCIAL_SCRIPTS.map((stage) => (
                <button
                  key={stage.stageId}
                  onClick={() => setSelectedStage(stage.stageId)}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                    selectedStage === stage.stageId
                      ? "border-primary bg-primary/10 shadow-lg scale-[1.02]"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stageColors[stage.stageId]} flex items-center justify-center text-white mb-2`}>
                    {stageIcons[stage.stageId]}
                  </div>
                  <p className="text-sm font-semibold text-left">Comercial {stage.stageId}</p>
                  <p className="text-xs text-muted-foreground text-left truncate">
                    {stage.stageId === 1 && "SDR / Social Selling"}
                    {stage.stageId === 2 && "Closer"}
                    {stage.stageId === 3 && "Customer Success"}
                    {stage.stageId === 4 && "Farmer"}
                  </p>
                </button>
              ))}
            </div>

        {currentStage && (
          <div className="space-y-6">
            {/* Stage Header */}
            <Card className={`bg-gradient-to-br ${stageColors[currentStage.stageId]} text-white border-0`}>
              <CardHeader>
                <CardTitle className="text-2xl">{currentStage.title}</CardTitle>
                <CardDescription className="text-white/90">
                  {currentStage.mission}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-white/80">
                  <Target className="h-4 w-4" />
                  <span className="text-sm font-medium">Objetivo: {currentStage.objective}</span>
                </div>
              </CardContent>
            </Card>

            {/* Content Tabs */}
            <Tabs defaultValue="actions" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto gap-1">
                <TabsTrigger value="actions" className="gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Ações</span>
                </TabsTrigger>
                <TabsTrigger value="scripts" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Scripts</span>
                </TabsTrigger>
                <TabsTrigger value="dossier" className="gap-2">
                  <Book className="h-4 w-4" />
                  <span className="hidden sm:inline">Dossiê</span>
                </TabsTrigger>
                <TabsTrigger value="objections" className="gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="hidden sm:inline">Objeções</span>
                </TabsTrigger>
                <TabsTrigger value="benefits" className="gap-2">
                  <Gift className="h-4 w-4" />
                  <span className="hidden sm:inline">Projetos</span>
                </TabsTrigger>
              </TabsList>

              {/* Actions Tab */}
              <TabsContent value="actions">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Ações e Checklist
                    </CardTitle>
                    <CardDescription>
                      Todas as ações desta etapa com detalhes e SLAs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="space-y-2">
                      {currentStage.actions.map((action, index) => (
                        <AccordionItem 
                          key={index} 
                          value={`action-${index}`}
                          className="border rounded-lg px-4"
                        >
                          <AccordionTrigger className="hover:no-underline py-4">
                            <div className="flex items-start gap-3 text-left">
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold flex-shrink-0">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{action.action}</p>
                                {action.sla && (
                                  <Badge variant="outline" className="mt-1 text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    SLA: {action.sla}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-4">
                            <div className="space-y-4 pl-9">
                              {action.description && (
                                <p className="text-muted-foreground">{action.description}</p>
                              )}
                              
                              {action.checklist && action.checklist.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-sm font-semibold text-primary">Checklist:</p>
                                  <ul className="space-y-1">
                                    {action.checklist.map((item, i) => (
                                      <li key={i} className="flex items-start gap-2 text-sm">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {action.tips && action.tips.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-sm font-semibold text-amber-600">Dicas:</p>
                                  <ul className="space-y-1">
                                    {action.tips.map((tip, i) => (
                                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <Sparkles className="h-3 w-3 mt-1 text-amber-500 flex-shrink-0" />
                                        {tip}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {action.script && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-green-600">Script:</p>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyToClipboard(action.script!, `action-${index}`)}
                                      className="h-7 px-2"
                                    >
                                      {copiedText === `action-${index}` ? (
                                        <Check className="h-3 w-3 text-green-500" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </div>
                                  <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap border-l-4 border-green-500">
                                    {action.script}
                                  </div>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Scripts Tab */}
              <TabsContent value="scripts">
                <div className="grid gap-4">
                  {/* Transition Script */}
                  {currentStage.transitionScript && (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <MessageSquare className="h-5 w-5 text-blue-500" />
                            Script de Transição para Paciente
                          </CardTitle>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(currentStage.transitionScript!, 'transition')}
                          >
                            {copiedText === 'transition' ? (
                              <><Check className="h-4 w-4 mr-1 text-green-500" /> Copiado</>
                            ) : (
                              <><Copy className="h-4 w-4 mr-1" /> Copiar</>
                            )}
                          </Button>
                        </div>
                        <CardDescription>
                          Mensagem para preparar o paciente para a próxima etapa
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-lg p-4 border-l-4 border-blue-500">
                          <pre className="text-sm whitespace-pre-wrap font-sans">
                            {currentStage.transitionScript}
                          </pre>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Notification Template */}
                  {currentStage.notificationTemplate && (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Users className="h-5 w-5 text-purple-500" />
                            Modelo de Notificação para Equipe
                          </CardTitle>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(currentStage.notificationTemplate!, 'notification')}
                          >
                            {copiedText === 'notification' ? (
                              <><Check className="h-4 w-4 mr-1 text-green-500" /> Copiado</>
                            ) : (
                              <><Copy className="h-4 w-4 mr-1" /> Copiar</>
                            )}
                          </Button>
                        </div>
                        <CardDescription>
                          Modelo para notificar o próximo comercial com dossiê
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-lg p-4 border-l-4 border-purple-500">
                          <pre className="text-sm whitespace-pre-wrap font-sans">
                            {currentStage.notificationTemplate}
                          </pre>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* All Scripts from Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <FileText className="h-5 w-5 text-green-500" />
                        Scripts das Ações
                      </CardTitle>
                      <CardDescription>
                        Todos os scripts disponíveis para esta etapa
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {currentStage.actions
                        .filter(a => a.script)
                        .map((action, index) => (
                          <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm">{action.action}</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(action.script!, `script-${index}`)}
                                className="h-7"
                              >
                                {copiedText === `script-${index}` ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap border-l-4 border-green-500">
                              {action.script}
                            </div>
                          </div>
                        ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Dossier Tab */}
              <TabsContent value="dossier">
                {currentStage.dossier && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Book className="h-5 w-5 text-amber-500" />
                        {currentStage.dossier.title}
                      </CardTitle>
                      <CardDescription>
                        Campos obrigatórios para preenchimento antes da passagem de bastão
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3">
                        {currentStage.dossier.fields.map((field, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border"
                          >
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 text-sm font-bold">
                              {index + 1}
                            </div>
                            <span className="font-medium">{field}</span>
                          </div>
                        ))}
                      </div>
                      
                      <Separator className="my-6" />
                      
                      <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          <strong>Importante:</strong> Preencha todos os campos antes de passar o lead para a próxima etapa. Um dossiê incompleto pode comprometer a experiência do paciente.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Objections Tab */}
              <TabsContent value="objections">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      Quebra de Objeções
                    </CardTitle>
                    <CardDescription>
                      Respostas prontas para as objeções mais comuns
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="space-y-2">
                      {OBJECTION_HANDLERS.map((handler, index) => (
                        <AccordionItem
                          key={index}
                          value={`objection-${index}`}
                          className="border rounded-lg px-4"
                        >
                          <AccordionTrigger className="hover:no-underline py-4">
                            <div className="flex items-center gap-3 text-left">
                              <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                              <span className="font-medium">"{handler.objection}"</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-green-600">Resposta sugerida:</p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(handler.response, `objection-${index}`)}
                                  className="h-7"
                                >
                                  {copiedText === `objection-${index}` ? (
                                    <Check className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 text-sm whitespace-pre-wrap border-l-4 border-green-500">
                                {handler.response}
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Benefits Tab */}
              <TabsContent value="benefits">
                <div className="grid gap-4">
                  {/* Projects */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Gift className="h-5 w-5 text-purple-500" />
                        Projetos com Benefícios
                      </CardTitle>
                      <CardDescription>
                        Ofereça participação em projetos para desbloquear benefícios (máximo 2 projetos = 10%)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3">
                        {BENEFIT_PROJECTS.map((project, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-lg border border-purple-200 dark:border-purple-800"
                          >
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold text-sm flex-shrink-0">
                              {project.benefit}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-purple-700 dark:text-purple-300">
                                {project.name}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {project.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment Conditions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-green-500" />
                        Condições de Pagamento
                      </CardTitle>
                      <CardDescription>
                        Tabela de benefícios por forma de pagamento
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="text-left p-3 border rounded-tl-lg">Condição</th>
                              <th className="text-center p-3 border">PIX à vista</th>
                              <th className="text-center p-3 border rounded-tr-lg">Cartão</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="p-3 border font-medium">Sem projeto</td>
                              <td className="p-3 border text-center">
                                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                  {PAYMENT_CONDITIONS.withoutProject.pix}
                                </Badge>
                              </td>
                              <td className="p-3 border text-center text-muted-foreground">
                                {PAYMENT_CONDITIONS.withoutProject.card}
                              </td>
                            </tr>
                            <tr className="bg-muted/30">
                              <td className="p-3 border font-medium">Com 1 projeto (5%)</td>
                              <td className="p-3 border text-center">
                                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                  {PAYMENT_CONDITIONS.withOneProject.pix}
                                </Badge>
                              </td>
                              <td className="p-3 border text-center">
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                  {PAYMENT_CONDITIONS.withOneProject.card}
                                </Badge>
                              </td>
                            </tr>
                            <tr>
                              <td className="p-3 border font-medium rounded-bl-lg">Com 2 projetos (10%)</td>
                              <td className="p-3 border text-center">
                                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                  {PAYMENT_CONDITIONS.withTwoProjects.pix}
                                </Badge>
                              </td>
                              <td className="p-3 border text-center rounded-br-lg">
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                  {PAYMENT_CONDITIONS.withTwoProjects.card}
                                </Badge>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          <strong>Regra de ouro:</strong> Nunca use a palavra "desconto". Sempre fale em "benefício" ou "condição especial".
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
          </>
        )}
      </main>
    </div>
  );
};

export default CommercialGuides;
