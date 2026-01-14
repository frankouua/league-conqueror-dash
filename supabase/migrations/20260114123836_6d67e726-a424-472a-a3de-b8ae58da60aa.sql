-- ==============================================
-- SISTEMA DE CHECKLIST POR ESTÁGIO DO PIPELINE
-- ==============================================

-- 1. Tabela de templates de checklist por estágio (definidos pelo admin)
CREATE TABLE public.stage_checklist_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id UUID NOT NULL REFERENCES public.crm_stages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT false,
  responsible_role TEXT,
  deadline_hours INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Tabela de progresso do checklist por lead
CREATE TABLE public.lead_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.stage_checklist_templates(id) ON DELETE SET NULL,
  stage_id UUID REFERENCES public.crm_stages(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES auth.users(id),
  due_at TIMESTAMP WITH TIME ZONE,
  is_overdue BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Índices
CREATE INDEX idx_stage_checklist_templates_stage ON public.stage_checklist_templates(stage_id);
CREATE INDEX idx_lead_checklist_items_lead ON public.lead_checklist_items(lead_id);
CREATE INDEX idx_lead_checklist_items_stage ON public.lead_checklist_items(stage_id);
CREATE INDEX idx_lead_checklist_items_completed ON public.lead_checklist_items(is_completed);
CREATE INDEX idx_lead_checklist_items_overdue ON public.lead_checklist_items(is_overdue) WHERE is_overdue = true;

-- 4. Enable RLS
ALTER TABLE public.stage_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_checklist_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies para stage_checklist_templates
CREATE POLICY "Authenticated users can view checklist templates" 
ON public.stage_checklist_templates 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admins can manage checklist templates" 
ON public.stage_checklist_templates 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- 6. RLS Policies para lead_checklist_items
CREATE POLICY "Authenticated users can view lead checklist items" 
ON public.lead_checklist_items 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create lead checklist items" 
ON public.lead_checklist_items 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update lead checklist items" 
ON public.lead_checklist_items 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Admins can delete lead checklist items" 
ON public.lead_checklist_items 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- 7. Triggers para updated_at
CREATE TRIGGER update_stage_checklist_templates_updated_at
BEFORE UPDATE ON public.stage_checklist_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_checklist_items_updated_at
BEFORE UPDATE ON public.lead_checklist_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Função para calcular is_overdue
CREATE OR REPLACE FUNCTION public.calculate_checklist_overdue()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_overdue := (
    NEW.is_completed = false 
    AND NEW.due_at IS NOT NULL 
    AND NEW.due_at < now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_calculate_overdue
BEFORE INSERT OR UPDATE ON public.lead_checklist_items
FOR EACH ROW
EXECUTE FUNCTION public.calculate_checklist_overdue();

-- 9. Função para criar checklist quando lead muda de estágio
CREATE OR REPLACE FUNCTION public.create_lead_checklist_from_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stage_id IS DISTINCT FROM OLD.stage_id AND NEW.stage_id IS NOT NULL THEN
    INSERT INTO public.lead_checklist_items (
      lead_id, template_id, stage_id, title, description, order_index, due_at
    )
    SELECT 
      NEW.id, t.id, t.stage_id, t.title, t.description, t.order_index,
      CASE WHEN t.deadline_hours IS NOT NULL 
        THEN now() + (t.deadline_hours || ' hours')::interval
        ELSE NULL
      END
    FROM public.stage_checklist_templates t
    WHERE t.stage_id = NEW.stage_id
    AND NOT EXISTS (
      SELECT 1 FROM public.lead_checklist_items li 
      WHERE li.lead_id = NEW.id AND li.template_id = t.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_create_lead_checklist
AFTER UPDATE OF stage_id ON public.crm_leads
FOR EACH ROW
EXECUTE FUNCTION public.create_lead_checklist_from_template();

-- 10. Colunas de resumo no lead
ALTER TABLE public.crm_leads 
ADD COLUMN IF NOT EXISTS checklist_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS checklist_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS checklist_overdue INTEGER DEFAULT 0;

-- 11. Função para atualizar contadores
CREATE OR REPLACE FUNCTION public.update_lead_checklist_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.crm_leads
  SET 
    checklist_total = (SELECT COUNT(*) FROM public.lead_checklist_items WHERE lead_id = COALESCE(NEW.lead_id, OLD.lead_id)),
    checklist_completed = (SELECT COUNT(*) FROM public.lead_checklist_items WHERE lead_id = COALESCE(NEW.lead_id, OLD.lead_id) AND is_completed = true),
    checklist_overdue = (SELECT COUNT(*) FROM public.lead_checklist_items WHERE lead_id = COALESCE(NEW.lead_id, OLD.lead_id) AND is_overdue = true)
  WHERE id = COALESCE(NEW.lead_id, OLD.lead_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_checklist_counts
AFTER INSERT OR UPDATE OR DELETE ON public.lead_checklist_items
FOR EACH ROW
EXECUTE FUNCTION public.update_lead_checklist_counts();