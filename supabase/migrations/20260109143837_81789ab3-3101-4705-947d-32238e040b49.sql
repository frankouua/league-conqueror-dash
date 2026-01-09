-- Add missing columns to seller_department_goals
ALTER TABLE public.seller_department_goals 
ADD COLUMN IF NOT EXISTS seller_name TEXT,
ADD COLUMN IF NOT EXISTS average_ticket NUMERIC DEFAULT 0;