-- =====================================================
-- SCRIPT DE MIGRAÇÃO - PARTE 1: ENUMS E TIPOS
-- Execute este script primeiro no SQL Editor do Supabase de destino
-- =====================================================

-- Enum: department_type
CREATE TYPE public.department_type AS ENUM (
  'comercial',
  'pos_venda',
  'marketing',
  'administrativo',
  'clinico',
  'financeiro'
);

-- Enum: position_type
CREATE TYPE public.position_type AS ENUM (
  'sdr',
  'comercial_1',
  'comercial_2_closer',
  'gerente',
  'coordenador',
  'atendimento',
  'suporte',
  'analista',
  'estagiario'
);

-- Enum: app_role
CREATE TYPE public.app_role AS ENUM (
  'admin',
  'user',
  'coordinator',
  'manager'
);

-- Enum: testimonial_type
CREATE TYPE public.testimonial_type AS ENUM (
  'video',
  'escrito'
);

-- Enum: contestation_status
CREATE TYPE public.contestation_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'partially_approved'
);

-- Enum: cancellation_status
CREATE TYPE public.cancellation_status AS ENUM (
  'pending_retention',
  'in_retention',
  'confirmed',
  'retained',
  'credit_issued',
  'refund_pending',
  'refund_completed'
);

-- Enum: cancellation_reason
CREATE TYPE public.cancellation_reason AS ENUM (
  'financial',
  'health',
  'personal',
  'dissatisfaction',
  'other'
);

-- Verificar se tipos foram criados
SELECT typname FROM pg_type WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') AND typtype = 'e';
