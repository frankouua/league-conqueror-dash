-- Create protocols table
CREATE TABLE public.protocols (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  protocol_type TEXT NOT NULL CHECK (protocol_type IN ('procedimento', 'pacote', 'jornada')),
  price NUMERIC DEFAULT 0,
  promotional_price NUMERIC,
  duration_days INTEGER,
  target_segments TEXT[] DEFAULT ARRAY[]::TEXT[],
  target_audience TEXT,
  benefits TEXT[],
  included_items TEXT[],
  sales_script TEXT,
  whatsapp_scripts JSONB DEFAULT '{}'::jsonb,
  materials JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.protocols ENABLE ROW LEVEL SECURITY;

-- Policies for protocols (all authenticated users can read, admins can manage)
CREATE POLICY "All authenticated users can view protocols"
  ON public.protocols FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert protocols"
  ON public.protocols FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update protocols"
  ON public.protocols FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete protocols"
  ON public.protocols FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create protocol_offers table to track offers to customers
CREATE TABLE public.protocol_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  protocol_id UUID NOT NULL REFERENCES public.protocols(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.rfv_customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_segment TEXT,
  offered_by TEXT NOT NULL,
  offered_by_name TEXT,
  offer_channel TEXT DEFAULT 'whatsapp',
  message_sent TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'interested', 'scheduled', 'converted', 'declined', 'no_response')),
  response_notes TEXT,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE,
  converted_value NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.protocol_offers ENABLE ROW LEVEL SECURITY;

-- Policies for protocol_offers
CREATE POLICY "All authenticated users can view protocol_offers"
  ON public.protocol_offers FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can insert protocol_offers"
  ON public.protocol_offers FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can update their own protocol_offers"
  ON public.protocol_offers FOR UPDATE
  USING (auth.uid()::text = offered_by OR public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_protocols_updated_at
  BEFORE UPDATE ON public.protocols
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_protocol_offers_updated_at
  BEFORE UPDATE ON public.protocol_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for performance
CREATE INDEX idx_protocols_type ON public.protocols(protocol_type);
CREATE INDEX idx_protocols_active ON public.protocols(is_active);
CREATE INDEX idx_protocols_campaign ON public.protocols(campaign_id);
CREATE INDEX idx_protocol_offers_protocol ON public.protocol_offers(protocol_id);
CREATE INDEX idx_protocol_offers_customer ON public.protocol_offers(customer_id);
CREATE INDEX idx_protocol_offers_status ON public.protocol_offers(status);