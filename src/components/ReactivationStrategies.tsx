import { useState } from "react";
import { Copy, Check, Clock, Phone, Mail, MessageSquare, Target, Users, TrendingUp, AlertCircle, Zap, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  LEADS_RECOVERY_STRATEGIES, 
  LEADS_RECOVERY_SCRIPTS, 
  INACTIVE_PATIENTS_STRATEGIES, 
  INACTIVE_PATIENTS_SCRIPTS 
} from "@/constants/commercialScripts";

const getChannelIcon = (channel: string) => {
  const lowerChannel = channel.toLowerCase();
  if (lowerChannel.includes("whatsapp")) return <MessageSquare className="h-4 w-4" />;
  if (lowerChannel.includes("telefone") || lowerChannel.includes("phone")) return <Phone className="h-4 w-4" />;
  if (lowerChannel.includes("e-mail") || lowerChannel.includes("email")) return <Mail className="h-4 w-4" />;
  return <MessageSquare className="h-4 w-4" />;
};

const ReactivationStrategies = () => {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-rose-500 to-orange-500 text-white border-0">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <RefreshCw className="h-6 w-6" />
            Estratégias de Reativação
          </CardTitle>
          <CardDescription className="text-white/90">
            Cadências e scripts para recuperar leads que não fecharam e reativar pacientes inativos
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 h-auto">
          <TabsTrigger value="leads" className="gap-2 py-3">
            <Target className="h-4 w-4" />
            Leads Nunca Fecharam
          </TabsTrigger>
          <TabsTrigger value="patients" className="gap-2 py-3">
            <Users className="h-4 w-4" />
            Pacientes Inativos
          </TabsTrigger>
        </TabsList>

        {/* Leads Recovery Tab */}
        <TabsContent value="leads" className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-orange-500/30 bg-orange-500/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-orange-600 mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs font-medium">Taxa de Reativação</span>
                </div>
                <p className="text-2xl font-bold">{LEADS_RECOVERY_SCRIPTS.kpis.taxaReativacao}</p>
              </CardContent>
            </Card>
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-xs font-medium">Leads Resgatados</span>
                </div>
                <p className="text-2xl font-bold">{LEADS_RECOVERY_SCRIPTS.kpis.leadsResgatados}</p>
              </CardContent>
            </Card>
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                  <Zap className="h-4 w-4" />
                  <span className="text-xs font-medium">Faturamento</span>
                </div>
                <p className="text-2xl font-bold">{LEADS_RECOVERY_SCRIPTS.kpis.faturamentoResgatados}</p>
              </CardContent>
            </Card>
            <Card className="border-purple-500/30 bg-purple-500/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-purple-600 mb-1">
                  <Target className="h-4 w-4" />
                  <span className="text-xs font-medium">Taxa de Conversão</span>
                </div>
                <p className="text-2xl font-bold">{LEADS_RECOVERY_SCRIPTS.kpis.taxaConversao}</p>
              </CardContent>
            </Card>
          </div>

          {/* Strategies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Estratégias por Segmento
              </CardTitle>
              <CardDescription>
                Cadências específicas para cada tipo de lead não convertido
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="space-y-2">
                {LEADS_RECOVERY_STRATEGIES.map((strategy, idx) => (
                  <AccordionItem key={idx} value={`strategy-${idx}`} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex flex-col items-start gap-1 text-left">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-orange-500 text-orange-500">
                            {strategy.segment}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {strategy.responsible}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{strategy.description}</p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="space-y-4">
                        {/* Trigger */}
                        <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg">
                          <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Gatilho</p>
                            <p className="text-sm">{strategy.trigger}</p>
                          </div>
                        </div>

                        {/* Cadence Timeline */}
                        <div className="space-y-3">
                          <p className="text-sm font-medium">Cadência:</p>
                          <div className="relative pl-6 space-y-4">
                            <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-border" />
                            {strategy.cadence.map((step, stepIdx) => (
                              <div key={stepIdx} className="relative">
                                <div className="absolute -left-4 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                  <span className="text-[10px] text-primary-foreground font-bold">{stepIdx + 1}</span>
                                </div>
                                <Card className="ml-2 border-border/50">
                                  <CardContent className="p-3">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                      <Badge variant="outline" className="text-xs">{'day' in step ? step.day : (step as any).month}</Badge>
                                      <div className="flex items-center gap-1 text-muted-foreground">
                                        {getChannelIcon(step.channel)}
                                        <span className="text-xs">{step.channel}</span>
                                      </div>
                                    </div>
                                    <p className="text-sm font-medium">{step.action}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{step.script}</p>
                                  </CardContent>
                                </Card>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Offers */}
                        {strategy.offers && (
                          <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                            <p className="text-xs font-medium text-green-600 mb-2">Ofertas Sugeridas:</p>
                            <ul className="text-sm space-y-1">
                              {strategy.offers.map((offer, offerIdx) => (
                                <li key={offerIdx} className="flex items-start gap-2">
                                  <span className="text-green-500">•</span>
                                  {offer}
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

          {/* Scripts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                Scripts de Recuperação
              </CardTitle>
              <CardDescription>
                Scripts prontos para copiar e usar nas abordagens
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Curious Reactivation */}
              <Card className="border-blue-500/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{LEADS_RECOVERY_SCRIPTS.reactivationCurious.title}</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(LEADS_RECOVERY_SCRIPTS.reactivationCurious.script, "curious")}
                    >
                      {copiedText === "curious" ? (
                        <><Check className="h-4 w-4 mr-1 text-green-500" /> Copiado</>
                      ) : (
                        <><Copy className="h-4 w-4 mr-1" /> Copiar</>
                      )}
                    </Button>
                  </div>
                  <Badge variant="secondary" className="w-fit text-xs">{LEADS_RECOVERY_SCRIPTS.reactivationCurious.responsible}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/30 rounded-lg p-4 text-sm whitespace-pre-wrap">
                    {LEADS_RECOVERY_SCRIPTS.reactivationCurious.script}
                  </div>
                </CardContent>
              </Card>

              {/* Hesitant Rescue Email */}
              <Card className="border-orange-500/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{LEADS_RECOVERY_SCRIPTS.rescueEmailHesitant.title}</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(LEADS_RECOVERY_SCRIPTS.rescueEmailHesitant.script, "hesitant")}
                    >
                      {copiedText === "hesitant" ? (
                        <><Check className="h-4 w-4 mr-1 text-green-500" /> Copiado</>
                      ) : (
                        <><Copy className="h-4 w-4 mr-1" /> Copiar</>
                      )}
                    </Button>
                  </div>
                  <Badge variant="secondary" className="w-fit text-xs">{LEADS_RECOVERY_SCRIPTS.rescueEmailHesitant.responsible}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/30 rounded-lg p-4 text-sm whitespace-pre-wrap">
                    {LEADS_RECOVERY_SCRIPTS.rescueEmailHesitant.script}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inactive Patients Tab */}
        <TabsContent value="patients" className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-emerald-600 mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs font-medium">Taxa de Reativação</span>
                </div>
                <p className="text-2xl font-bold">{INACTIVE_PATIENTS_SCRIPTS.kpis.taxaReativacao}</p>
              </CardContent>
            </Card>
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-xs font-medium">Pacientes Reativados</span>
                </div>
                <p className="text-2xl font-bold">{INACTIVE_PATIENTS_SCRIPTS.kpis.pacientesReativados}</p>
              </CardContent>
            </Card>
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                  <Zap className="h-4 w-4" />
                  <span className="text-xs font-medium">Faturamento</span>
                </div>
                <p className="text-2xl font-bold">{INACTIVE_PATIENTS_SCRIPTS.kpis.faturamentoReativados}</p>
              </CardContent>
            </Card>
            <Card className="border-purple-500/30 bg-purple-500/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-purple-600 mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs font-medium">Aumento LTV</span>
                </div>
                <p className="text-2xl font-bold">{INACTIVE_PATIENTS_SCRIPTS.kpis.aumentoLTV}</p>
              </CardContent>
            </Card>
          </div>

          {/* Strategies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-emerald-500" />
                Estratégias por Tempo de Inatividade
              </CardTitle>
              <CardDescription>
                Cadências progressivas baseadas no tempo sem contato
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="space-y-2">
                {INACTIVE_PATIENTS_STRATEGIES.map((strategy, idx) => (
                  <AccordionItem key={idx} value={`patient-strategy-${idx}`} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex flex-col items-start gap-1 text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={
                            idx === 0 ? "border-yellow-500 text-yellow-600" :
                            idx === 1 ? "border-orange-500 text-orange-600" :
                            "border-red-500 text-red-600"
                          }>
                            {strategy.segment}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {strategy.inactivityPeriod}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {strategy.responsible}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{strategy.description}</p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="space-y-3">
                        <p className="text-sm font-medium">Cadência:</p>
                        <div className="relative pl-6 space-y-4">
                          <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-border" />
                          {strategy.cadence.map((step, stepIdx) => (
                            <div key={stepIdx} className="relative">
                              <div className={`absolute -left-4 w-4 h-4 rounded-full flex items-center justify-center ${
                                idx === 0 ? "bg-yellow-500" :
                                idx === 1 ? "bg-orange-500" :
                                "bg-red-500"
                              }`}>
                                <span className="text-[10px] text-white font-bold">{stepIdx + 1}</span>
                              </div>
                              <Card className="ml-2 border-border/50">
                                <CardContent className="p-3">
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <Badge variant="outline" className="text-xs">{step.month}</Badge>
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      {getChannelIcon(step.channel)}
                                      <span className="text-xs">{step.channel}</span>
                                    </div>
                                  </div>
                                  <p className="text-sm font-medium">{step.action}</p>
                                  <p className="text-xs text-muted-foreground mt-1">{step.script}</p>
                                </CardContent>
                              </Card>
                            </div>
                          ))}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          {/* Scripts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-emerald-500" />
                Scripts de Reativação
              </CardTitle>
              <CardDescription>
                Scripts prontos para cada nível de inatividade
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Warming Light */}
              <Card className="border-yellow-500/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{INACTIVE_PATIENTS_SCRIPTS.warmingLight.title}</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(INACTIVE_PATIENTS_SCRIPTS.warmingLight.script, "warming")}
                    >
                      {copiedText === "warming" ? (
                        <><Check className="h-4 w-4 mr-1 text-green-500" /> Copiado</>
                      ) : (
                        <><Copy className="h-4 w-4 mr-1" /> Copiar</>
                      )}
                    </Button>
                  </div>
                  <Badge className="w-fit text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/30">3-6 meses</Badge>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/30 rounded-lg p-4 text-sm whitespace-pre-wrap">
                    {INACTIVE_PATIENTS_SCRIPTS.warmingLight.script}
                  </div>
                </CardContent>
              </Card>

              {/* Medium Reactivation */}
              <Card className="border-orange-500/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{INACTIVE_PATIENTS_SCRIPTS.reactivationMedium.title}</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(INACTIVE_PATIENTS_SCRIPTS.reactivationMedium.script, "medium")}
                    >
                      {copiedText === "medium" ? (
                        <><Check className="h-4 w-4 mr-1 text-green-500" /> Copiado</>
                      ) : (
                        <><Copy className="h-4 w-4 mr-1" /> Copiar</>
                      )}
                    </Button>
                  </div>
                  <Badge className="w-fit text-xs bg-orange-500/10 text-orange-600 border-orange-500/30">6-12 meses</Badge>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/30 rounded-lg p-4 text-sm whitespace-pre-wrap">
                    {INACTIVE_PATIENTS_SCRIPTS.reactivationMedium.script}
                  </div>
                </CardContent>
              </Card>

              {/* Intensive Reactivation */}
              <Card className="border-red-500/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{INACTIVE_PATIENTS_SCRIPTS.reactivationIntensive.title}</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(INACTIVE_PATIENTS_SCRIPTS.reactivationIntensive.script, "intensive")}
                    >
                      {copiedText === "intensive" ? (
                        <><Check className="h-4 w-4 mr-1 text-green-500" /> Copiado</>
                      ) : (
                        <><Copy className="h-4 w-4 mr-1" /> Copiar</>
                      )}
                    </Button>
                  </div>
                  <Badge className="w-fit text-xs bg-red-500/10 text-red-600 border-red-500/30">1 ano+</Badge>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/30 rounded-lg p-4 text-sm whitespace-pre-wrap">
                    {INACTIVE_PATIENTS_SCRIPTS.reactivationIntensive.script}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReactivationStrategies;
