-- Tabela central para tipos de formulários
CREATE TABLE public.form_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  form_type TEXT NOT NULL,
  fields JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  notify_team BOOLEAN DEFAULT true,
  create_task BOOLEAN DEFAULT false,
  task_template JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para respostas de formulários
CREATE TABLE public.form_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.form_templates(id),
  patient_email TEXT,
  patient_phone TEXT,
  patient_cpf TEXT,
  patient_prontuario TEXT,
  patient_name TEXT,
  lead_id UUID REFERENCES public.crm_leads(id),
  patient_data_id UUID REFERENCES public.patient_data(id),
  form_type TEXT NOT NULL,
  form_source TEXT NOT NULL DEFAULT 'sistema',
  responses JSONB NOT NULL DEFAULT '{}',
  metadata JSONB,
  is_processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  task_created_id UUID,
  nps_score INTEGER,
  nps_category TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_form_responses_email ON public.form_responses(patient_email);
CREATE INDEX idx_form_responses_phone ON public.form_responses(patient_phone);
CREATE INDEX idx_form_responses_cpf ON public.form_responses(patient_cpf);
CREATE INDEX idx_form_responses_prontuario ON public.form_responses(patient_prontuario);
CREATE INDEX idx_form_responses_lead_id ON public.form_responses(lead_id);
CREATE INDEX idx_form_responses_form_type ON public.form_responses(form_type);
CREATE INDEX idx_form_responses_submitted_at ON public.form_responses(submitted_at DESC);

-- Tabela para links únicos de formulários
CREATE TABLE public.form_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.form_templates(id) NOT NULL,
  patient_email TEXT,
  patient_phone TEXT,
  patient_cpf TEXT,
  patient_prontuario TEXT,
  patient_name TEXT,
  lead_id UUID REFERENCES public.crm_leads(id),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE,
  max_submissions INTEGER DEFAULT 1,
  current_submissions INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_form_links_token ON public.form_links(token);

-- Enable RLS
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_links ENABLE ROW LEVEL SECURITY;

-- Policies para form_templates
CREATE POLICY "Authenticated users can view form templates"
ON public.form_templates FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage form templates"
ON public.form_templates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Policies para form_responses
CREATE POLICY "Authenticated users can view form responses"
ON public.form_responses FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can create form responses"
ON public.form_responses FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update form responses"
ON public.form_responses FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Policies para form_links
CREATE POLICY "Authenticated users can view form links"
ON public.form_links FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create form links"
ON public.form_links FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage their own form links"
ON public.form_links FOR UPDATE
USING (created_by = auth.uid());

