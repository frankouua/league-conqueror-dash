import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Smartphone, 
  Trophy, 
  Star, 
  Infinity,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Cloud,
  MessageCircle,
  Handshake,
  Crown,
  TreeDeciduous
} from "lucide-react";
import { useState } from "react";
import { useJourneyChecklist } from "@/hooks/useJourneyChecklist";

const journeyStages = [
  {
    id: 1,
    title: "Comercial 1 - Captação",
    subtitle: "Lead → Consulta Agendada",
    icon: Smartphone,
    secondaryIcon: MessageCircle,
    color: "from-primary to-yellow-600",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
    accentColor: "text-primary",
    team: ["Comercial"],
    actions: [
      "Social Selling",
      "WhatsApp",
      "Encantar paciente",
      "Follow-up de leads"
    ],
    indicators: ["Indicações coletadas", "Menções no Instagram"]
  },
  {
    id: 2,
    title: "Comercial 2 - Closer",
    subtitle: "Consulta → Fechamento",
    icon: Trophy,
    secondaryIcon: Handshake,
    color: "from-primary to-yellow-600",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
    accentColor: "text-primary",
    team: ["Comercial"],
    actions: [
      "Orçamento",
      "Negociação",
      "Contratos",
      "Follow-up de consultas"
    ],
    indicators: ["Indicações → Consulta", "Faturamento"]
  },
  {
    id: 3,
    title: "Comercial 3 - Experiência",
    subtitle: "0-90 dias pós-op",
    icon: Star,
    secondaryIcon: Crown,
    color: "from-primary to-yellow-600",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
    accentColor: "text-primary",
    team: ["Comercial"],
    actions: [
      "Onboarding do paciente",
      "Upsell de procedimentos",
      "UniLovers",
      "Solicitar NPS e depoimentos"
    ],
    indicators: ["Indicações → Cirurgia", "NPS", "UniLovers"]
  },
  {
    id: 4,
    title: "Comercial 4 - Farmer",
    subtitle: "+90 dias",
    icon: Infinity,
    secondaryIcon: TreeDeciduous,
    color: "from-primary to-yellow-600",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
    accentColor: "text-primary",
    team: ["Comercial"],
    actions: [
      "Pacientes Antigos",
      "Manutenção de relacionamento",
      "Novos Protocolos",
      "Incentivar indicações"
    ],
    indicators: ["Depoimentos Google", "Depoimentos Vídeo", "Embaixadores"]
  }
];

