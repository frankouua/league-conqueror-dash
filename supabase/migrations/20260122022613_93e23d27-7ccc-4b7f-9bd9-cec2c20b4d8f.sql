-- =====================================================
-- DESABILITAR RLS NA TABELA patient_data
-- =====================================================

-- 1. Primeiro, remover todas as policies existentes
DROP POLICY IF EXISTS "Admins can do everything with patient_data" ON public.patient_data;
DROP POLICY IF EXISTS "Admins can manage all patients" ON public.patient_data;
DROP POLICY IF EXISTS "Admins can view all patients" ON public.patient_data;
DROP POLICY IF EXISTS "Admins view all patient data" ON public.patient_data;
DROP POLICY IF EXISTS "Patient data visible to admins and authorized users" ON public.patient_data;
DROP POLICY IF EXISTS "Users view patients they created" ON public.patient_data;

-- 2. Desabilitar RLS na tabela
ALTER TABLE public.patient_data DISABLE ROW LEVEL SECURITY;