-- Inserir templates padrão dos formulários
INSERT INTO public.form_templates (name, slug, form_type, description, fields, notify_team, create_task) VALUES
(
  'Pesquisa NPS',
  'nps',
  'nps',
  'Avaliação de satisfação do paciente',
  '[{"name": "nps_score", "label": "De 0 a 10, qual a probabilidade de você recomendar a Unique para amigos ou familiares?", "type": "nps", "required": true}, {"name": "feedback", "label": "O que motivou sua nota?", "type": "textarea", "required": false}, {"name": "improvement", "label": "O que podemos melhorar?", "type": "textarea", "required": false}]'::jsonb,
  true,
  true
),
(
  'Formulário Pré-Operatório',
  'pre-operatorio',
  'pre_op',
  'Coleta de informações antes da cirurgia',
  '[{"name": "alergias", "label": "Possui alguma alergia a medicamentos?", "type": "textarea", "required": true}, {"name": "medicamentos", "label": "Está tomando algum medicamento atualmente?", "type": "textarea", "required": true}, {"name": "cirurgias_anteriores", "label": "Já realizou alguma cirurgia anteriormente?", "type": "textarea", "required": false}, {"name": "doencas_cronicas", "label": "Possui alguma doença crônica?", "type": "textarea", "required": false}, {"name": "jejum_confirmado", "label": "Confirma que estará em jejum de 8 horas antes do procedimento?", "type": "checkbox", "required": true}, {"name": "acompanhante", "label": "Terá acompanhante no dia da cirurgia?", "type": "select", "options": ["Sim", "Não"], "required": true}]'::jsonb,
  true,
  true
),
(
  'Formulário Pós-Operatório',
  'pos-operatorio',
  'pos_op',
  'Acompanhamento após a cirurgia',
  '[{"name": "nivel_dor", "label": "Como está seu nível de dor? (0 = nenhuma, 10 = muito forte)", "type": "scale", "min": 0, "max": 10, "required": true}, {"name": "medicacao", "label": "Está tomando a medicação conforme prescrito?", "type": "select", "options": ["Sim, conforme orientação", "Parcialmente", "Não estou tomando"], "required": true}, {"name": "sintomas", "label": "Apresentou algum sintoma incomum?", "type": "multiselect", "options": ["Febre", "Inchaço excessivo", "Sangramento", "Náusea", "Tontura", "Nenhum sintoma"], "required": true}]'::jsonb,
  true,
  true
),
(
  'Formulário Spa',
  'spa',
  'spa',
  'Avaliação e preferências de tratamentos spa',
  '[{"name": "interesse", "label": "Quais tratamentos você tem interesse?", "type": "multiselect", "options": ["Massagem relaxante", "Drenagem linfática", "Limpeza de pele", "Peeling", "Hidratação corporal", "Outros"], "required": true}, {"name": "frequencia", "label": "Com que frequência gostaria de fazer tratamentos?", "type": "select", "options": ["Semanal", "Quinzenal", "Mensal", "Ocasional"], "required": true}]'::jsonb,
  true,
  false
),
(
  'Formulário Pré-Consulta',
  'pre-consulta',
  'pre_consulta',
  'Informações antes da consulta médica',
  '[{"name": "motivo_consulta", "label": "Qual o principal motivo da sua consulta?", "type": "textarea", "required": true}, {"name": "areas_interesse", "label": "Quais áreas do corpo você gostaria de tratar?", "type": "multiselect", "options": ["Face", "Abdômen", "Mamas", "Glúteos", "Braços", "Coxas", "Outros"], "required": true}, {"name": "expectativas", "label": "Quais são suas expectativas com o procedimento?", "type": "textarea", "required": true}]'::jsonb,
  true,
  false
),
(
  'Atendimento Tablet',
  'tablet',
  'tablet',
  'Solicitações durante permanência na clínica',
  '[{"name": "solicitacao", "label": "O que você gostaria de solicitar?", "type": "multiselect", "options": ["Água", "Café", "Chá", "Cobertor", "Ajuste de temperatura", "Falar com atendente", "Outros"], "required": true}, {"name": "outra_solicitacao", "label": "Descreva sua solicitação, se necessário", "type": "textarea", "required": false}]'::jsonb,
  true,
  false
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_form_templates_updated_at
BEFORE UPDATE ON public.form_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para vincular resposta ao lead/paciente automaticamente
CREATE OR REPLACE FUNCTION public.link_form_response_to_patient()
RETURNS TRIGGER AS $$
DECLARE
  found_lead_id UUID;
  found_patient_id UUID;
BEGIN
  SELECT id INTO found_lead_id
  FROM public.crm_leads
  WHERE 
    (NEW.patient_email IS NOT NULL AND email = NEW.patient_email)
    OR (NEW.patient_phone IS NOT NULL AND phone = NEW.patient_phone)
    OR (NEW.patient_cpf IS NOT NULL AND cpf = NEW.patient_cpf)
    OR (NEW.patient_prontuario IS NOT NULL AND prontuario = NEW.patient_prontuario)
  ORDER BY updated_at DESC
  LIMIT 1;
  
  SELECT id INTO found_patient_id
  FROM public.patient_data
  WHERE 
    (NEW.patient_email IS NOT NULL AND email = NEW.patient_email)
    OR (NEW.patient_phone IS NOT NULL AND phone = NEW.patient_phone)
    OR (NEW.patient_cpf IS NOT NULL AND cpf = NEW.patient_cpf)
  ORDER BY updated_at DESC
  LIMIT 1;
  
  NEW.lead_id := COALESCE(NEW.lead_id, found_lead_id);
  NEW.patient_data_id := COALESCE(NEW.patient_data_id, found_patient_id);
  
  IF NEW.nps_score IS NOT NULL THEN
    NEW.nps_category := CASE
      WHEN NEW.nps_score >= 9 THEN 'promotor'
      WHEN NEW.nps_score >= 7 THEN 'neutro'
      ELSE 'detrator'
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER link_form_response_patient
BEFORE INSERT ON public.form_responses
FOR EACH ROW
EXECUTE FUNCTION public.link_form_response_to_patient();