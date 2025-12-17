import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  UserPlus, 
  CalendarCheck, 
  Stethoscope, 
  Scissors, 
  HeartPulse,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RotateCcw
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const journeyStages = [
  {
    id: 1,
    title: "Lead",
    subtitle: "Captação e Primeiro Contato",
    icon: UserPlus,
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    accentColor: "text-blue-500",
    team: ["Comercial", "Marketing"],
    actions: [
      "Identificar potenciais pacientes",
      "Responder mensagens e DMs",
      "Qualificar interesse do lead",
      "Registrar dados no sistema",
      "Apresentar a clínica e procedimentos"
    ],
    indicators: ["Indicações coletadas", "Menções no Instagram"]
  },
  {
    id: 2,
    title: "Agendamento",
    subtitle: "Conversão para Consulta",
    icon: CalendarCheck,
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    accentColor: "text-purple-500",
    team: ["Comercial"],
    actions: [
      "Confirmar interesse do paciente",
      "Agendar consulta com o médico",
      "Enviar confirmação e lembretes",
      "Preparar documentação necessária",
      "Orientar sobre o que levar"
    ],
    indicators: ["Indicações → Consulta"]
  },
  {
    id: 3,
    title: "Consulta",
    subtitle: "Avaliação Médica",
    icon: Stethoscope,
    color: "from-amber-500 to-amber-600",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    accentColor: "text-amber-500",
    team: ["Médico", "Comercial"],
    actions: [
      "Acolher o paciente na clínica",
      "Apresentar o médico e equipe",
      "Acompanhar durante a consulta",
      "Explicar procedimentos e valores",
      "Negociar formas de pagamento"
    ],
    indicators: ["NPS", "Faturamento"]
  },
  {
    id: 4,
    title: "Cirurgia",
    subtitle: "Procedimento Realizado",
    icon: Scissors,
    color: "from-emerald-500 to-emerald-600",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    accentColor: "text-emerald-500",
    team: ["Médico", "Comercial", "Enfermagem"],
    actions: [
      "Confirmar procedimento agendado",
      "Orientar preparação pré-operatória",
      "Acompanhar no dia da cirurgia",
      "Garantir conforto do paciente",
      "Registrar indicação → Cirurgia"
    ],
    indicators: ["Indicações → Cirurgia", "Faturamento"]
  },
  {
    id: 5,
    title: "Pós-op",
    subtitle: "Acompanhamento e Fidelização",
    icon: HeartPulse,
    color: "from-rose-500 to-rose-600",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/30",
    accentColor: "text-rose-500",
    team: ["Comercial", "Médico"],
    actions: [
      "Ligar para saber como está",
      "Agendar retornos necessários",
      "Solicitar avaliação NPS",
      "Pedir depoimento (Google/Vídeo)",
      "Incentivar indicações de amigos"
    ],
    indicators: ["NPS", "Depoimentos Google", "Depoimentos Vídeo", "UniLovers", "Embaixadores"]
  }
];

type ChecklistState = Record<number, Record<number, boolean>>;

const PatientJourney = () => {
  const { user } = useAuth();
  const [expandedStages, setExpandedStages] = useState<Record<number, boolean>>({});
  const [checklist, setChecklist] = useState<ChecklistState>({});

  // Load checklist from localStorage
  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`patient-journey-checklist-${user.id}`);
      if (saved) {
        setChecklist(JSON.parse(saved));
      }
    }
  }, [user?.id]);

  // Save checklist to localStorage
  const saveChecklist = (newChecklist: ChecklistState) => {
    if (user?.id) {
      localStorage.setItem(`patient-journey-checklist-${user.id}`, JSON.stringify(newChecklist));
    }
    setChecklist(newChecklist);
  };

  const toggleAction = (stageId: number, actionIndex: number) => {
    const newChecklist = { ...checklist };
    if (!newChecklist[stageId]) {
      newChecklist[stageId] = {};
    }
    newChecklist[stageId][actionIndex] = !newChecklist[stageId]?.[actionIndex];
    saveChecklist(newChecklist);
  };

  const toggleStage = (stageId: number) => {
    setExpandedStages(prev => ({
      ...prev,
      [stageId]: !prev[stageId]
    }));
  };

  const getStageProgress = (stageId: number, actionsCount: number) => {
    if (!checklist[stageId]) return 0;
    const completed = Object.values(checklist[stageId]).filter(Boolean).length;
    return Math.round((completed / actionsCount) * 100);
  };

  const resetStageChecklist = (stageId: number) => {
    const newChecklist = { ...checklist };
    delete newChecklist[stageId];
    saveChecklist(newChecklist);
  };

  const getTotalProgress = () => {
    let totalActions = 0;
    let completedActions = 0;
    
    journeyStages.forEach(stage => {
      totalActions += stage.actions.length;
      if (checklist[stage.id]) {
        completedActions += Object.values(checklist[stage.id]).filter(Boolean).length;
      }
    });
    
    return totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Jornada do Paciente
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-6">
            Cada etapa da jornada é uma oportunidade de encantar o paciente e gerar pontos para sua equipe
          </p>
          
          {/* Overall Progress */}
          <div className="max-w-md mx-auto bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Progresso Geral</span>
              <span className="text-sm font-bold text-primary">{getTotalProgress()}%</span>
            </div>
            <Progress value={getTotalProgress()} className="h-3" />
          </div>
        </div>

        {/* Journey Timeline - Desktop */}
        <div className="hidden lg:flex items-center justify-center gap-2 mb-12">
          {journeyStages.map((stage, index) => {
            const progress = getStageProgress(stage.id, stage.actions.length);
            return (
              <div key={stage.id} className="flex items-center">
                <div 
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${stage.color} text-white font-medium cursor-pointer transition-transform hover:scale-105`}
                  onClick={() => toggleStage(stage.id)}
                >
                  <stage.icon className="h-4 w-4" />
                  <span>{stage.title}</span>
                  {progress === 100 && (
                    <CheckCircle2 className="h-4 w-4 ml-1" />
                  )}
                </div>
                {index < journeyStages.length - 1 && (
                  <ArrowRight className="h-5 w-5 text-muted-foreground mx-2" />
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
                    {/* Stage Number & Icon */}
                    <div className={`relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${stage.color} text-white shadow-lg`}>
                      <stage.icon className="h-8 w-8" />
                      {isComplete && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4 text-white" />
                        </div>
                      )}
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
                          <p className={`text-lg font-bold ${isComplete ? 'text-green-500' : stage.accentColor}`}>
                            {progress}%
                          </p>
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
                    <Progress value={progress} className="h-2" />
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
