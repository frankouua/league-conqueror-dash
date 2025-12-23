import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, ArrowRight, Book, Users, Target, FileText, MessageSquare, AlertTriangle, Gift, CreditCard, Copy, Check, ChevronDown, ChevronRight, Phone, Clock, Sparkles, Search, X, Filter, Star, StarOff, Crown, BarChart3, Calendar, Wrench, Lightbulb, AlertCircle, ClipboardCheck, UserCheck, PhoneCall, Heart } from "lucide-react";
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
import { COMMERCIAL_SCRIPTS, OBJECTION_HANDLERS, BENEFIT_PROJECTS, PAYMENT_CONDITIONS, COORDINATOR_DATA, StageScripts, ActionScript } from "@/constants/commercialScripts";
import ReactivationStrategies from "@/components/ReactivationStrategies";
import EngagementStrategies from "@/components/EngagementStrategies";
import InfluencerStrategies from "@/components/InfluencerStrategies";
import LoyaltyStrategies from "@/components/LoyaltyStrategies";

interface FavoriteScript {
  id: string;
  type: string;
  stageId: number;
  title: string;
  content: string;
  addedAt: string;
}

interface CopyHistoryItem {
  id: string;
  title: string;
  content: string;
  stageId: number;
  copiedAt: string;
}

const FAVORITES_KEY = "commercial-guides-favorites";
const COPY_HISTORY_KEY = "commercial-guides-copy-history";
const MAX_HISTORY_ITEMS = 10;

