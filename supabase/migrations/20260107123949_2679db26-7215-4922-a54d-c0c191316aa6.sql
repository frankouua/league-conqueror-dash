-- ========================================
-- CORREÇÃO DE SEGURANÇA: Políticas RLS Restritivas
-- ========================================

-- 1. PROFILES: Restringir para próprio perfil + membros do time + admins
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Everyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Allow viewing own and team profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

CREATE POLICY "Users view own profile" ON profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view team members" ON profiles
FOR SELECT USING (
  team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Admins view all profiles" ON profiles
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. REVENUE_RECORDS: Apenas próprios registros + time + admins
DROP POLICY IF EXISTS "Users can view their team revenue" ON revenue_records;
DROP POLICY IF EXISTS "Everyone can view revenue records" ON revenue_records;
DROP POLICY IF EXISTS "Allow viewing team revenue" ON revenue_records;
DROP POLICY IF EXISTS "Team members can view team revenue" ON revenue_records;

CREATE POLICY "Users view own revenue records" ON revenue_records
FOR SELECT USING (auth.uid() = user_id OR auth.uid() = attributed_to_user_id);

CREATE POLICY "Users view team revenue records" ON revenue_records
FOR SELECT USING (
  team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Admins view all revenue records" ON revenue_records
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. EXECUTED_RECORDS: Apenas próprios registros + time + admins
DROP POLICY IF EXISTS "Users can view their team executed" ON executed_records;
DROP POLICY IF EXISTS "Everyone can view executed records" ON executed_records;
DROP POLICY IF EXISTS "Allow viewing team executed" ON executed_records;
DROP POLICY IF EXISTS "Team members can view team executed" ON executed_records;

CREATE POLICY "Users view own executed records" ON executed_records
FOR SELECT USING (auth.uid() = user_id OR auth.uid() = attributed_to_user_id);

CREATE POLICY "Users view team executed records" ON executed_records
FOR SELECT USING (
  team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Admins view all executed records" ON executed_records
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. PATIENT_DATA: Restringir apenas para admins e quem criou
DROP POLICY IF EXISTS "Everyone can view patient data" ON patient_data;
DROP POLICY IF EXISTS "Users can view patient data" ON patient_data;
DROP POLICY IF EXISTS "Authenticated users can view patient data" ON patient_data;

CREATE POLICY "Users view patients they created" ON patient_data
FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Admins view all patient data" ON patient_data
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. RFV_CUSTOMERS: Restringir para quem criou + admins
DROP POLICY IF EXISTS "Everyone can view rfv customers" ON rfv_customers;
DROP POLICY IF EXISTS "Users can view rfv customers" ON rfv_customers;
DROP POLICY IF EXISTS "Authenticated users can view rfv customers" ON rfv_customers;

CREATE POLICY "Users view rfv customers they created" ON rfv_customers
FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Admins view all rfv customers" ON rfv_customers
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. CRM_LEADS: Restringir por time do usuário
DROP POLICY IF EXISTS "Everyone can view crm leads" ON crm_leads;
DROP POLICY IF EXISTS "Users can view crm leads" ON crm_leads;
DROP POLICY IF EXISTS "Authenticated users can view crm leads" ON crm_leads;
DROP POLICY IF EXISTS "Team members can view leads" ON crm_leads;

CREATE POLICY "Users view assigned leads" ON crm_leads
FOR SELECT USING (auth.uid() = assigned_to);

CREATE POLICY "Users view team leads" ON crm_leads
FOR SELECT USING (
  team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Admins view all leads" ON crm_leads
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- 7. REFERRAL_LEADS: Restringir por time
DROP POLICY IF EXISTS "Everyone can view referral leads" ON referral_leads;
DROP POLICY IF EXISTS "Users can view referral leads" ON referral_leads;
DROP POLICY IF EXISTS "Authenticated users can view referral leads" ON referral_leads;

CREATE POLICY "Users view team referral leads" ON referral_leads
FOR SELECT USING (
  team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Admins view all referral leads" ON referral_leads
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- 8. CANCELLATIONS: Restringir para time e admins
DROP POLICY IF EXISTS "Everyone can view cancellations" ON cancellations;
DROP POLICY IF EXISTS "Users can view cancellations" ON cancellations;
DROP POLICY IF EXISTS "Authenticated users can view cancellations" ON cancellations;
DROP POLICY IF EXISTS "Team members can view team cancellations" ON cancellations;

CREATE POLICY "Users view own cancellations" ON cancellations
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view team cancellations" ON cancellations
FOR SELECT USING (
  team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Admins view all cancellations" ON cancellations
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- 9. CONTESTATIONS: Restringir para próprio + time + admins
DROP POLICY IF EXISTS "Everyone can view contestations" ON contestations;
DROP POLICY IF EXISTS "Users can view contestations" ON contestations;
DROP POLICY IF EXISTS "Authenticated users can view contestations" ON contestations;

CREATE POLICY "Users view own contestations" ON contestations
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view team contestations" ON contestations
FOR SELECT USING (
  team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Admins view all contestations" ON contestations
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- 10. INDIVIDUAL_GOALS: Restringir para próprio + admins
DROP POLICY IF EXISTS "Everyone can view individual goals" ON individual_goals;
DROP POLICY IF EXISTS "Users can view individual goals" ON individual_goals;

CREATE POLICY "Users view own individual goals" ON individual_goals
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins view all individual goals" ON individual_goals
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- 11. Restringir audit_log INSERT para admins apenas
DROP POLICY IF EXISTS "Users can insert audit logs for their actions" ON audit_log;

CREATE POLICY "Admins can insert audit logs" ON audit_log
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));