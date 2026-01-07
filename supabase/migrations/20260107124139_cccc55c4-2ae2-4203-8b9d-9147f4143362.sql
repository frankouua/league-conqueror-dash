-- ========================================
-- CORREÇÃO: Remover políticas permissivas que permitem acesso total
-- ========================================

-- 1. CANCELLATIONS
DROP POLICY IF EXISTS "All authenticated users can view cancellations" ON cancellations;

-- 2. CONTESTATIONS
DROP POLICY IF EXISTS "All authenticated users can view contestations" ON contestations;

-- 3. EXECUTED_RECORDS
DROP POLICY IF EXISTS "All authenticated users can view executed records" ON executed_records;

-- 4. REVENUE_RECORDS
DROP POLICY IF EXISTS "All authenticated users can view revenue records" ON revenue_records;

-- 5. CRM_LEADS - dropar policies antigas e manter apenas as novas restritivas
DROP POLICY IF EXISTS "Users can view leads from their team or assigned to them" ON crm_leads;

-- 6. PROFILES
DROP POLICY IF EXISTS "All authenticated users can view profiles" ON profiles;

-- 7. PATIENT_DATA
DROP POLICY IF EXISTS "All authenticated users can view patient data" ON patient_data;
DROP POLICY IF EXISTS "Authenticated users can view patient data" ON patient_data;
DROP POLICY IF EXISTS "Users can view patient data" ON patient_data;

-- 8. RFV_CUSTOMERS
DROP POLICY IF EXISTS "All authenticated users can view rfv customers" ON rfv_customers;
DROP POLICY IF EXISTS "Authenticated users can view rfv customers" ON rfv_customers;
DROP POLICY IF EXISTS "Users can view rfv customers" ON rfv_customers;

-- 9. REFERRAL_LEADS
DROP POLICY IF EXISTS "All authenticated users can view referral leads" ON referral_leads;
DROP POLICY IF EXISTS "Authenticated users can view referral leads" ON referral_leads;
DROP POLICY IF EXISTS "Users can view referral leads" ON referral_leads;

-- 10. INDIVIDUAL_GOALS
DROP POLICY IF EXISTS "All authenticated users can view individual goals" ON individual_goals;
DROP POLICY IF EXISTS "Authenticated users can view individual goals" ON individual_goals;
DROP POLICY IF EXISTS "Users can view individual goals" ON individual_goals;