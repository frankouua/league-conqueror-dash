-- Add columns to track individual vs team contributions
-- Adding to revenue_records
ALTER TABLE public.revenue_records 
ADD COLUMN IF NOT EXISTS counts_for_individual BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS attributed_to_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS registered_by_admin BOOLEAN NOT NULL DEFAULT false;

-- Adding to nps_records
ALTER TABLE public.nps_records 
ADD COLUMN IF NOT EXISTS counts_for_individual BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS attributed_to_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS registered_by_admin BOOLEAN NOT NULL DEFAULT false;

-- Adding to testimonial_records
ALTER TABLE public.testimonial_records 
ADD COLUMN IF NOT EXISTS counts_for_individual BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS attributed_to_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS registered_by_admin BOOLEAN NOT NULL DEFAULT false;

-- Adding to referral_records
ALTER TABLE public.referral_records 
ADD COLUMN IF NOT EXISTS counts_for_individual BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS attributed_to_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS registered_by_admin BOOLEAN NOT NULL DEFAULT false;

-- Adding to other_indicators
ALTER TABLE public.other_indicators 
ADD COLUMN IF NOT EXISTS counts_for_individual BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS attributed_to_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS registered_by_admin BOOLEAN NOT NULL DEFAULT false;

-- Add comments explaining the columns
COMMENT ON COLUMN public.revenue_records.counts_for_individual IS 'Whether this record counts towards the user individual goals';
COMMENT ON COLUMN public.revenue_records.attributed_to_user_id IS 'When admin registers for someone else, this is the attributed user';
COMMENT ON COLUMN public.revenue_records.registered_by_admin IS 'Whether this was registered by an admin on behalf of team/member';