const CommercialGuides = () => {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<number | "coordinator">(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [favorites, setFavorites] = useState<FavoriteScript[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [copyHistory, setCopyHistory] = useState<CopyHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Carregar favoritos e histórico do localStorage
  useEffect(() => {
    const storedFavorites = localStorage.getItem(FAVORITES_KEY);
    if (storedFavorites) {
      try {
        setFavorites(JSON.parse(storedFavorites));
      } catch (e) {
        console.error("Erro ao carregar favoritos:", e);
      }
    }
    const storedHistory = localStorage.getItem(COPY_HISTORY_KEY);
    if (storedHistory) {
      try {
        setCopyHistory(JSON.parse(storedHistory));
      } catch (e) {
        console.error("Erro ao carregar histórico:", e);
      }
    }
  }, []);

  const saveFavorites = (newFavorites: FavoriteScript[]) => {
    setFavorites(newFavorites);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
  };

  const saveCopyHistory = (newHistory: CopyHistoryItem[]) => {
    setCopyHistory(newHistory);
    localStorage.setItem(COPY_HISTORY_KEY, JSON.stringify(newHistory));
  };

  const generateScriptId = (type: string, stageId: number, title: string) => {
    return `${type}-${stageId}-${title.replace(/\s+/g, '-').toLowerCase()}`;
  };

  const isFavorite = (type: string, stageId: number, title: string) => {
    const id = generateScriptId(type, stageId, title);
    return favorites.some(f => f.id === id);
  };

  const toggleFavorite = (type: string, stageId: number, title: string, content: string) => {
    const id = generateScriptId(type, stageId, title);
    const exists = favorites.find(f => f.id === id);
    if (exists) {
      saveFavorites(favorites.filter(f => f.id !== id));
      toast.success("Removido dos favoritos");
    } else {
      saveFavorites([...favorites, { id, type, stageId, title, content, addedAt: new Date().toISOString() }]);
      toast.success("Adicionado aos favoritos!");
    }
  };

  const addToCopyHistory = (title: string, content: string, stageId: number) => {
    const id = `${Date.now()}-${title.replace(/\s+/g, '-').toLowerCase()}`;
    const newItem: CopyHistoryItem = {
      id,
      title,
      content,
      stageId,
      copiedAt: new Date().toISOString()
    };
    // Remove duplicatas do mesmo título e limita a MAX_HISTORY_ITEMS
    const filteredHistory = copyHistory.filter(h => h.title !== title);
    const newHistory = [newItem, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS);
    saveCopyHistory(newHistory);
  };

  const clearCopyHistory = () => {
    saveCopyHistory([]);
    toast.success("Histórico limpo!");
  };

  const copyToClipboard = (text: string, label: string, title?: string, stageId?: number) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopiedText(null), 2000);
    
    // Adicionar ao histórico se tiver título
    if (title && stageId !== undefined) {
      addToCopyHistory(title, text, stageId);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "agora";
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    return `${diffDays}d atrás`;
  };

  const [showReactivation, setShowReactivation] = useState(false);
  const [showEngagement, setShowEngagement] = useState(false);
  const [showInfluencer, setShowInfluencer] = useState(false);
  const [showLoyalty, setShowLoyalty] = useState(false);

  const stageColors: Record<number, string> = {
    1: "from-blue-500 to-cyan-500",
    2: "from-indigo-500 to-purple-500",
    3: "from-pink-500 to-rose-500",
    4: "from-green-500 to-emerald-500",
    5: "from-amber-500 to-orange-500"
  };

  const stageIcons: Record<number, React.ReactNode> = {
    1: <Phone className="h-5 w-5" />,
    2: <MessageSquare className="h-5 w-5" />,
    3: <Target className="h-5 w-5" />,
    4: <Users className="h-5 w-5" />,
    5: <Sparkles className="h-5 w-5" />
  };

  const stageLabels: Record<number, { title: string; subtitle: string }> = {
    1: { title: "SDR", subtitle: "Leads Inbound" },
    2: { title: "Social Selling", subtitle: "Prospecção" },
    3: { title: "Closer", subtitle: "Fechamento" },
    4: { title: "Customer Success", subtitle: "Pós-Venda" },
    5: { title: "Farmer", subtitle: "Relacionamento" }
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

  const currentStage = typeof selectedStage === 'number' ? COMMERCIAL_SCRIPTS.find(s => s.stageId === selectedStage) : null;
  const isCoordinatorMode = selectedStage === "coordinator";

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
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant={showHistory ? "default" : "outline"}
              size="sm"
              onClick={() => { setShowHistory(!showHistory); setShowFavorites(false); }}
              className="gap-2"
            >
              <Clock className={`h-4 w-4`} />
              <span className="hidden sm:inline">Recentes</span>
              {copyHistory.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">{copyHistory.length}</Badge>
              )}
            </Button>
            <Button
              variant={showFavorites ? "default" : "outline"}
              size="sm"
              onClick={() => { setShowFavorites(!showFavorites); setShowHistory(false); }}
              className="gap-2"
            >
              <Star className={`h-4 w-4 ${showFavorites ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline">Favoritos</span>
              {favorites.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">{favorites.length}</Badge>
              )}
            </Button>
            <Badge variant="secondary" className="hidden md:inline-flex">Unique Plástica Avançada</Badge>
          </div>
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

        {/* Favorites Section */}
        {showFavorites && (
          <Card className="mb-6 border-yellow-500/30 bg-yellow-500/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  Meus Favoritos
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowFavorites(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>Scripts salvos para acesso rápido</CardDescription>
            </CardHeader>
            <CardContent>
              {favorites.length > 0 ? (
                <div className="space-y-3">
                  {favorites.map((fav) => (
                    <Card key={fav.id} className="border-border/50">
                      <CardHeader className="pb-2 pt-3 px-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              Comercial {fav.stageId}
                            </Badge>
                            <Badge variant="secondary" className="text-xs capitalize">
                              {fav.type === 'action' ? 'Ação' : fav.type === 'script' ? 'Script' : fav.type === 'objection' ? 'Objeção' : 'Projeto'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => copyToClipboard(fav.content, fav.id)}
                            >
                              {copiedText === fav.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-yellow-500 hover:text-red-500"
                              onClick={() => toggleFavorite(fav.type, fav.stageId, fav.title, fav.content)}
                            >
                              <StarOff className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="font-medium text-sm">{fav.title}</p>
                      </CardHeader>
                      <CardContent className="px-4 pb-3">
                        <div className="bg-muted/30 rounded-lg p-2 text-xs whitespace-pre-wrap max-h-[100px] overflow-y-auto">
                          {fav.content.slice(0, 200)}{fav.content.length > 200 ? '...' : ''}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum favorito salvo ainda</p>
                  <p className="text-sm">Clique na estrela ao lado dos scripts para salvá-los</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Copy History Section */}
        {showHistory && (
          <Card className="mb-6 border-blue-500/30 bg-blue-500/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-blue-500" />
                  Copiados Recentemente
                </CardTitle>
                <div className="flex items-center gap-2">
                  {copyHistory.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearCopyHistory} className="text-muted-foreground hover:text-destructive">
                      Limpar
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>Últimos {MAX_HISTORY_ITEMS} scripts copiados</CardDescription>
            </CardHeader>
            <CardContent>
              {copyHistory.length > 0 ? (
                <div className="space-y-3">
                  {copyHistory.map((item) => (
                    <Card key={item.id} className="border-border/50">
                      <CardHeader className="pb-2 pt-3 px-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              Comercial {item.stageId}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(item.copiedAt)}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => copyToClipboard(item.content, item.id)}
                          >
                            {copiedText === item.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                        <p className="font-medium text-sm">{item.title}</p>
                      </CardHeader>
                      <CardContent className="px-4 pb-3">
                        <div className="bg-muted/30 rounded-lg p-2 text-xs whitespace-pre-wrap max-h-[80px] overflow-y-auto">
                          {item.content.slice(0, 150)}{item.content.length > 150 ? '...' : ''}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum script copiado ainda</p>
                  <p className="text-sm">Copie scripts para acessá-los rapidamente aqui</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
                    <div className="flex justify-end mt-3 gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavorite(result.type, result.stageId, result.title, result.content)}
                        className={isFavorite(result.type, result.stageId, result.title) ? 'text-yellow-500' : ''}
                      >
                        <Star className={`h-4 w-4 mr-1 ${isFavorite(result.type, result.stageId, result.title) ? 'fill-current' : ''}`} />
                        {isFavorite(result.type, result.stageId, result.title) ? 'Favoritado' : 'Favoritar'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(result.content, `result-${index}`, result.title, result.stageId)}
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
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
              {COMMERCIAL_SCRIPTS.map((stage) => (
                <button
                  key={stage.stageId}
                  onClick={() => { setSelectedStage(stage.stageId); setShowReactivation(false); setShowEngagement(false); setShowInfluencer(false); setShowLoyalty(false); }}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                    selectedStage === stage.stageId && !showReactivation && !showEngagement && !showInfluencer && !showLoyalty
                      ? "border-primary bg-primary/10 shadow-lg scale-[1.02]"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stageColors[stage.stageId]} flex items-center justify-center text-white mb-2`}>
                    {stageIcons[stage.stageId]}
                  </div>
                  <p className="text-sm font-semibold text-left">{stageLabels[stage.stageId]?.title || `Comercial ${stage.stageId}`}</p>
                  <p className="text-xs text-muted-foreground text-left truncate">
                    {stageLabels[stage.stageId]?.subtitle || stage.title}
                  </p>
                </button>
              ))}
              {/* Coordinator Button */}
              <button
                onClick={() => { setSelectedStage("coordinator"); setShowReactivation(false); setShowEngagement(false); setShowInfluencer(false); setShowLoyalty(false); }}
                className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                  selectedStage === "coordinator" && !showReactivation && !showEngagement && !showInfluencer && !showLoyalty
                    ? "border-amber-500 bg-amber-500/10 shadow-lg scale-[1.02]"
                    : "border-border hover:border-amber-500/50 hover:bg-muted/50"
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center text-white mb-2">
                  <Crown className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-left">Coordenador</p>
                <p className="text-xs text-muted-foreground text-left truncate">
                  Gestão Comercial
                </p>
              </button>
              {/* Reactivation Button */}
              <button
                onClick={() => { setShowReactivation(true); setShowEngagement(false); setShowInfluencer(false); setShowLoyalty(false); }}
                className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                  showReactivation
                    ? "border-rose-500 bg-rose-500/10 shadow-lg scale-[1.02]"
                    : "border-border hover:border-rose-500/50 hover:bg-muted/50"
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white mb-2">
                  <Wrench className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-left">Reativação</p>
                <p className="text-xs text-muted-foreground text-left truncate">
                  Leads & Pacientes
                </p>
              </button>
              {/* Engagement Button */}
              <button
                onClick={() => { setShowEngagement(true); setShowReactivation(false); setShowInfluencer(false); setShowLoyalty(false); }}
                className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                  showEngagement
                    ? "border-emerald-500 bg-emerald-500/10 shadow-lg scale-[1.02]"
                    : "border-border hover:border-emerald-500/50 hover:bg-muted/50"
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white mb-2">
                  <Gift className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-left">Engajamento</p>
                <p className="text-xs text-muted-foreground text-left truncate">
                  Indicações & Depoimentos
                </p>
              </button>
              {/* Influencer Button */}
              <button
                onClick={() => { setShowInfluencer(true); setShowReactivation(false); setShowEngagement(false); setShowLoyalty(false); }}
                className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                  showInfluencer
                    ? "border-violet-500 bg-violet-500/10 shadow-lg scale-[1.02]"
                    : "border-border hover:border-violet-500/50 hover:bg-muted/50"
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white mb-2">
                  <Sparkles className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-left">Influencers</p>
                <p className="text-xs text-muted-foreground text-left truncate">
                  UNI Influencers
                </p>
              </button>
              {/* Loyalty Button */}
              <button
                onClick={() => { setShowLoyalty(true); setShowReactivation(false); setShowEngagement(false); setShowInfluencer(false); }}
                className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                  showLoyalty
                    ? "border-pink-500 bg-pink-500/10 shadow-lg scale-[1.02]"
                    : "border-border hover:border-pink-500/50 hover:bg-muted/50"
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white mb-2">
                  <Heart className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-left">Fidelização</p>
                <p className="text-xs text-muted-foreground text-left truncate">
                  RFV + UniLovers
                </p>
              </button>
            </div>

            {/* Reactivation Content */}
            {showReactivation && <ReactivationStrategies />}

            {/* Engagement Content */}
            {showEngagement && <EngagementStrategies />}

            {/* Influencer Content */}
            {showInfluencer && <InfluencerStrategies />}

            {/* Loyalty Content */}
            {showLoyalty && <LoyaltyStrategies />}

        {currentStage && !showReactivation && !showEngagement && !showInfluencer && !showLoyalty && (
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
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleFavorite('action', currentStage.stageId, action.action, action.script!)}
                                        className={`h-7 px-2 ${isFavorite('action', currentStage.stageId, action.action) ? 'text-yellow-500' : ''}`}
                                      >
                                        <Star className={`h-3 w-3 ${isFavorite('action', currentStage.stageId, action.action) ? 'fill-current' : ''}`} />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(action.script!, `action-${index}`, action.action, currentStage.stageId)}
                                        className="h-7 px-2"
                                      >
                                        {copiedText === `action-${index}` ? (
                                          <Check className="h-3 w-3 text-green-500" />
                                        ) : (
                                          <Copy className="h-3 w-3" />
                                        )}
                                      </Button>
                                    </div>
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
                            onClick={() => copyToClipboard(currentStage.transitionScript!, 'transition', 'Script de Transição', currentStage.stageId)}
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
                        <div className="bg-blue-100 dark:bg-blue-900/50 rounded-lg p-4 border-l-4 border-blue-500">
                          <pre className="text-sm whitespace-pre-wrap font-sans text-blue-900 dark:text-white">
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
                            onClick={() => copyToClipboard(currentStage.notificationTemplate!, 'notification', 'Template de Notificação', currentStage.stageId)}
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
                        <div className="bg-purple-100 dark:bg-purple-900/50 rounded-lg p-4 border-l-4 border-purple-500">
                          <pre className="text-sm whitespace-pre-wrap font-sans text-purple-900 dark:text-white">
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
                            <div className="bg-green-100 dark:bg-green-900/50 rounded-lg p-3 text-sm whitespace-pre-wrap border-l-4 border-green-500 text-green-900 dark:text-white">
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
                              <div className="bg-green-100 dark:bg-green-900/50 rounded-lg p-4 text-sm whitespace-pre-wrap border-l-4 border-green-500 text-green-900 dark:text-white">
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

            {/* Coordinator Content */}
            {isCoordinatorMode && (
              <div className="space-y-6">
                {/* Coordinator Header */}
                <Card className="bg-gradient-to-br from-amber-500 to-yellow-500 text-white border-0">
                  <CardHeader>
                    <CardTitle className="text-2xl flex items-center gap-3">
                      <Crown className="h-8 w-8" />
                      Coordenador Comercial
                    </CardTitle>
                    <CardDescription className="text-white/90">
                      {COORDINATOR_DATA.mission}
                    </CardDescription>
                  </CardHeader>
                </Card>

                {/* Coordinator Tabs */}
                <Tabs defaultValue="attributes" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-3 md:grid-cols-7 h-auto gap-1">
                    <TabsTrigger value="attributes" className="gap-2">
                      <Users className="h-4 w-4" />
                      <span className="hidden sm:inline">Perfil</span>
                    </TabsTrigger>
                    <TabsTrigger value="metrics" className="gap-2">
                      <BarChart3 className="h-4 w-4" />
                      <span className="hidden sm:inline">Métricas</span>
                    </TabsTrigger>
                    <TabsTrigger value="rituals" className="gap-2">
                      <Calendar className="h-4 w-4" />
                      <span className="hidden sm:inline">Rituais</span>
                    </TabsTrigger>
                    <TabsTrigger value="scripts" className="gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="hidden sm:inline">Scripts</span>
                    </TabsTrigger>
                    <TabsTrigger value="checklists" className="gap-2">
                      <ClipboardCheck className="h-4 w-4" />
                      <span className="hidden sm:inline">Checklists</span>
                    </TabsTrigger>
                    <TabsTrigger value="tools" className="gap-2">
                      <Wrench className="h-4 w-4" />
                      <span className="hidden sm:inline">Ferramentas</span>
                    </TabsTrigger>
                    <TabsTrigger value="tips" className="gap-2">
                      <Lightbulb className="h-4 w-4" />
                      <span className="hidden sm:inline">Supervisão</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Attributes Tab */}
                  <TabsContent value="attributes">
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Crown className="h-5 w-5 text-amber-500" />
                            Atribuições do Coordenador
                          </CardTitle>
                          <CardDescription>
                            O Coordenador é o maestro da orquestra comercial
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-3 md:grid-cols-2">
                            {COORDINATOR_DATA.attributes.map((attr, index) => (
                              <div key={index} className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                                  <span className="text-amber-600 dark:text-amber-400 font-bold text-sm">{index + 1}</span>
                                </div>
                                <span className="text-sm text-amber-900 dark:text-amber-100">{attr}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* KPIs by Team */}
                      {COORDINATOR_DATA.kpisByTeam && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <BarChart3 className="h-5 w-5 text-blue-500" />
                              KPIs por Equipe
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                              {COORDINATOR_DATA.kpisByTeam.map((team, index) => (
                                <div key={index} className="p-4 border rounded-lg">
                                  <h4 className="font-semibold text-primary mb-3">{team.team}</h4>
                                  <ul className="space-y-2">
                                    {team.kpis.map((kpi, i) => (
                                      <li key={i} className="flex items-start gap-2 text-sm">
                                        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-muted-foreground">{kpi}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Handoff Flow */}
                      {COORDINATOR_DATA.handoffFlow && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <ArrowRight className="h-5 w-5 text-purple-500" />
                              Fluxo de Passagem de Bastão
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {COORDINATOR_DATA.handoffFlow.map((flow, index) => (
                                <div key={index} className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                                  <Badge variant="outline" className="font-semibold">{flow.from}</Badge>
                                  <ArrowRight className="h-4 w-4 text-purple-500" />
                                  <Badge variant="outline" className="font-semibold">{flow.to}</Badge>
                                  <span className="text-sm text-muted-foreground flex-1">{flow.trigger}</span>
                                  <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                                    {flow.maxTime}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>

                  {/* Metrics Tab */}
                  <TabsContent value="metrics">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-blue-500" />
                          Métricas de Performance
                        </CardTitle>
                        <CardDescription>
                          KPIs que o coordenador deve acompanhar diariamente
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 md:grid-cols-2">
                          {COORDINATOR_DATA.metrics.map((metric, index) => (
                            <div
                              key={index}
                              className="p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-semibold text-blue-900 dark:text-blue-100">{metric.name}</h4>
                                {metric.target && (
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                    Meta: {metric.target}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{metric.description}</p>
                              {metric.formula && (
                                <div className="mt-2 p-2 bg-white/50 dark:bg-white/5 rounded text-xs font-mono text-blue-800 dark:text-blue-200">
                                  {metric.formula}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Rituals Tab */}
                  <TabsContent value="rituals">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-purple-500" />
                          Rituais de Gestão
                        </CardTitle>
                        <CardDescription>
                          Reuniões e rotinas que garantem alinhamento e performance
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Accordion type="single" collapsible className="space-y-2">
                          {COORDINATOR_DATA.rituals.map((ritual, index) => (
                            <AccordionItem
                              key={index}
                              value={`ritual-${index}`}
                              className="border rounded-lg px-4"
                            >
                              <AccordionTrigger className="hover:no-underline py-4">
                                <div className="flex items-start gap-3 text-left">
                                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex-shrink-0">
                                    <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium">{ritual.name}</p>
                                    <Badge variant="outline" className="mt-1 text-xs">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {ritual.frequency}
                                    </Badge>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pb-4">
                                <div className="space-y-4 pl-13">
                                  <p className="text-sm text-muted-foreground">{ritual.description}</p>
                                  
                                  {ritual.participants && ritual.participants.length > 0 && (
                                    <div>
                                      <p className="text-sm font-medium mb-2">Participantes:</p>
                                      <div className="flex flex-wrap gap-2">
                                        {ritual.participants.map((p, i) => (
                                          <Badge key={i} variant="secondary">{p}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {ritual.agenda && ritual.agenda.length > 0 && (
                                    <div>
                                      <p className="text-sm font-medium mb-2">Pauta:</p>
                                      <ul className="space-y-1">
                                        {ritual.agenda.map((item, i) => (
                                          <li key={i} className="flex items-center gap-2 text-sm">
                                            <div className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs font-bold text-purple-600 dark:text-purple-400">
                                              {i + 1}
                                            </div>
                                            {item}
                                          </li>
                                        ))}
                                      </ul>
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
                    <div className="space-y-4">
                      {/* Rescue Process */}
                      {COORDINATOR_DATA.rescueProcess && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <PhoneCall className="h-5 w-5 text-red-500" />
                              {COORDINATOR_DATA.rescueProcess.title}
                            </CardTitle>
                            <CardDescription>{COORDINATOR_DATA.rescueProcess.description}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
                              <h4 className="font-semibold text-red-900 dark:text-red-100 mb-3">Passo a Passo:</h4>
                              <ul className="space-y-2">
                                {COORDINATOR_DATA.rescueProcess.steps.map((step, i) => (
                                  <li key={i} className="text-sm text-red-800 dark:text-red-200">{step}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Script WhatsApp de Resgate:</h4>
                              <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-line">{COORDINATOR_DATA.rescueProcess.whatsappScript}</p>
                              <Button size="sm" variant="outline" className="mt-2" onClick={() => { navigator.clipboard.writeText(COORDINATOR_DATA.rescueProcess!.whatsappScript); toast.success("Script copiado!"); }}>
                                <Copy className="h-3 w-3 mr-1" /> Copiar
                              </Button>
                            </div>
                            <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                              <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">Script de Ligação:</h4>
                              <div className="space-y-3 text-sm text-green-800 dark:text-green-200">
                                <div><strong>Abertura:</strong> {COORDINATOR_DATA.rescueProcess.callScript.abertura}</div>
                                <div><strong>Diagnóstico:</strong> {COORDINATOR_DATA.rescueProcess.callScript.diagnostico}</div>
                                <div><strong>Fechamento:</strong> {COORDINATOR_DATA.rescueProcess.callScript.fechamento}</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Feedback Script */}
                      {COORDINATOR_DATA.feedbackScript && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <UserCheck className="h-5 w-5 text-purple-500" />
                              {COORDINATOR_DATA.feedbackScript.title}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3 p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg text-sm text-purple-800 dark:text-purple-200">
                              <div><strong>Abertura:</strong> {COORDINATOR_DATA.feedbackScript.abertura}</div>
                              <div><strong>Análise de Performance:</strong> {COORDINATOR_DATA.feedbackScript.analisePerformance}</div>
                              <div><strong>Feedback Específico:</strong> {COORDINATOR_DATA.feedbackScript.feedbackEspecifico}</div>
                              <div><strong>Plano de Ação:</strong> {COORDINATOR_DATA.feedbackScript.planoAcao}</div>
                              <div><strong>Fechamento:</strong> {COORDINATOR_DATA.feedbackScript.fechamento}</div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>

                  {/* Checklists Tab */}
                  <TabsContent value="checklists">
                    <div className="space-y-4">
                      {COORDINATOR_DATA.dailyChecklist && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <ClipboardCheck className="h-5 w-5 text-amber-500" />
                              Checklist Diário do Coordenador
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {COORDINATOR_DATA.dailyChecklist.map((item, i) => (
                                <li key={i} className="flex items-center gap-3 p-2 bg-amber-50 dark:bg-amber-950/30 rounded text-sm">
                                  <Check className="h-4 w-4 text-amber-600" />
                                  <span className="text-amber-900 dark:text-amber-100">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {COORDINATOR_DATA.weeklyAudit && (
                        <Card>
                          <CardHeader>
                            <CardTitle>{COORDINATOR_DATA.weeklyAudit.title}</CardTitle>
                            <CardDescription>{COORDINATOR_DATA.weeklyAudit.description}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {COORDINATOR_DATA.weeklyAudit.checklist.map((item, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" />{item}</li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {COORDINATOR_DATA.weeklyReport && (
                        <Card>
                          <CardHeader>
                            <CardTitle>{COORDINATOR_DATA.weeklyReport.title}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {COORDINATOR_DATA.weeklyReport.sections.map((item, i) => (
                                <li key={i} className="text-sm text-muted-foreground">{item}</li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>

                  {/* Tools Tab */}
                  <TabsContent value="tools">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Wrench className="h-5 w-5 text-green-500" />
                          Ferramentas de Gestão
                        </CardTitle>
                        <CardDescription>
                          Sistemas e recursos utilizados no dia a dia
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 md:grid-cols-2">
                          {COORDINATOR_DATA.tools.map((tool, index) => (
                            <div
                              key={index}
                              className="p-4 border rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30"
                            >
                              <h4 className="font-semibold text-green-900 dark:text-green-100 flex items-center gap-2">
                                <Wrench className="h-4 w-4" />
                                {tool.name}
                              </h4>
                              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                <strong>Finalidade:</strong> {tool.purpose}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                <strong>Uso:</strong> {tool.usage}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Escalation Protocol */}
                    <Card className="mt-4">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-red-500" />
                          Protocolo de Escalação
                        </CardTitle>
                        <CardDescription>
                          Como agir em situações críticas
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {COORDINATOR_DATA.escalationProtocol.map((protocol, index) => (
                            <div
                              key={index}
                              className="p-4 border rounded-lg bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-red-900 dark:text-red-100">{protocol.situation}</h4>
                                  <p className="text-sm text-muted-foreground mt-1">{protocol.action}</p>
                                </div>
                                <Badge variant="outline" className="flex-shrink-0 border-red-300 text-red-700 dark:border-red-700 dark:text-red-300">
                                  <Clock className="h-3 w-3 mr-1" />
                                  SLA: {protocol.sla}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Tips Tab */}
                  <TabsContent value="tips">
                    <div className="grid gap-4 md:grid-cols-2">
                      {COORDINATOR_DATA.managementTips.map((category, index) => (
                        <Card key={index}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Lightbulb className="h-5 w-5 text-yellow-500" />
                              {category.category}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {category.tips.map((tip, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <Sparkles className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      ))}
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
