-- CORRECTED VERSION: RLS policies that avoid infinite recursion
-- Apply this ONLY after the emergency rollback has restored your site

-- Clean up emergency policies first
DROP POLICY IF EXISTS "workers_own_access" ON workers;
DROP POLICY IF EXISTS "workers_citizen_can_view_assigned" ON workers;
DROP POLICY IF EXISTS "workers_admin_council_access" ON workers;
DROP POLICY IF EXISTS "workers_emergency_view" ON workers;

-- SAFE POLICIES: These avoid infinite recursion by not self-referencing

-- 1. Workers can manage their own profile (no recursion - direct auth.uid() check)
CREATE POLICY "workers_self_management" ON workers 
FOR ALL 
USING (user_id = auth.uid());

-- 2. Admins can manage workers (no recursion - direct profile check without council reference)
CREATE POLICY "workers_admin_access" ON workers 
FOR ALL 
USING (
  auth.uid() IN (
    SELECT user_id FROM profiles WHERE role = 'admin'
  )
);

-- 3. Citizens can view assigned workers (no recursion - direct reports check)
CREATE POLICY "workers_citizen_view_assigned" ON workers 
FOR SELECT 
USING (
  auth.uid() IN (
    SELECT citizen_id FROM reports 
    WHERE assigned_worker_id = workers.id
  )
);

-- Note: Removed the "council colleagues" policy that was causing recursion
-- Workers will only see themselves, which is safer and prevents circular references

-- Add helpful comments
COMMENT ON POLICY "workers_self_management" ON workers IS 
'Workers can view and update their own profile - no recursion risk';

COMMENT ON POLICY "workers_admin_access" ON workers IS 
'Admins have full access to workers - simplified to avoid council recursion';

COMMENT ON POLICY "workers_citizen_view_assigned" ON workers IS 
'Citizens can view workers assigned to their reports - no recursion risk';