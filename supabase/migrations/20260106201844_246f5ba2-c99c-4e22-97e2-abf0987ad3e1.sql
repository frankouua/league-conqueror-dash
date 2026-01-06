
-- =====================================================
-- REVERTER: Permitir visualização de TODOS os dados para todas as vendedoras
-- Apenas o menu Admin permanece restrito para coordenadores
-- =====================================================

-- 1. REVENUE_RECORDS: Todos podem ver todas as receitas
DROP POLICY IF EXISTS "Users can view own revenue records" ON public.revenue_records;

CREATE POLICY "All authenticated users can view revenue records" 
ON public.revenue_records 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 2. EXECUTED_RECORDS: Todos podem ver todos os registros executados
DROP POLICY IF EXISTS "Users can view own executed records" ON public.executed_records;

CREATE POLICY "All authenticated users can view executed records" 
ON public.executed_records 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 3. INDIVIDUAL_GOALS: Todos podem ver todas as metas
DROP POLICY IF EXISTS "Users can view own goals or admins view all" ON public.individual_goals;

CREATE POLICY "All authenticated users can view goals" 
ON public.individual_goals 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 4. REFERRAL_LEADS: Todos podem ver todas as indicações
DROP POLICY IF EXISTS "Users can view their registered or assigned leads" ON public.referral_leads;
DROP POLICY IF EXISTS "referral_leads_select_admin" ON public.referral_leads;

CREATE POLICY "All authenticated users can view referral leads" 
ON public.referral_leads 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 5. CONTESTATIONS: Todos podem ver todas as contestações
DROP POLICY IF EXISTS "Users can view own contestations" ON public.contestations;

CREATE POLICY "All authenticated users can view contestations" 
ON public.contestations 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 6. NOTIFICATIONS: Manter individual (notificações são pessoais)
-- Já está correto - cada um vê suas próprias notificações

-- 7. USER_ACHIEVEMENTS: Todos podem ver todas as conquistas
DROP POLICY IF EXISTS "Authenticated users can view team achievements" ON public.user_achievements;

CREATE POLICY "All authenticated users can view achievements" 
ON public.user_achievements 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 8. CARDS: Todos podem ver todos os cartões
DROP POLICY IF EXISTS "Team members can view team cards" ON public.cards;

CREATE POLICY "All authenticated users can view cards" 
ON public.cards 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 9. NPS_RECORDS: Todos podem ver todos os NPS
DROP POLICY IF EXISTS "Team members can view team NPS" ON public.nps_records;

CREATE POLICY "All authenticated users can view NPS" 
ON public.nps_records 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 10. TESTIMONIAL_RECORDS: Todos podem ver todos os depoimentos
DROP POLICY IF EXISTS "Team members can view team testimonials" ON public.testimonial_records;

CREATE POLICY "All authenticated users can view testimonials" 
ON public.testimonial_records 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 11. REFERRAL_RECORDS: Todos podem ver todas as indicações
DROP POLICY IF EXISTS "Team members can view team referrals" ON public.referral_records;

CREATE POLICY "All authenticated users can view referrals" 
ON public.referral_records 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 12. OTHER_INDICATORS: Todos podem ver todos os indicadores
DROP POLICY IF EXISTS "Team members can view team indicators" ON public.other_indicators;

CREATE POLICY "All authenticated users can view indicators" 
ON public.other_indicators 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 13. SPECIAL_EVENTS: Todos podem ver todos os eventos
DROP POLICY IF EXISTS "Team members can view team special events" ON public.special_events;

CREATE POLICY "All authenticated users can view special events" 
ON public.special_events 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 14. CANCELLATIONS: Todos podem ver todos os cancelamentos
DROP POLICY IF EXISTS "cancellations_select_own" ON public.cancellations;
DROP POLICY IF EXISTS "cancellations_select_admin" ON public.cancellations;

CREATE POLICY "All authenticated users can view cancellations" 
ON public.cancellations 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 15. CANCELLATION_HISTORY: Todos podem ver histórico
DROP POLICY IF EXISTS "Team members can view cancellation history" ON public.cancellation_history;
DROP POLICY IF EXISTS "Users can view own cancellation history" ON public.cancellation_history;

CREATE POLICY "All authenticated users can view cancellation history" 
ON public.cancellation_history 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 16. REFERRAL_LEAD_HISTORY: Todos podem ver histórico de leads
DROP POLICY IF EXISTS "Team members can view lead history" ON public.referral_lead_history;
DROP POLICY IF EXISTS "Users can view history of their leads" ON public.referral_lead_history;

CREATE POLICY "All authenticated users can view lead history" 
ON public.referral_lead_history 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 17. PREDEFINED_GOALS: Todos podem ver metas predefinidas
DROP POLICY IF EXISTS "Users can view their matched goals" ON public.predefined_goals;
DROP POLICY IF EXISTS "Users or admins can view predefined goals" ON public.predefined_goals;

CREATE POLICY "All authenticated users can view predefined goals" 
ON public.predefined_goals 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 18. PROFILES: Todos podem ver todos os perfis
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;

CREATE POLICY "All authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 19. PATIENT_DATA: Todos podem ver dados de pacientes (para operação comercial)
DROP POLICY IF EXISTS "Only admins can view patient_data" ON public.patient_data;

CREATE POLICY "All authenticated users can view patient data" 
ON public.patient_data 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 20. RFV_CUSTOMERS: Todos podem ver clientes RFV
DROP POLICY IF EXISTS "rfv_customers_select_admin" ON public.rfv_customers;

CREATE POLICY "All authenticated users can view RFV customers" 
ON public.rfv_customers 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 21. PROTOCOL_OFFERS: Já está correto (todos podem ver)

-- 22. PROTOCOLS: Já está correto (todos podem ver)

-- 23. KANBAN_CHECKLIST_PROGRESS: Todos podem ver progresso do kanban
DROP POLICY IF EXISTS "Team members can view checklist progress for their leads" ON public.kanban_checklist_progress;
DROP POLICY IF EXISTS "Users can view own checklist progress" ON public.kanban_checklist_progress;

CREATE POLICY "All authenticated users can view kanban progress" 
ON public.kanban_checklist_progress 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);
