import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Copy, Check, AlertTriangle, ShieldAlert, Target, Clock, CheckCircle2, XCircle, CreditCard, FileText, Heart, Banknote, Star } from "lucide-react";
import { toast } from "sonner";
import { CANCELLATION_MANAGEMENT, CANCELLATION_RULES, CANCELLATION_RETENTION_CHECKLIST } from "@/constants/commercialScripts";

const reasonLabels: Record<string, string> = {
  financial: "Financeiro",
  health: "Saúde",
  dissatisfaction: "Insatisfação",
  changed_mind: "Mudou de ideia",
  competitor: "Concorrência",
  scheduling: "Agenda",
  personal: "Pessoal",
  other: "Outro"
};

const priorityColors: Record<string, string> = {
  alta: "bg-red-500/20 text-red-500 border-red-500",
  media: "bg-yellow-500/20 text-yellow-500 border-yellow-500",
  baixa: "bg-green-500/20 text-green-500 border-green-500"
};

const CancellationStrategies = () => {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toast.success("Script copiado!");
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-br from-red-500 to-orange-500 text-white border-0">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <ShieldAlert className="h-6 w-6" />
            {CANCELLATION_MANAGEMENT.title}
          </CardTitle>
          <CardDescription className="text-white/90">
            {CANCELLATION_MANAGEMENT.mission}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(CANCELLATION_MANAGEMENT.kpis).map(([key, value]) => (
              <div key={key} className="bg-white/10 rounded-lg p-3 text-center">
                <p className="text-white/70 text-xs capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                <p className="font-bold">{value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="policy" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto gap-1">
          <TabsTrigger value="policy" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Política</span>
          </TabsTrigger>
          <TabsTrigger value="scripts" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Scripts</span>
          </TabsTrigger>
          <TabsTrigger value="checklist" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="hidden sm:inline">Checklist</span>
          </TabsTrigger>
          <TabsTrigger value="exemptions" className="gap-2">
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">Isenções</span>
          </TabsTrigger>
          <TabsTrigger value="credit" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Crédito</span>
          </TabsTrigger>
        </TabsList>

        {/* Policy Tab */}
        <TabsContent value="policy">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-primary" />
                  Política de Multa e Estorno
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-red-500">{CANCELLATION_MANAGEMENT.policy.finePercentage}%</p>
                    <p className="text-xs text-muted-foreground">Multa Retida</p>
                  </div>
                  <Separator orientation="vertical" className="h-12" />
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-500">{CANCELLATION_MANAGEMENT.policy.refundPercentage}%</p>
                    <p className="text-xs text-muted-foreground">Estornado</p>
                  </div>
                  <Separator orientation="vertical" className="h-12" />
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-500">{CANCELLATION_MANAGEMENT.policy.refundDeadlineDays}</p>
                    <p className="text-xs text-muted-foreground">Dias p/ Estorno</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold text-sm">Regras Gerais:</p>
                  {CANCELLATION_MANAGEMENT.policy.rules.map((rule, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-500/30 bg-red-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-500">
                  <Target className="h-5 w-5" />
                  {CANCELLATION_MANAGEMENT.impactOnGoals.title}
                </CardTitle>
                <CardDescription>
                  {CANCELLATION_MANAGEMENT.impactOnGoals.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {CANCELLATION_MANAGEMENT.impactOnGoals.rules.map((rule, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm p-2 bg-background/50 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span>{rule}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Scripts Tab */}
        <TabsContent value="scripts">
          <Card>
            <CardHeader>
              <CardTitle>Scripts de Retenção por Motivo</CardTitle>
              <CardDescription>
                Scripts específicos para cada tipo de cancelamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="space-y-2">
                {CANCELLATION_RULES.map((rule, index) => (
                  <AccordionItem 
                    key={index} 
                    value={`rule-${index}`}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center gap-3 text-left w-full">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">{reasonLabels[rule.reason]}</p>
                            <Badge variant="outline" className={priorityColors[rule.retentionPriority]}>
                              Prioridade {rule.retentionPriority}
                            </Badge>
                            {rule.allowsFineWaiver && (
                              <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                                <Heart className="h-3 w-3 mr-1" />
                                Permite isenção
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="space-y-4">
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <p className="text-sm font-medium mb-1">Abordagem de Retenção:</p>
                          <p className="text-sm text-muted-foreground">{rule.retentionApproach}</p>
                        </div>

                        <div className="space-y-3">
                          <div className="border rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge className="bg-blue-500">1ª Tentativa</Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(rule.scripts.initial, `initial-${index}`)}
                              >
                                {copiedText === `initial-${index}` ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{rule.scripts.initial}</p>
                          </div>

                          {rule.scripts.followUp && (
                            <div className="border rounded-lg p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <Badge className="bg-yellow-500">Follow-up</Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(rule.scripts.followUp!, `followup-${index}`)}
                                >
                                  {copiedText === `followup-${index}` ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{rule.scripts.followUp}</p>
                            </div>
                          )}

                          {rule.scripts.lastChance && (
                            <div className="border rounded-lg p-4 space-y-2 border-red-500/30">
                              <div className="flex items-center justify-between">
                                <Badge className="bg-red-500">Última Chance</Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(rule.scripts.lastChance!, `lastchance-${index}`)}
                                >
                                  {copiedText === `lastchance-${index}` ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{rule.scripts.lastChance}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Checklist Tab */}
        <TabsContent value="checklist">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  {CANCELLATION_RETENTION_CHECKLIST.title}
                </CardTitle>
                <CardDescription>
                  {CANCELLATION_RETENTION_CHECKLIST.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {CANCELLATION_RETENTION_CHECKLIST.steps.map((step) => (
                    <div key={step.order} className="flex gap-4 p-3 border rounded-lg">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex-shrink-0">
                        {step.order}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{step.action}</p>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            {step.maxTime}
                          </Badge>
                          <Badge variant="secondary">{step.responsible}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-600">
                  <Star className="h-5 w-5" />
                  Regras de Ouro
                </CardTitle>
                <CardDescription>
                  Nunca quebre essas regras!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {CANCELLATION_RETENTION_CHECKLIST.goldenRules.map((rule, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 bg-background/50 rounded-lg">
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm font-medium">{rule}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Exemptions Tab */}
        <TabsContent value="exemptions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-green-500" />
                {CANCELLATION_MANAGEMENT.fineExemptions.title}
              </CardTitle>
              <CardDescription>
                {CANCELLATION_MANAGEMENT.fineExemptions.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {CANCELLATION_MANAGEMENT.fineExemptions.reasons.map((reason, index) => (
                  <Card key={index} className="border-green-500/30 bg-green-500/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        {reason.reason}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-muted-foreground">{reason.description}</p>
                      {reason.requiresDocumentation && (
                        <Badge variant="outline" className="text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          Requer: {reason.documentationType}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credit Tab */}
        <TabsContent value="credit">
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-500" />
                {CANCELLATION_MANAGEMENT.creditRecovery.title}
              </CardTitle>
              <CardDescription>
                {CANCELLATION_MANAGEMENT.creditRecovery.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-500">30%</p>
                  <p className="text-xs text-muted-foreground">Vira Crédito</p>
                </div>
                <Separator orientation="vertical" className="h-12" />
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-500">12</p>
                  <p className="text-xs text-muted-foreground">Meses de Validade</p>
                </div>
                <Separator orientation="vertical" className="h-12" />
                <div className="text-center flex-1">
                  <p className="text-sm font-medium text-blue-500">Mesmo Procedimento</p>
                  <p className="text-xs text-muted-foreground">Do contrato original</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-sm">Regras do Crédito:</p>
                {CANCELLATION_MANAGEMENT.creditRecovery.rules.map((rule, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span>{rule}</span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">Script de Oferta de Crédito:</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(CANCELLATION_MANAGEMENT.creditRecovery.script, 'credit-script')}
                  >
                    {copiedText === 'credit-script' ? (
                      <><Check className="h-4 w-4 text-green-500 mr-1" /> Copiado</>
                    ) : (
                      <><Copy className="h-4 w-4 mr-1" /> Copiar</>
                    )}
                  </Button>
                </div>
                <div className="p-4 bg-background rounded-lg border text-sm whitespace-pre-wrap">
                  {CANCELLATION_MANAGEMENT.creditRecovery.script}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CancellationStrategies;
