import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Copy, Check, Star, MessageSquare, Video, Gift, Users, UserPlus, Crown, Phone, ArrowRight, Clock, Target, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { ENGAGEMENT_SCRIPTS, REFERRAL_MANAGEMENT_PROCESS, EngagementScript } from "@/constants/commercialScripts";

const EngagementStrategies = () => {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = async (text: string, title: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(title);
      toast.success("Script copiado!");
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      toast.error("Erro ao copiar script");
    }
  };

  const getScriptIcon = (id: string) => {
    switch (id) {
      case "review_google":
        return <Star className="h-5 w-5" />;
      case "nps_survey":
        return <MessageSquare className="h-5 w-5" />;
      case "video_testimonial":
        return <Video className="h-5 w-5" />;
      case "referral_request":
        return <Gift className="h-5 w-5" />;
      case "referral_approach":
        return <UserPlus className="h-5 w-5" />;
      case "ambassador_invite":
        return <Crown className="h-5 w-5" />;
      default:
        return <MessageSquare className="h-5 w-5" />;
    }
  };

  const getScriptColor = (id: string) => {
    switch (id) {
      case "review_google":
        return "from-yellow-500 to-amber-500";
      case "nps_survey":
        return "from-blue-500 to-cyan-500";
      case "video_testimonial":
        return "from-purple-500 to-pink-500";
      case "referral_request":
        return "from-green-500 to-emerald-500";
      case "referral_approach":
        return "from-orange-500 to-red-500";
      case "ambassador_invite":
        return "from-amber-500 to-yellow-500";
      default:
        return "from-primary to-primary/80";
    }
  };

  const renderScript = (script: EngagementScript) => (
    <Card key={script.id} className="overflow-hidden">
      <CardHeader className={`bg-gradient-to-r ${getScriptColor(script.id)} text-white`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            {getScriptIcon(script.id)}
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{script.title}</CardTitle>
            <CardDescription className="text-white/90">{script.objective}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Responsável:</span>
            <span className="font-medium">{script.responsible}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Momento:</span>
            <span className="font-medium text-xs">{script.idealMoment}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Canal:</span>
            <Badge variant="outline">{script.channel}</Badge>
          </div>
        </div>

        <Separator />

        {script.scenarios ? (
          <Accordion type="single" collapsible className="w-full">
            {script.scenarios.map((scenario, idx) => (
              <AccordionItem key={idx} value={`scenario-${idx}`}>
                <AccordionTrigger className="text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      Cenário {idx + 1}
                    </Badge>
                    {scenario.scenario}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="relative bg-muted/50 rounded-lg p-4">
                    <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                      {scenario.script}
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(scenario.script, `${script.title} - ${scenario.scenario}`)}
                    >
                      {copiedText === `${script.title} - ${scenario.scenario}` ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : script.script ? (
          <div className="relative bg-muted/50 rounded-lg p-4">
            <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
              {script.script}
            </pre>
            <Button
              size="sm"
              variant="outline"
              className="absolute top-2 right-2"
              onClick={() => copyToClipboard(script.script!, script.title)}
            >
              {copiedText === script.title ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        ) : null}

        {script.benefits && script.benefits.length > 0 && (
          <div className="bg-green-500/10 rounded-lg p-4 space-y-2">
            <p className="text-sm font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Benefícios Oferecidos:
            </p>
            <ul className="space-y-1">
              {script.benefits.map((benefit, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-3">
            <Gift className="h-7 w-7" />
            Indicações, Depoimentos & Embaixadoras
          </CardTitle>
          <CardDescription className="text-white/90">
            Scripts e estratégias para engajamento de pacientes, coleta de depoimentos, solicitação de indicações e gestão do programa de embaixadoras.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">R$ 500</p>
              <p className="text-white/80 text-xs">Crédito por indicação</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">6</p>
              <p className="text-white/80 text-xs">Scripts disponíveis</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">24h</p>
              <p className="text-white/80 text-xs">Tempo máx. p/ contato</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">NPS 9+</p>
              <p className="text-white/80 text-xs">Perfil ideal embaixadora</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="testimonials" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="testimonials" className="gap-2 py-3">
            <Star className="h-4 w-4" />
            <span className="hidden sm:inline">Depoimentos</span>
          </TabsTrigger>
          <TabsTrigger value="referrals" className="gap-2 py-3">
            <Gift className="h-4 w-4" />
            <span className="hidden sm:inline">Indicações</span>
          </TabsTrigger>
          <TabsTrigger value="ambassadors" className="gap-2 py-3">
            <Crown className="h-4 w-4" />
            <span className="hidden sm:inline">Embaixadoras</span>
          </TabsTrigger>
          <TabsTrigger value="process" className="gap-2 py-3">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Processo</span>
          </TabsTrigger>
        </TabsList>

        {/* Depoimentos Tab */}
        <TabsContent value="testimonials">
          <ScrollArea className="h-[calc(100vh-450px)]">
            <div className="space-y-4 pr-4">
              {ENGAGEMENT_SCRIPTS.filter(s => 
                s.id === "review_google" || s.id === "nps_survey" || s.id === "video_testimonial"
              ).map(renderScript)}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Indicações Tab */}
        <TabsContent value="referrals">
          <ScrollArea className="h-[calc(100vh-450px)]">
            <div className="space-y-4 pr-4">
              {ENGAGEMENT_SCRIPTS.filter(s => 
                s.id === "referral_request" || s.id === "referral_approach"
              ).map(renderScript)}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Embaixadoras Tab */}
        <TabsContent value="ambassadors">
          <ScrollArea className="h-[calc(100vh-450px)]">
            <div className="space-y-4 pr-4">
              {ENGAGEMENT_SCRIPTS.filter(s => s.id === "ambassador_invite").map(renderScript)}
              
              {/* Ambassador Program Summary */}
              <Card className="border-amber-500/50 bg-amber-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Crown className="h-5 w-5" />
                    Programa de Embaixadoras - Resumo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">Critérios de Seleção:</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span>NPS 9 ou 10 (Promotoras)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span>Mínimo 6 meses de pós-operatório</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span>Já deixou depoimento positivo</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span>Engajamento positivo com a clínica</span>
                        </li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">Benefícios Exclusivos:</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <Gift className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                          <span>R$ 500 em créditos por indicação convertida</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Gift className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                          <span>Acesso antecipado a novos protocolos</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Gift className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                          <span>Convites para eventos exclusivos</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Gift className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                          <span>Presente de boas-vindas especial</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Processo Tab */}
        <TabsContent value="process">
          <ScrollArea className="h-[calc(100vh-450px)]">
            <div className="space-y-4 pr-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    {REFERRAL_MANAGEMENT_PROCESS.title}
                  </CardTitle>
                  <CardDescription>
                    {REFERRAL_MANAGEMENT_PROCESS.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {REFERRAL_MANAGEMENT_PROCESS.steps.map((step, idx) => (
                      <div key={step.step} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                            {step.step}
                          </div>
                          {idx < REFERRAL_MANAGEMENT_PROCESS.steps.length - 1 && (
                            <div className="w-0.5 h-full bg-border mt-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-6">
                          <h4 className="font-semibold text-lg">{step.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {step.description}
                          </p>
                          {step.fields && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {step.fields.map((field, fieldIdx) => (
                                <Badge key={fieldIdx} variant="outline" className="text-xs">
                                  {field}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Reference Card */}
              <Card className="bg-blue-500/10 border-blue-500/30">
                <CardHeader>
                  <CardTitle className="text-blue-600 dark:text-blue-400 flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Referência Rápida - Tempos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-background rounded-lg p-3">
                      <p className="font-semibold">Abordagem de Indicado</p>
                      <p className="text-muted-foreground">Até 24 horas</p>
                    </div>
                    <div className="bg-background rounded-lg p-3">
                      <p className="font-semibold">NPS de Processo</p>
                      <p className="text-muted-foreground">7 dias após cirurgia</p>
                    </div>
                    <div className="bg-background rounded-lg p-3">
                      <p className="font-semibold">NPS de Resultado</p>
                      <p className="text-muted-foreground">3 meses após cirurgia</p>
                    </div>
                    <div className="bg-background rounded-lg p-3">
                      <p className="font-semibold">Convite Depoimento Vídeo</p>
                      <p className="text-muted-foreground">3-6 meses pós-op</p>
                    </div>
                    <div className="bg-background rounded-lg p-3">
                      <p className="font-semibold">Convite Embaixadora</p>
                      <p className="text-muted-foreground">6+ meses pós-op</p>
                    </div>
                    <div className="bg-background rounded-lg p-3">
                      <p className="font-semibold">Review Google</p>
                      <p className="text-muted-foreground">Retorno 1 mês ou elogio</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EngagementStrategies;
