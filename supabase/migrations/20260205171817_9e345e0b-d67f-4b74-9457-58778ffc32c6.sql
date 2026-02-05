
-- Remove the recursive policy that's breaking everything
DROP POLICY IF EXISTS "Approved users can view team profiles" ON public.profiles;

-- Keep simpler policies that don't cause recursion:
-- 1. User can see their own profile (already exists: "Profiles: view own")
-- 2. Admin can see all (already exists: "Profiles: admin view all")  
-- 3. User can see team members (already exists: "Profiles: view team")
-- 4. Approved users policy (already exists: "approved_users_can_read_profiles")

-- No need to add new ones, just removing the broken one
