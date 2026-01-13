import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PatientDataFull {
  id: string;
  prontuario: string | null;
  cpf: string | null;
  rg: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  birth_date: string | null;
  age: number | null;
  gender: string | null;
  nationality: string | null;
  marital_status: string | null;
  profession: string | null;
  has_children: boolean | null;
  children_count: number | null;
  country: string | null;
  state: string | null;
  city: string | null;
  neighborhood: string | null;
  address: string | null;
  cep: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  origin: string | null;
  origin_detail: string | null;
  referral_name: string | null;
  influencer_name: string | null;
  instagram_handle: string | null;
  main_objective: string | null;
  why_not_done_yet: string | null;
  total_value_sold: number | null;
  total_value_executed: number | null;
  total_procedures: number | null;
  first_contact_date: string | null;
  last_contact_date: string | null;
  first_purchase_date: string | null;
  last_purchase_date: string | null;
  dreams: string | null;
  desires: string | null;
  fears: string | null;
  expectations: string | null;
  preferred_procedures: string | null;
  origem_id: number | null;
  origem_nome: string | null;
  responsavel_legal: string | null;
  nome_mae: string | null;
  nome_pai: string | null;
  observacoes_feegow: string | null;
  foto_url: string | null;
  data_cadastro_feegow: string | null;
  ultimo_atendimento: string | null;
  total_agendamentos: number | null;
  no_show_count: number | null;
}

export interface ExecutedRecord {
  id: string;
  procedure_name: string | null;
  amount: number;
  date: string;
  department: string | null;
  executor_name: string | null;
  origin: string | null;
}

export interface ClientFullData {
  patientData: PatientDataFull | null;
  executedRecords: ExecutedRecord[];
  totalExecuted: number;
  totalProcedures: number;
  ticketMedio: number;
}

export function useClientFullData(leadCpf: string | null, leadProntuario: string | null, patientDataId: string | null) {
  const { data: clientData, isLoading } = useQuery({
    queryKey: ['client-full-data', leadCpf, leadProntuario, patientDataId],
    queryFn: async (): Promise<ClientFullData> => {
      let patientData: PatientDataFull | null = null;
      let executedRecords: ExecutedRecord[] = [];
      let totalExecuted = 0;
      let totalProcedures = 0;

      // 1. Buscar patient_data
      if (patientDataId) {
        const { data } = await supabase
          .from('patient_data')
          .select('*')
          .eq('id', patientDataId)
          .single();
        patientData = data;
      } else if (leadCpf || leadProntuario) {
        let query = supabase.from('patient_data').select('*');
        if (leadCpf) {
          query = query.eq('cpf', leadCpf);
        } else if (leadProntuario) {
          query = query.eq('prontuario', leadProntuario);
        }
        const { data } = await query.single();
        patientData = data;
      }

      // 2. Buscar executed_records
      if (leadCpf || leadProntuario) {
        let query = supabase
          .from('executed_records')
          .select('id, procedure_name, amount, date, department, executor_name, origin')
          .order('date', { ascending: false });

        if (leadCpf && leadProntuario) {
          query = query.or(`patient_cpf.eq.${leadCpf},patient_prontuario.eq.${leadProntuario}`);
        } else if (leadCpf) {
          query = query.eq('patient_cpf', leadCpf);
        } else if (leadProntuario) {
          query = query.eq('patient_prontuario', leadProntuario);
        }

        const { data } = await query;
        executedRecords = data || [];
        totalExecuted = executedRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
        totalProcedures = executedRecords.length;
      }

      const ticketMedio = totalProcedures > 0 ? totalExecuted / totalProcedures : 0;

      return {
        patientData,
        executedRecords,
        totalExecuted,
        totalProcedures,
        ticketMedio,
      };
    },
    enabled: !!(leadCpf || leadProntuario || patientDataId),
    staleTime: 30000,
  });

  return {
    clientData: clientData || {
      patientData: null,
      executedRecords: [],
      totalExecuted: 0,
      totalProcedures: 0,
      ticketMedio: 0,
    },
    isLoading,
  };
}
