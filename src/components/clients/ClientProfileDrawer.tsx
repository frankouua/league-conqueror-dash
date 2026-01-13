import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  User, Phone, Mail, MapPin, Calendar, Briefcase, Heart,
  DollarSign, TrendingUp, Clock, MessageSquare, FileText,
  Crown, AlertTriangle, Zap, RefreshCw, History, Activity,
  CreditCard, Package, Users, Star, Target, ChevronRight,
  ExternalLink, Copy, Loader2, Edit, Send, CalendarDays,
  CalendarCheck, CalendarX, Receipt, FileCheck, AlertCircle,
  CheckCircle, XCircle, Timer
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Types
interface ClientProfileDrawerProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientSource: 'rfv' | 'patient' | 'crm';
}

interface ClientFullProfile {
  // Basic info
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  cpf: string | null;
  prontuario: string | null;
  rg: string | null;
  foto_url: string | null;
  // Demographics
  birth_date: string | null;
  age: number | null;
  gender: string | null;
  nationality: string | null;
  marital_status: string | null;
  profession: string | null;
  has_children: boolean | null;
  children_count: number | null;
  // Address
  country: string | null;
  state: string | null;
  city: string | null;
  neighborhood: string | null;
  address: string | null;
  cep: string | null;
  // Physical
  height_cm: number | null;
  weight_kg: number | null;
  // Origin
  origin: string | null;
  origin_detail: string | null;
  referral_name: string | null;
  influencer_name: string | null;
  instagram_handle: string | null;
  // Interests
  main_objective: string | null;
  why_not_done_yet: string | null;
  dreams: string | null;
  desires: string | null;
  fears: string | null;
  expectations: string | null;
  preferred_procedures: string | null;
  // Financials
  total_value_sold: number | null;
  total_value_executed: number | null;
  total_procedures: number | null;
  // Dates
  first_contact_date: string | null;
  last_contact_date: string | null;
  first_purchase_date: string | null;
  last_purchase_date: string | null;
  // Feegow data
  observacoes_feegow: string | null;
  total_agendamentos: number | null;
  no_show_count: number | null;
  // RFV
  rfv_segment: string | null;
  rfv_score_r: number | null;
  rfv_score_f: number | null;
  rfv_score_v: number | null;
  total_value: number | null;
  total_purchases: number | null;
  average_ticket: number | null;
  days_since_last_purchase: number | null;
}

interface ProcedureRecord {
  id: string;
  date: string;
  procedure_name: string;
  amount: number;
  department: string | null;
  notes: string | null;
  seller_name?: string;
}

interface CommunicationRecord {
  id: string;
  type: string;
  description: string | null;
  sentiment: string | null;
  outcome: string | null;
  created_at: string;
  created_by_name?: string;
}

interface TimelineEvent {
  id: string;
  type: 'procedure' | 'communication' | 'crm' | 'financial' | 'appointment';
  title: string;
  description: string | null;
  date: string;
  value?: number;
  icon: React.ElementType;
  color: string;
}

// Feegow Types
interface FeegowAppointment {
  id: number;
  date: string;
  time: string;
  status: string;
  status_id: number;
  procedure_name: string | null;
  professional_name: string | null;
  location: string | null;
  notes: string | null;
}

interface FeegowFinancialRecord {
  id: number;
  date: string;
  description: string;
  value: number;
  status: string;
  payment_method: string | null;
  due_date: string | null;
  paid_date: string | null;
}

interface FeegowProposal {
  id: number;
  date: string;
  description: string;
  total_value: number;
  status: string;
  valid_until: string | null;
  items: { procedure_name: string; quantity: number; unit_value: number; total_value: number }[];
}

interface FeegowPatientDetails {
  appointments: {
    past: FeegowAppointment[];
    upcoming: FeegowAppointment[];
    today: FeegowAppointment[];
  };
  financial: {
    records: FeegowFinancialRecord[];
    total_paid: number;
    total_pending: number;
    total_overdue: number;
  };
  proposals: FeegowProposal[];
}

