import { Database } from "@/integrations/supabase/types";

export type ReferralLeadStatus = Database["public"]["Enums"]["referral_lead_status"];

export interface KanbanLead {
  id: string;
  team_id: string;
  referrer_name: string;
  referrer_phone: string | null;
  referred_name: string;
  referred_phone: string | null;
  referred_email: string | null;
  status: ReferralLeadStatus;
  assigned_to: string | null;
  registered_by: string;
  notes: string | null;
  last_contact_at: string | null;
  consultation_date: string | null;
  surgery_date: string | null;
  created_at: string;
  updated_at: string;
  temperature?: "hot" | "warm" | "cold" | null;
  photo_url?: string | null;
  loss_reason?: string | null;
  assigned_profile?: { full_name: string; avatar_url?: string | null } | null;
  registered_profile?: { full_name: string; avatar_url?: string | null } | null;
}

export interface TeamMember {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
}

export interface KanbanColumnConfig {
  status: ReferralLeadStatus;
  title: string;
  subtitle: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  { 
    status: "nova", 
    title: "Novos Leads", 
    subtitle: "Social Selling",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30"
  },
  { 
    status: "em_contato", 
    title: "Qualificação", 
    subtitle: "SDR",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30"
  },
  { 
    status: "agendou", 
    title: "Consulta Agendada", 
    subtitle: "Closer",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30"
  },
  { 
    status: "pos_venda", 
    title: "Pós-Venda", 
    subtitle: "CS (até 90 dias)",
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/30"
  },
  { 
    status: "relacionamento", 
    title: "Relacionamento", 
    subtitle: "Farmer (após 90 dias)",
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/30"
  },
  { 
    status: "ganho", 
    title: "GANHO", 
    subtitle: "Vendido",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30"
  },
  { 
    status: "perdido", 
    title: "PERDIDO", 
    subtitle: "Não convertido",
    color: "text-gray-400",
    bgColor: "bg-gray-500/10",
    borderColor: "border-gray-500/30"
  },
];

export const TEMPERATURE_CONFIG = {
  hot: { label: "Quente", icon: "🔥", color: "text-orange-400 bg-orange-500/20" },
  warm: { label: "Morno", icon: "☀️", color: "text-yellow-400 bg-yellow-500/20" },
  cold: { label: "Frio", icon: "❄️", color: "text-blue-400 bg-blue-500/20" },
};

export interface StageChecklist {
  stageKey: ReferralLeadStatus;
  tasks: string[];
  opportunities: { icon: string; title: string; description: string }[];
}

export const STAGE_CHECKLISTS: StageChecklist[] = [
  {
    stageKey: "em_contato",
    tasks: [
      "Contato em até 5 minutos",
      "Aplicar script de qualificação (BANT)",
      "Agendar consulta de valor",
      "Enviar formulário pré-consulta",
      "Confirmar consulta 24h antes",
    ],
    opportunities: [
      { icon: "💡", title: "Venda da Consulta Premium", description: "Posicionar a consulta como um diagnóstico completo." },
      { icon: "💡", title: "Mapeamento de Upsell", description: "Investigar outros desejos além da queixa principal." },
      { icon: "💡", title: "Introdução a Protocolos", description: "Gerar curiosidade sobre protocolos pré-operatórios." },
    ],
  },
  {
    stageKey: "agendou",
    tasks: [
      "Estudar o dossiê completo do paciente no CRM",
      "Conduzir a consulta com a metodologia SPIN Selling",
      "Apresentar o plano de tratamento e o orçamento",
      "Contornar objeções e negociar",
      "Assinar o contrato e processar o pagamento",
      "Realizar handover para o CS",
    ],
    opportunities: [
      { icon: "💰", title: "Upsell", description: "Oferecer procedimentos combinados." },
      { icon: "💰", title: "Cross-sell", description: "Vender protocolos pré e pós-operatórios." },
      { icon: "💰", title: "Produtos", description: "Oferecer a linha de skincare para manutenção." },
    ],
  },
  {
    stageKey: "pos_venda",
    tasks: [
      "Realizar reunião de boas-vindas (handover)",
      "Acompanhar o paciente em D+1, D+7, D+30, D+60, D+90",
      "No momento certo, solicitar depoimento (Google/Vídeo)",
      "Aplicar a pesquisa de NPS",
      "Fazer a passagem de bastão para o Farmer no D+91",
    ],
    opportunities: [
      { icon: "❤️", title: "Cuidado", description: "Oferecer sessões extras de drenagem se necessário." },
      { icon: "❤️", title: "Estética", description: "Vender tratamentos para cicatriz." },
      { icon: "❤️", title: "Complemento", description: 'Oferecer protocolos de "Efeito Uau" (bioestimuladores) na fase de euforia.' },
    ],
  },
  {
    stageKey: "relacionamento",
    tasks: [
      "Realizar o primeiro contato de relacionamento (D+91)",
      "Adicionar à régua de relacionamento de longo prazo",
      "Enviar mensagem no aniversário do paciente e da cirurgia",
      "Executar campanhas sazonais",
    ],
    opportunities: [
      { icon: "🔄", title: "Recorrência", description: "Oferecer pacotes de manutenção anual." },
      { icon: "🔄", title: "Reativação", description: "Sugerir novos procedimentos com condições especiais." },
      { icon: "🔄", title: "Indicação", description: "Criar campanhas para o círculo de confiança do paciente." },
    ],
  },
];
