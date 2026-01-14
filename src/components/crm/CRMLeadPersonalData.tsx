import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  User, Phone, Mail, MapPin, Calendar, Briefcase, Heart, Target,
  DollarSign, TrendingUp, ClipboardList, Instagram, Users, Globe,
  FileText, Activity, AlertCircle, CheckCircle, Baby
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useClientFullData, PatientDataFull, ExecutedRecord } from '@/hooks/useClientFullData';

interface CRMLeadPersonalDataProps {
  leadCpf: string | null;
  leadProntuario: string | null;
  patientDataId: string | null;
  leadName: string;
  leadEstimatedValue?: number | null;
}

function InfoRow({ label, value, icon: Icon, showEmpty = false }: { label: string; value: string | null | undefined; icon?: any; showEmpty?: boolean }) {
  const displayValue = value || '-';
  if (!showEmpty && !value) return null;
  return (
    <div className="flex items-start gap-2 py-1">
      {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />}
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className={cn("text-xs font-medium truncate", !value && "text-muted-foreground")}>{displayValue}</p>
      </div>
    </div>
  );
}

function formatCurrency(value: number | null | undefined): string {
  if (!value) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(date: string | null | undefined): string {
  if (!date) return '-';
  try {
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return '-';
  }
}

export function CRMLeadPersonalData({
  leadCpf,
  leadProntuario,
  patientDataId,
  leadName,
  leadEstimatedValue,
}: CRMLeadPersonalDataProps) {
  const { clientData, isLoading } = useClientFullData(leadCpf, leadProntuario, patientDataId);
  const { patientData, executedRecords, totalExecuted, totalProcedures, ticketMedio } = clientData;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 sm:space-y-4 pb-4">
        {/* Resumo Financeiro */}
        {/* IMPORTANTE: "Total Vendido" = histórico real (Feegow/planilhas) 
            NÃO usar leadEstimatedValue aqui - isso é valor de NEGOCIAÇÃO/oportunidade */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Card className="bg-green-500/10 border-green-500/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Vendido (Histórico)</p>
                  <p className="text-sm font-bold text-green-500">
                    {patientData?.total_value_sold 
                      ? formatCurrency(patientData.total_value_sold)
                      : <span className="text-muted-foreground text-xs">Sem histórico</span>}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-blue-500/10 border-blue-500/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Total Executado</p>
                  <p className="text-sm font-bold text-blue-500">
                    {formatCurrency(totalExecuted || patientData?.total_value_executed)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-purple-500/10 border-purple-500/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Ticket Médio</p>
                  <p className="text-sm font-bold text-purple-500">
                    {formatCurrency(ticketMedio)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-amber-500/10 border-amber-500/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Procedimentos</p>
                  <p className="text-sm font-bold text-amber-500">{totalProcedures}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dados Pessoais */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Dados Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <InfoRow label="Nome" value={patientData?.name || leadName} icon={User} showEmpty />
              <InfoRow label="CPF" value={patientData?.cpf || leadCpf} icon={FileText} showEmpty />
              <InfoRow label="RG" value={patientData?.rg} icon={FileText} showEmpty />
              <InfoRow label="Prontuário" value={patientData?.prontuario || leadProntuario} icon={ClipboardList} showEmpty />
              <InfoRow label="Data Nasc." value={formatDate(patientData?.birth_date)} icon={Calendar} showEmpty />
              <InfoRow label="Idade" value={patientData?.age ? `${patientData.age} anos` : null} showEmpty />
              <InfoRow label="Gênero" value={patientData?.gender} showEmpty />
              <InfoRow label="Estado Civil" value={patientData?.marital_status} icon={Heart} showEmpty />
              <InfoRow label="Profissão" value={patientData?.profession} icon={Briefcase} showEmpty />
              <InfoRow 
                label="Filhos" 
                value={patientData?.has_children !== null && patientData?.has_children !== undefined 
                  ? (patientData.has_children ? `Sim${patientData.children_count ? ` (${patientData.children_count})` : ''}` : 'Não') 
                  : null} 
                icon={Baby}
                showEmpty
              />
            </div>
          </CardContent>
        </Card>

        {/* Contato e Endereço */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Contato e Endereço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <InfoRow label="Telefone" value={patientData?.phone} icon={Phone} showEmpty />
              <InfoRow label="WhatsApp" value={patientData?.whatsapp} icon={Phone} showEmpty />
              <InfoRow label="Email" value={patientData?.email} icon={Mail} showEmpty />
              <InfoRow label="Instagram" value={patientData?.instagram_handle} icon={Instagram} showEmpty />
              <InfoRow label="País" value={patientData?.country} icon={Globe} showEmpty />
              <InfoRow label="Estado" value={patientData?.state} showEmpty />
              <InfoRow label="Cidade" value={patientData?.city} icon={MapPin} showEmpty />
              <InfoRow label="Bairro" value={patientData?.neighborhood} showEmpty />
              <InfoRow label="Endereço" value={patientData?.address} icon={MapPin} showEmpty />
              <InfoRow label="CEP" value={patientData?.cep} showEmpty />
            </div>
          </CardContent>
        </Card>

        {/* Origem e Interesses */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Origem e Interesses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <InfoRow label="Origem" value={patientData?.origin || patientData?.origem_nome} />
              <InfoRow label="Detalhe Origem" value={patientData?.origin_detail} />
              <InfoRow label="Indicação" value={patientData?.referral_name} icon={Users} />
              <InfoRow label="Influenciador" value={patientData?.influencer_name} />
              <InfoRow label="Objetivo Principal" value={patientData?.main_objective} icon={Target} />
              <InfoRow label="Proc. Preferidos" value={patientData?.preferred_procedures} />
            </div>
            
            {/* Persona - ICP */}
            {(patientData?.dreams || patientData?.desires || patientData?.fears || patientData?.expectations || patientData?.why_not_done_yet) && (
              <>
                <Separator className="my-3" />
                <p className="text-xs font-semibold mb-2">Persona / ICP</p>
                <div className="space-y-2 text-xs">
                  {patientData?.dreams && (
                    <div className="bg-blue-500/10 rounded p-2">
                      <span className="text-muted-foreground">Sonhos:</span> {patientData.dreams}
                    </div>
                  )}
                  {patientData?.desires && (
                    <div className="bg-green-500/10 rounded p-2">
                      <span className="text-muted-foreground">Desejos:</span> {patientData.desires}
                    </div>
                  )}
                  {patientData?.fears && (
                    <div className="bg-red-500/10 rounded p-2">
                      <span className="text-muted-foreground">Medos:</span> {patientData.fears}
                    </div>
                  )}
                  {patientData?.expectations && (
                    <div className="bg-purple-500/10 rounded p-2">
                      <span className="text-muted-foreground">Expectativas:</span> {patientData.expectations}
                    </div>
                  )}
                  {patientData?.why_not_done_yet && (
                    <div className="bg-amber-500/10 rounded p-2">
                      <span className="text-muted-foreground">Por que não fez ainda:</span> {patientData.why_not_done_yet}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Dados Feegow */}
        {(patientData?.responsavel_legal || patientData?.nome_mae || patientData?.nome_pai || patientData?.observacoes_feegow) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Dados Complementares (Feegow)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <InfoRow label="Responsável Legal" value={patientData?.responsavel_legal} />
                <InfoRow label="Nome da Mãe" value={patientData?.nome_mae} />
                <InfoRow label="Nome do Pai" value={patientData?.nome_pai} />
                <InfoRow label="Cadastro Feegow" value={formatDate(patientData?.data_cadastro_feegow)} />
                <InfoRow label="Último Atend." value={formatDate(patientData?.ultimo_atendimento)} />
                <InfoRow label="Total Agendamentos" value={patientData?.total_agendamentos?.toString()} />
                <InfoRow label="No-Shows" value={patientData?.no_show_count?.toString()} />
              </div>
              {patientData?.observacoes_feegow && (
                <div className="mt-2 p-2 bg-muted rounded text-xs">
                  <p className="text-muted-foreground mb-1">Observações:</p>
                  <p>{patientData.observacoes_feegow}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Histórico de Procedimentos Executados */}
        {executedRecords.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Procedimentos Executados ({executedRecords.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-60 overflow-y-auto">
                {executedRecords.map((record) => (
                  <div key={record.id} className="flex items-center justify-between px-4 py-2 border-b last:border-0 hover:bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{record.procedure_name || 'Procedimento'}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDate(record.date)}
                        {record.executor_name && ` • ${record.executor_name}`}
                        {record.department && ` • ${record.department}`}
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-2 shrink-0 text-green-600 border-green-600">
                      {formatCurrency(record.amount)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Se não encontrou dados */}
        {!patientData && executedRecords.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhum dado adicional encontrado para este lead.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                CPF: {leadCpf || 'N/A'} | Prontuário: {leadProntuario || 'N/A'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