const PatientJourney = () => {
  const [expandedStages, setExpandedStages] = useState<Record<number, boolean>>({});
  const { 
    checklist, 
    isLoading, 
    toggleAction, 
    resetStageChecklist, 
    getStageProgress, 
    getTotalProgress 
  } = useJourneyChecklist();

  const toggleStage = (stageId: number) => {
    setExpandedStages(prev => ({
      ...prev,
      [stageId]: !prev[stageId]
    }));
  };

  const totalProgress = getTotalProgress(journeyStages);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-block mb-4">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-yellow-500 to-primary bg-clip-text text-transparent drop-shadow-sm">
              Jornada do Paciente
            </h1>
            <p className="text-primary/80 font-medium mt-1">Processo Comercial Unique</p>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-6">
            Cada etapa da jornada é uma oportunidade de encantar o paciente e gerar pontos para sua equipe
          </p>
          
          {/* Overall Progress */}
          <div className="max-w-md mx-auto bg-gradient-to-br from-card to-primary/5 border border-primary/20 rounded-xl p-4 shadow-[0_0_20px_rgba(212,175,55,0.1)]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">Progresso Geral</span>
                <span title="Sincronizado na nuvem">
                  <Cloud className="h-3 w-3 text-primary/60" />
                </span>
              </div>
              {isLoading ? (
                <Skeleton className="h-5 w-10" />
              ) : (
                <span className="text-sm font-bold text-primary">{totalProgress}%</span>
              )}
            </div>
            {isLoading ? (
              <Skeleton className="h-3 w-full" />
            ) : (
              <Progress value={totalProgress} className="h-3" />
            )}
          </div>
        </div>

        {/* Journey Timeline - Desktop */}
        <div className="hidden lg:flex items-center justify-center gap-2 mb-12">
          {journeyStages.map((stage, index) => {
            const progress = getStageProgress(stage.id, stage.actions.length);
            return (
              <div key={stage.id} className="flex items-center">
                <div 
                  className="relative flex items-center gap-3 px-5 py-3 rounded-full bg-gradient-to-r from-primary/90 to-yellow-600/90 text-background font-semibold cursor-pointer transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(212,175,55,0.5)]"
                  onClick={() => toggleStage(stage.id)}
                >
                  <div className="relative">
                    <stage.icon className="h-5 w-5 drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]" />
                  </div>
                  <span className="text-sm">{stage.title.split(' - ')[1]}</span>
                  {progress === 100 && (
                    <CheckCircle2 className="h-4 w-4 ml-1 text-green-300" />
                  )}
                </div>
                {index < journeyStages.length - 1 && (
                  <ArrowRight className="h-6 w-6 text-primary mx-3 drop-shadow-[0_0_4px_rgba(212,175,55,0.5)]" />
                )}
              </div>
            );
          })}
        </div>

        {/* Journey Cards */}
        <div className="grid gap-6">
          {journeyStages.map((stage) => {
            const progress = getStageProgress(stage.id, stage.actions.length);
            const isExpanded = expandedStages[stage.id];
            const isComplete = progress === 100;
            
            return (
              <Card 
                key={stage.id} 
                className={`${stage.bgColor} ${stage.borderColor} border-2 overflow-hidden transition-all hover:shadow-lg ${isComplete ? 'ring-2 ring-green-500/50' : ''}`}
              >
                <CardHeader className="pb-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Stage Icon - Golden Premium Style */}
                    <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary via-yellow-500 to-primary shadow-[0_0_30px_rgba(212,175,55,0.4)] border border-primary/30">
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent to-white/10" />
                      <div className="relative flex flex-col items-center">
                        <stage.icon className="h-8 w-8 text-background drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
                        {stage.secondaryIcon && (
                          <stage.secondaryIcon className="h-4 w-4 text-background/80 mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
                        )}
                      </div>
                      {isComplete && (
                        <div className="absolute -top-2 -right-2 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-2 border-background">
                          <CheckCircle2 className="h-4 w-4 text-white" />
                        </div>
                      )}
                      {/* Glow effect */}
                      <div className="absolute inset-0 rounded-2xl animate-pulse bg-primary/20 blur-xl -z-10" />
                    </div>
                    
                    {/* Title & Teams */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-medium text-muted-foreground">
                          Etapa {stage.id}
                        </span>
                        <div className="flex gap-2">
                          {stage.team.map((member) => (
                            <Badge key={member} variant="secondary" className="text-xs">
                              {member}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <CardTitle className="text-2xl">{stage.title}</CardTitle>
                      <p className="text-muted-foreground">{stage.subtitle}</p>
                    </div>

                    {/* Progress & Expand */}
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Checklist</p>
                          {isLoading ? (
                            <Skeleton className="h-6 w-12" />
                          ) : (
                            <p className={`text-lg font-bold ${isComplete ? 'text-green-500' : stage.accentColor}`}>
                              {progress}%
                            </p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleStage(stage.id)}
                          className="gap-1"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              Fechar
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              Abrir
                            </>
                          )}
                        </Button>
                      </div>
                      
                      {/* Indicators */}
                      <div className="flex flex-wrap gap-2 justify-end">
                        {stage.indicators.map((indicator) => (
                          <Badge 
                            key={indicator} 
                            className={`bg-gradient-to-r ${stage.color} text-white border-0 text-xs`}
                          >
                            {indicator}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-4">
                    {isLoading ? (
                      <Skeleton className="h-2 w-full" />
                    ) : (
                      <Progress value={progress} className="h-2" />
                    )}
                  </div>
                </CardHeader>
                
                {/* Expandable Checklist */}
                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-foreground">
                        Checklist de Ações
                      </h4>
                      {progress > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resetStageChecklist(stage.id)}
                          className="text-muted-foreground hover:text-destructive gap-1"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Resetar
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {stage.actions.map((action, actionIndex) => {
                        const isChecked = checklist[stage.id]?.[actionIndex] || false;
                        
                        return (
                          <label
                            key={actionIndex}
                            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                              isChecked 
                                ? 'bg-green-500/10 border border-green-500/30' 
                                : 'bg-background/60 border border-transparent hover:border-primary/30'
                            }`}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleAction(stage.id, actionIndex)}
                              className="mt-0.5"
                              disabled={isLoading}
                            />
                            <span className={`text-sm ${isChecked ? 'text-green-600 line-through' : 'text-foreground'}`}>
                              {action}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Tips Section */}
        <Card className="mt-8 bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-primary flex items-center gap-2">
              <span className="text-2xl">💡</span>
              Dica de Ouro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground">
              Use o checklist para acompanhar cada paciente! 
              Cada interação é uma oportunidade de gerar pontos: <strong>NPS com citação do seu nome vale bônus extra</strong>, 
              e <strong>depoimentos em vídeo e gold valem muito mais</strong> que depoimentos simples.
              Mantenha contato próximo com seus pacientes do pós-op para maximizar indicações!
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PatientJourney;