// RFV Segment config
const RFV_SEGMENTS: Record<string, { name: string; icon: React.ElementType; color: string }> = {
  'Campeões': { name: 'Campeões', icon: Crown, color: 'bg-emerald-500' },
  'Fiéis': { name: 'Fiéis', icon: Heart, color: 'bg-blue-500' },
  'Leais': { name: 'Leais', icon: Heart, color: 'bg-blue-500' },
  'Potenciais': { name: 'Potenciais', icon: Zap, color: 'bg-amber-500' },
  'Em Risco': { name: 'Em Risco', icon: AlertTriangle, color: 'bg-orange-500' },
  'Hibernando': { name: 'Hibernando', icon: Clock, color: 'bg-purple-500' },
  'Perdidos': { name: 'Perdidos', icon: RefreshCw, color: 'bg-red-500' },
};

export function ClientProfileDrawer({ open, onClose, clientId, clientSource }: ClientProfileDrawerProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch full client profile
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['client-full-profile', clientId, clientSource],
    queryFn: async (): Promise<ClientFullProfile | null> => {
      if (clientSource === 'rfv') {
        // Fetch from rfv_customers
        const { data: rfv, error: rfvError } = await supabase
          .from('rfv_customers')
          .select('*')
          .eq('id', clientId)
          .single();

        if (rfvError) throw rfvError;

        // Try to find matching patient_data by CPF
        let patientData = null;
        if (rfv.cpf) {
          const { data: pd } = await supabase
            .from('patient_data')
            .select('*')
            .eq('cpf', rfv.cpf)
            .single();
          patientData = pd;
        }

        return {
          id: rfv.id,
          name: rfv.name,
          phone: rfv.phone,
          whatsapp: rfv.whatsapp,
          email: rfv.email,
          cpf: rfv.cpf,
          prontuario: rfv.prontuario || patientData?.prontuario,
          rg: rfv.rg || patientData?.rg,
          foto_url: rfv.foto_url || patientData?.foto_url,
          birth_date: patientData?.birth_date,
          age: patientData?.age,
          gender: patientData?.gender,
          nationality: patientData?.nationality,
          marital_status: patientData?.marital_status,
          profession: rfv.profession || patientData?.profession,
          has_children: rfv.has_children ?? patientData?.has_children,
          children_count: rfv.children_count ?? patientData?.children_count,
          country: rfv.country || patientData?.country,
          state: patientData?.state,
          city: patientData?.city,
          neighborhood: patientData?.neighborhood,
          address: patientData?.address,
          cep: patientData?.cep,
          height_cm: rfv.height_cm ?? patientData?.height_cm,
          weight_kg: rfv.weight_kg ?? patientData?.weight_kg,
          origin: patientData?.origin,
          origin_detail: patientData?.origin_detail,
          referral_name: patientData?.referral_name,
          influencer_name: patientData?.influencer_name,
          instagram_handle: patientData?.instagram_handle,
          main_objective: rfv.main_objective || patientData?.main_objective,
          why_not_done_yet: rfv.why_not_done_yet || patientData?.why_not_done_yet,
          dreams: patientData?.dreams,
          desires: patientData?.desires,
          fears: patientData?.fears,
          expectations: patientData?.expectations,
          preferred_procedures: patientData?.preferred_procedures,
          total_value_sold: patientData?.total_value_sold,
          total_value_executed: patientData?.total_value_executed,
          total_procedures: patientData?.total_procedures,
          first_contact_date: patientData?.first_contact_date,
          last_contact_date: patientData?.last_contact_date,
          first_purchase_date: patientData?.first_purchase_date,
          last_purchase_date: rfv.last_purchase_date || patientData?.last_purchase_date,
          observacoes_feegow: rfv.observacoes_feegow || patientData?.observacoes_feegow,
          total_agendamentos: rfv.total_agendamentos ?? patientData?.total_agendamentos,
          no_show_count: rfv.no_show_count ?? patientData?.no_show_count,
          rfv_segment: rfv.segment,
          rfv_score_r: rfv.recency_score,
          rfv_score_f: rfv.frequency_score,
          rfv_score_v: rfv.value_score,
          total_value: rfv.total_value,
          total_purchases: rfv.total_purchases,
          average_ticket: rfv.average_ticket,
          days_since_last_purchase: rfv.days_since_last_purchase,
        };
      }

      // Handle CRM source - fetch from crm_leads with joined data
      if (clientSource === 'crm') {
        const { data: lead, error: leadError } = await supabase
          .from('crm_leads')
          .select(`
            *,
            rfv_customer:rfv_customer_id (
              segment, recency_score, frequency_score, value_score,
              total_value, total_purchases, average_ticket, days_since_last_purchase,
              last_purchase_date, first_purchase_date
            )
          `)
          .eq('id', clientId)
          .single();

        if (leadError) throw leadError;

        const rfv = lead.rfv_customer;
        const feegowData = lead.feegow_data as any || {};

        return {
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          whatsapp: lead.whatsapp,
          email: lead.email,
          cpf: lead.cpf,
          prontuario: lead.prontuario || lead.feegow_id,
          rg: null,
          foto_url: null,
          birth_date: feegowData?.nascimento || null,
          age: null,
          gender: feegowData?.sexo_id === 1 ? 'Masculino' : feegowData?.sexo_id === 2 ? 'Feminino' : null,
          nationality: null,
          marital_status: null,
          profession: null,
          has_children: null,
          children_count: null,
          country: null,
          state: null,
          city: null,
          neighborhood: feegowData?.bairro || null,
          address: null,
          cep: null,
          height_cm: null,
          weight_kg: null,
          origin: lead.source,
          origin_detail: lead.source_detail,
          referral_name: null,
          influencer_name: null,
          instagram_handle: null,
          main_objective: null,
          why_not_done_yet: null,
          dreams: null,
          desires: null,
          fears: null,
          expectations: null,
          preferred_procedures: lead.interested_procedures?.join(', ') || null,
          total_value_sold: lead.estimated_value,
          total_value_executed: lead.contract_value,
          total_procedures: rfv?.total_purchases,
          first_contact_date: lead.first_contact_at,
          last_contact_date: lead.last_activity_at,
          first_purchase_date: rfv?.first_purchase_date,
          last_purchase_date: rfv?.last_purchase_date || lead.last_procedure_date,
          observacoes_feegow: lead.notes,
          total_agendamentos: null,
          no_show_count: null,
          rfv_segment: rfv?.segment,
          rfv_score_r: rfv?.recency_score,
          rfv_score_f: rfv?.frequency_score,
          rfv_score_v: rfv?.value_score,
          total_value: rfv?.total_value || lead.estimated_value,
          total_purchases: rfv?.total_purchases,
          average_ticket: rfv?.average_ticket,
          days_since_last_purchase: rfv?.days_since_last_purchase,
        };
      }

      // Default: fetch from patient_data
      const { data: pd, error: pdError } = await supabase
        .from('patient_data')
        .select('*')
        .eq('id', clientId)
        .single();

      if (pdError) throw pdError;

      // Try to find RFV data
      let rfvData = null;
      if (pd.cpf) {
        const { data: rfv } = await supabase
          .from('rfv_customers')
          .select('*')
          .eq('cpf', pd.cpf)
          .single();
        rfvData = rfv;
      }

      return {
        id: pd.id,
        name: pd.name,
        phone: pd.phone,
        whatsapp: pd.whatsapp,
        email: pd.email,
        cpf: pd.cpf,
        prontuario: pd.prontuario,
        rg: pd.rg,
        foto_url: pd.foto_url,
        birth_date: pd.birth_date,
        age: pd.age,
        gender: pd.gender,
        nationality: pd.nationality,
        marital_status: pd.marital_status,
        profession: pd.profession,
        has_children: pd.has_children,
        children_count: pd.children_count,
        country: pd.country,
        state: pd.state,
        city: pd.city,
        neighborhood: pd.neighborhood,
        address: pd.address,
        cep: pd.cep,
        height_cm: pd.height_cm,
        weight_kg: pd.weight_kg,
        origin: pd.origin,
        origin_detail: pd.origin_detail,
        referral_name: pd.referral_name,
        influencer_name: pd.influencer_name,
        instagram_handle: pd.instagram_handle,
        main_objective: pd.main_objective,
        why_not_done_yet: pd.why_not_done_yet,
        dreams: pd.dreams,
        desires: pd.desires,
        fears: pd.fears,
        expectations: pd.expectations,
        preferred_procedures: pd.preferred_procedures,
        total_value_sold: pd.total_value_sold,
        total_value_executed: pd.total_value_executed,
        total_procedures: pd.total_procedures,
        first_contact_date: pd.first_contact_date,
        last_contact_date: pd.last_contact_date,
        first_purchase_date: pd.first_purchase_date,
        last_purchase_date: pd.last_purchase_date,
        observacoes_feegow: pd.observacoes_feegow,
        total_agendamentos: pd.total_agendamentos,
        no_show_count: pd.no_show_count,
        rfv_segment: rfvData?.segment,
        rfv_score_r: rfvData?.recency_score,
        rfv_score_f: rfvData?.frequency_score,
        rfv_score_v: rfvData?.value_score,
        total_value: rfvData?.total_value,
        total_purchases: rfvData?.total_purchases,
        average_ticket: rfvData?.average_ticket,
        days_since_last_purchase: rfvData?.days_since_last_purchase,
      };
    },
    enabled: open && !!clientId,
  });

  // Fetch Feegow patient details (appointments, financial, proposals)
  const { data: feegowDetails, isLoading: loadingFeegow } = useQuery({
    queryKey: ['client-feegow-details', clientId, profile?.prontuario, profile?.cpf],
    queryFn: async (): Promise<FeegowPatientDetails | null> => {
      if (!profile?.prontuario && !profile?.cpf) return null;

      try {
        const { data, error } = await supabase.functions.invoke('feegow-patient-details', {
          body: { 
            prontuario: profile.prontuario,
            cpf: profile.cpf
          }
        });

        if (error) {
          console.error('Error fetching Feegow details:', error);
          return null;
        }

        if (data?.success && data?.data) {
          return data.data as FeegowPatientDetails;
        }

        return null;
      } catch (err) {
        console.error('Error calling Feegow function:', err);
        return null;
      }
    },
    enabled: open && !!(profile?.prontuario || profile?.cpf),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch procedure history
  const { data: procedures = [], isLoading: loadingProcedures } = useQuery({
    queryKey: ['client-procedures', clientId, profile?.cpf],
    queryFn: async (): Promise<ProcedureRecord[]> => {
      if (!profile?.cpf) return [];

      const { data, error } = await supabase
        .from('executed_records')
        .select('id, date, procedure_name, amount, department, notes')
        .eq('patient_cpf', profile.cpf)
        .order('date', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!profile?.cpf,
  });

  // Fetch communication history from CRM
  const { data: communications = [], isLoading: loadingComms } = useQuery({
    queryKey: ['client-communications', clientId, profile?.cpf],
    queryFn: async (): Promise<CommunicationRecord[]> => {
      if (!profile?.cpf) return [];

      // First find CRM lead by CPF
      const { data: leads } = await supabase
        .from('crm_leads')
        .select('id')
        .eq('cpf', profile.cpf);

      if (!leads || leads.length === 0) return [];

      const leadIds = leads.map(l => l.id);

      // Fetch interactions
      const { data: interactions, error } = await supabase
        .from('crm_lead_interactions')
        .select('id, type, description, sentiment, outcome, created_at, created_by')
        .in('lead_id', leadIds)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return interactions || [];
    },
    enabled: open && !!profile?.cpf,
  });

  // Build unified timeline
  const timeline = useMemo((): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // Add procedures
    procedures.forEach(p => {
      events.push({
        id: `proc-${p.id}`,
        type: 'procedure',
        title: p.procedure_name || 'Procedimento',
        description: p.department || null,
        date: p.date,
        value: p.amount,
        icon: Package,
        color: 'bg-emerald-500',
      });
    });

    // Add communications
    communications.forEach(c => {
      events.push({
        id: `comm-${c.id}`,
        type: 'communication',
        title: getCommTypeLabel(c.type),
        description: c.description,
        date: c.created_at,
        icon: MessageSquare,
        color: c.sentiment === 'positive' ? 'bg-green-500' : 
               c.sentiment === 'negative' ? 'bg-red-500' : 'bg-blue-500',
      });
    });

    // Add Feegow appointments to timeline
    if (feegowDetails?.appointments) {
      const allApts = [
        ...feegowDetails.appointments.past,
        ...feegowDetails.appointments.today,
        ...feegowDetails.appointments.upcoming,
      ];
      
      allApts.forEach(apt => {
        // Parse Feegow date format (DD-MM-YYYY)
        const [day, month, year] = apt.date.split('-').map(Number);
        const aptDate = new Date(year, month - 1, day);
        
        events.push({
          id: `apt-${apt.id}`,
          type: 'appointment',
          title: apt.procedure_name || 'Consulta',
          description: `${apt.professional_name || 'Profissional'} - ${apt.status}`,
          date: aptDate.toISOString(),
          icon: CalendarCheck,
          color: apt.status_id === 5 ? 'bg-emerald-500' : 
                 apt.status_id === 6 ? 'bg-red-500' :
                 apt.status_id === 7 ? 'bg-gray-500' : 'bg-blue-500',
        });
      });
    }

    // Sort by date descending
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [procedures, communications, feegowDetails]);

  // Helper functions
  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  };

  const getCommTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'call': 'Ligação',
      'whatsapp': 'WhatsApp',
      'email': 'Email',
      'meeting': 'Reunião',
      'note': 'Anotação',
    };
    return labels[type] || type;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const getRFVSegmentConfig = (segment: string | null) => {
    if (!segment) return null;
    return RFV_SEGMENTS[segment] || null;
  };

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-2xl p-0 overflow-hidden">
        {loadingProfile ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !profile ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Cliente não encontrado
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b bg-gradient-to-r from-primary/10 to-transparent">
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                  <AvatarImage src={profile.foto_url || undefined} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {profile.name?.charAt(0) || 'C'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold truncate">{profile.name}</h2>
                    {profile.rfv_segment && (
                      <Badge className={cn(
                        "gap-1",
                        getRFVSegmentConfig(profile.rfv_segment)?.color || 'bg-muted',
                        "text-white border-0"
                      )}>
                        {(() => {
                          const config = getRFVSegmentConfig(profile.rfv_segment);
                          if (config) {
                            const Icon = config.icon;
                            return <Icon className="h-3 w-3" />;
                          }
                          return null;
                        })()}
                        {profile.rfv_segment}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Quick contact info */}
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {profile.phone && (
                      <button
                        onClick={() => copyToClipboard(profile.phone!, 'Telefone')}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        <Phone className="h-3 w-3" />
                        {profile.phone}
                      </button>
                    )}
                    {profile.email && (
                      <button
                        onClick={() => copyToClipboard(profile.email!, 'Email')}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        <Mail className="h-3 w-3" />
                        {profile.email}
                      </button>
                    )}
                    {profile.cpf && (
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        CPF: {profile.cpf}
                      </span>
                    )}
                  </div>

                  {/* Quick stats */}
                  <div className="mt-3 flex gap-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-primary">
                        {formatCurrency(profile.total_value || profile.total_value_sold || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Gasto</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold">
                        {profile.total_purchases || profile.total_procedures || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Procedimentos</p>
                    </div>
                    {profile.days_since_last_purchase && (
                      <div className="text-center">
                        <p className="text-lg font-bold">
                          {profile.days_since_last_purchase}
                        </p>
                        <p className="text-xs text-muted-foreground">Dias s/ compra</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid grid-cols-6 mx-6 mt-4">
                <TabsTrigger value="overview" className="gap-1 text-xs px-1">
                  <User className="h-3 w-3" />
                  <span className="hidden lg:inline">Perfil</span>
                </TabsTrigger>
                <TabsTrigger value="agenda" className="gap-1 text-xs px-1">
                  <CalendarDays className="h-3 w-3" />
                  <span className="hidden lg:inline">Agenda</span>
                </TabsTrigger>
                <TabsTrigger value="procedures" className="gap-1 text-xs px-1">
                  <Package className="h-3 w-3" />
                  <span className="hidden lg:inline">Proced.</span>
                </TabsTrigger>
                <TabsTrigger value="financial" className="gap-1 text-xs px-1">
                  <DollarSign className="h-3 w-3" />
                  <span className="hidden lg:inline">Financ.</span>
                </TabsTrigger>
                <TabsTrigger value="proposals" className="gap-1 text-xs px-1">
                  <FileCheck className="h-3 w-3" />
                  <span className="hidden lg:inline">Propostas</span>
                </TabsTrigger>
                <TabsTrigger value="timeline" className="gap-1 text-xs px-1">
                  <History className="h-3 w-3" />
                  <span className="hidden lg:inline">Timeline</span>
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 px-6 py-4">
                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4 mt-0">
                  {/* Personal Info */}
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Dados Pessoais
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3 text-sm">
                      <InfoRow label="Nome" value={profile.name} />
                      <InfoRow label="CPF" value={profile.cpf} />
                      <InfoRow label="RG" value={profile.rg} />
                      <InfoRow label="Prontuário" value={profile.prontuario} />
                      <InfoRow label="Data Nasc." value={formatDate(profile.birth_date)} />
                      <InfoRow label="Idade" value={profile.age ? `${profile.age} anos` : null} />
                      <InfoRow label="Gênero" value={profile.gender} />
                      <InfoRow label="Estado Civil" value={profile.marital_status} />
                      <InfoRow label="Profissão" value={profile.profession} />
                      <InfoRow label="Filhos" value={profile.has_children ? `Sim (${profile.children_count || 0})` : 'Não'} />
                    </CardContent>
                  </Card>

                  {/* Contact & Address */}
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Contato e Endereço
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3 text-sm">
                      <InfoRow label="Telefone" value={profile.phone} copyable />
                      <InfoRow label="WhatsApp" value={profile.whatsapp} copyable />
                      <InfoRow label="Email" value={profile.email} copyable />
                      <InfoRow label="Instagram" value={profile.instagram_handle} />
                      <div className="col-span-2">
                        <InfoRow 
                          label="Endereço" 
                          value={[profile.address, profile.neighborhood, profile.city, profile.state].filter(Boolean).join(', ') || null} 
                        />
                      </div>
                      <InfoRow label="CEP" value={profile.cep} />
                    </CardContent>
                  </Card>

                  {/* Origin & Interests */}
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Origem e Interesses
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <InfoRow label="Origem" value={profile.origin} />
                      <InfoRow label="Detalhe Origem" value={profile.origin_detail} />
                      <InfoRow label="Indicado por" value={profile.referral_name} />
                      <InfoRow label="Influencer" value={profile.influencer_name} />
                      <Separator className="my-2" />
                      <InfoRow label="Objetivo Principal" value={profile.main_objective} fullWidth />
                      <InfoRow label="Por que não fez ainda" value={profile.why_not_done_yet} fullWidth />
                      <InfoRow label="Sonhos" value={profile.dreams} fullWidth />
                      <InfoRow label="Desejos" value={profile.desires} fullWidth />
                      <InfoRow label="Medos" value={profile.fears} fullWidth />
                      <InfoRow label="Expectativas" value={profile.expectations} fullWidth />
                      <InfoRow label="Procedimentos Preferidos" value={profile.preferred_procedures} fullWidth />
                    </CardContent>
                  </Card>

                  {/* RFV Analysis */}
                  {(profile.rfv_score_r || profile.rfv_score_f || profile.rfv_score_v) && (
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Análise RFV
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <RFVScoreBar label="Recência" value={profile.rfv_score_r || 0} color="bg-blue-500" />
                          <RFVScoreBar label="Frequência" value={profile.rfv_score_f || 0} color="bg-green-500" />
                          <RFVScoreBar label="Valor" value={profile.rfv_score_v || 0} color="bg-amber-500" />
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Ticket Médio:</span>
                          <span className="font-medium">{formatCurrency(profile.average_ticket)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Observations */}
                  {profile.observacoes_feegow && (
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Observações
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {profile.observacoes_feegow}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Agenda Tab - NEW */}
                <TabsContent value="agenda" className="space-y-4 mt-0">
                  {loadingFeegow ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <>
                      {/* Today's Appointments */}
                      {feegowDetails?.appointments.today && feegowDetails.appointments.today.length > 0 && (
                        <Card className="border-primary/50 bg-primary/5">
                          <CardHeader className="py-3">
                            <CardTitle className="text-sm flex items-center gap-2 text-primary">
                              <CalendarCheck className="h-4 w-4" />
                              Hoje ({feegowDetails.appointments.today.length})
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {feegowDetails.appointments.today.map(apt => (
                              <AppointmentCard key={apt.id} appointment={apt} />
                            ))}
                          </CardContent>
                        </Card>
                      )}

                      {/* Upcoming Appointments */}
                      <Card>
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-blue-500" />
                            Próximas Consultas ({feegowDetails?.appointments.upcoming?.length || 0})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {!feegowDetails?.appointments.upcoming?.length ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Nenhuma consulta futura agendada
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {feegowDetails.appointments.upcoming.slice(0, 10).map(apt => (
                                <AppointmentCard key={apt.id} appointment={apt} />
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Past Appointments */}
                      <Card>
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <History className="h-4 w-4 text-muted-foreground" />
                            Histórico de Consultas ({feegowDetails?.appointments.past?.length || 0})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {!feegowDetails?.appointments.past?.length ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Nenhuma consulta anterior encontrada
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                              {feegowDetails.appointments.past.slice(0, 20).map(apt => (
                                <AppointmentCard key={apt.id} appointment={apt} variant="past" />
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  )}
                </TabsContent>

                {/* Procedures Tab */}
                <TabsContent value="procedures" className="space-y-4 mt-0">
                  {loadingProcedures ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : procedures.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum procedimento encontrado
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {procedures.map(proc => (
                        <Card key={proc.id}>
                          <CardContent className="py-3 flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{proc.procedure_name}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {formatDate(proc.date)}
                                {proc.department && (
                                  <>
                                    <span>•</span>
                                    <span>{proc.department}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <p className="font-bold text-primary">{formatCurrency(proc.amount)}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Financial Tab */}
                <TabsContent value="financial" className="space-y-4 mt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-emerald-500/10">
                            <DollarSign className="h-5 w-5 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Total Vendido</p>
                            <p className="text-lg font-bold">{formatCurrency(profile.total_value_sold || profile.total_value || 0)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-blue-500/10">
                            <Package className="h-5 w-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Total Executado</p>
                            <p className="text-lg font-bold">{formatCurrency(profile.total_value_executed || 0)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-amber-500/10">
                            <TrendingUp className="h-5 w-5 text-amber-500" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Ticket Médio</p>
                            <p className="text-lg font-bold">{formatCurrency(profile.average_ticket || 0)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-purple-500/10">
                            <Activity className="h-5 w-5 text-purple-500" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Procedimentos</p>
                            <p className="text-lg font-bold">{profile.total_procedures || profile.total_purchases || 0}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Procedure Value Distribution */}
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Histórico de Valores</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {procedures.slice(0, 10).map(proc => (
                          <div key={proc.id} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{proc.procedure_name}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(proc.date)}</p>
                            </div>
                            <p className="font-medium">{formatCurrency(proc.amount)}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Proposals Tab */}
                <TabsContent value="proposals" className="space-y-4 mt-0">
                  {loadingFeegow ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : !feegowDetails?.proposals?.length ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma proposta/orçamento encontrado</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {feegowDetails.proposals.map(proposal => (
                        <ProposalCard key={proposal.id} proposal={proposal} />
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Timeline Tab */}
                <TabsContent value="timeline" className="space-y-4 mt-0">
                  {timeline.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum evento registrado
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                      <div className="space-y-4">
                        {timeline.map(event => {
                          const Icon = event.icon;
                          return (
                            <div key={event.id} className="relative pl-10">
                              <div className={cn(
                                "absolute left-2 top-1 w-5 h-5 rounded-full flex items-center justify-center",
                                event.color
                              )}>
                                <Icon className="h-3 w-3 text-white" />
                              </div>
                              <Card>
                                <CardContent className="py-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <p className="font-medium">{event.title}</p>
                                      {event.description && (
                                        <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                                      )}
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {format(new Date(event.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                      </p>
                                    </div>
                                    {event.value && (
                                      <p className="font-bold text-primary shrink-0">
                                        {formatCurrency(event.value)}
                                      </p>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// Helper Components
function InfoRow({ label, value, copyable, fullWidth }: { 
  label: string; 
  value: string | null | undefined; 
  copyable?: boolean;
  fullWidth?: boolean;
}) {
  const displayValue = value || '-';
  const hasValue = !!value;

  const handleCopy = () => {
    if (hasValue && copyable) {
      navigator.clipboard.writeText(value!);
      toast.success(`${label} copiado!`);
    }
  };

  return (
    <div className={cn(fullWidth && "col-span-2")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p 
        className={cn(
          "font-medium truncate",
          copyable && hasValue && "cursor-pointer hover:text-primary"
        )}
        onClick={handleCopy}
      >
        {displayValue}
      </p>
    </div>
  );
}

function RFVScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${(value / 5) * 100}%` }} />
      </div>
      <p className="text-lg font-bold mt-1">{value}</p>
    </div>
  );
}

// Appointment Card Component
function AppointmentCard({ appointment, variant = 'upcoming' }: { 
  appointment: FeegowAppointment; 
  variant?: 'upcoming' | 'past'; 
}) {
  const formatFeegowDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const getStatusBadge = (status: string, statusId: number) => {
    const config: Record<number, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
      1: { variant: 'outline', icon: Clock }, // Agendado
      2: { variant: 'default', icon: CheckCircle }, // Confirmado
      3: { variant: 'default', icon: Timer }, // Chegou
      4: { variant: 'default', icon: Activity }, // Em Atendimento
      5: { variant: 'secondary', icon: CheckCircle }, // Atendido
      6: { variant: 'destructive', icon: XCircle }, // Não Compareceu
      7: { variant: 'destructive', icon: XCircle }, // Cancelado
      8: { variant: 'outline', icon: RefreshCw }, // Remarcado
    };

    const cfg = config[statusId] || { variant: 'outline' as const, icon: Clock };
    const Icon = cfg.icon;

    return (
      <Badge variant={cfg.variant} className="gap-1 text-xs">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg border",
      variant === 'past' ? 'bg-muted/30' : 'bg-background'
    )}>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">
          {appointment.procedure_name || 'Consulta'}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{formatFeegowDate(appointment.date)}</span>
          {appointment.time && (
            <>
              <span>•</span>
              <Clock className="h-3 w-3" />
              <span>{appointment.time}</span>
            </>
          )}
        </div>
        {appointment.professional_name && (
          <p className="text-xs text-muted-foreground mt-1">
            <User className="h-3 w-3 inline mr-1" />
            {appointment.professional_name}
          </p>
        )}
      </div>
      {getStatusBadge(appointment.status, appointment.status_id)}
    </div>
  );
}

// Financial Record Card Component
function FinancialRecordCard({ record }: { record: FeegowFinancialRecord }) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getStatusColor = (status: string) => {
    const lower = status.toLowerCase();
    if (lower.includes('pago') || lower.includes('paid')) return 'text-emerald-600';
    if (lower.includes('vencido') || lower.includes('overdue')) return 'text-red-600';
    return 'text-amber-600';
  };

  const getStatusIcon = (status: string) => {
    const lower = status.toLowerCase();
    if (lower.includes('pago') || lower.includes('paid')) return CheckCircle;
    if (lower.includes('vencido') || lower.includes('overdue')) return AlertCircle;
    return Clock;
  };

  const StatusIcon = getStatusIcon(record.status);

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-background">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{record.description}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{record.date}</span>
          {record.due_date && (
            <>
              <span>•</span>
              <span>Venc: {record.due_date}</span>
            </>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold">{formatCurrency(record.value)}</p>
        <p className={cn("text-xs flex items-center gap-1 justify-end", getStatusColor(record.status))}>
          <StatusIcon className="h-3 w-3" />
          {record.status}
        </p>
      </div>
    </div>
  );
}

// Proposal Card Component
function ProposalCard({ proposal }: { proposal: FeegowProposal }) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const lower = status.toLowerCase();
    if (lower.includes('aprovad') || lower.includes('aceito')) return 'default';
    if (lower.includes('recusad') || lower.includes('cancelad')) return 'destructive';
    return 'outline';
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-medium">{proposal.description}</p>
            <p className="text-xs text-muted-foreground">
              Criado em: {proposal.date}
              {proposal.valid_until && ` • Válido até: ${proposal.valid_until}`}
            </p>
          </div>
          <Badge variant={getStatusVariant(proposal.status)}>
            {proposal.status}
          </Badge>
        </div>
        
        {proposal.items.length > 0 && (
          <div className="space-y-1 border-t pt-2">
            {proposal.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {item.quantity}x {item.procedure_name}
                </span>
                <span>{formatCurrency(item.total_value)}</span>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex justify-between items-center mt-3 pt-2 border-t">
          <span className="text-sm font-medium">Total</span>
          <span className="text-lg font-bold text-primary">{formatCurrency(proposal.total_value)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default ClientProfileDrawer;
