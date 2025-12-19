-- Change department column to TEXT to support sales departments
ALTER TABLE public.revenue_records 
ALTER COLUMN department TYPE TEXT;