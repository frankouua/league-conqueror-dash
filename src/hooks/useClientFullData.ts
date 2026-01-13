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

      // Normalizar CPF e prontuário (remover caracteres não numéricos)
      const normalizedCpf = leadCpf?.replace(/\D/g, '') || null;
      const normalizedProntuario = leadProntuario?.trim() || null;

      console.log('useClientFullData params:', { patientDataId, normalizedCpf, normalizedProntuario });

      // 1. Buscar patient_data - priorizar patient_data_id
      if (patientDataId) {
        const { data, error } = await supabase
          .from('patient_data')
          .select('*')
          .eq('id', patientDataId)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching patient_data by id:', error);
        }
        patientData = data;
        console.log('patient_data by id:', data ? 'found' : 'not found');
      }
      
      // Se não encontrou por ID, buscar por CPF ou prontuário
      if (!patientData && (normalizedCpf || normalizedProntuario)) {
        let query = supabase.from('patient_data').select('*');
        
        if (normalizedCpf) {
          query = query.eq('cpf', normalizedCpf);
        } else if (normalizedProntuario) {
          query = query.eq('prontuario', normalizedProntuario);
        }
        
        const { data, error } = await query.maybeSingle();
        if (error) {
          console.error('Error fetching patient_data by cpf/prontuario:', error);
        }
        patientData = data;
        console.log('patient_data by cpf/pront:', data ? 'found' : 'not found');
      }

      // 2. Buscar executed_records usando CPF ou prontuário do patient_data encontrado ou do lead
      const cpfToSearch = patientData?.cpf || normalizedCpf;
      const prontuarioToSearch = patientData?.prontuario || normalizedProntuario;

      if (cpfToSearch || prontuarioToSearch) {
        let query = supabase
          .from('executed_records')
          .select('id, procedure_name, amount, date, department, executor_name, origin')
          .order('date', { ascending: false })
          .limit(500);

        if (cpfToSearch && prontuarioToSearch) {
          query = query.or(`patient_cpf.eq.${cpfToSearch},patient_prontuario.eq.${prontuarioToSearch}`);
        } else if (cpfToSearch) {
          query = query.eq('patient_cpf', cpfToSearch);
        } else if (prontuarioToSearch) {
          query = query.eq('patient_prontuario', prontuarioToSearch);
        }

        const { data, error } = await query;
        if (error) {
          console.error('Error fetching executed_records:', error);
        }
        executedRecords = data || [];
        totalExecuted = executedRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
        totalProcedures = executedRecords.length;
        console.log('executed_records found:', executedRecords.length);
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
    refetchOnMount: true,
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
