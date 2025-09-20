-- Final RLS policies fix for worker visibility
-- This migration provides secure, targeted access while maintaining all functionality

-- Drop existing worker policies to start clean
DROP POLICY IF EXISTS "Admins can manage workers in their council" ON workers;
DROP POLICY IF EXISTS "Workers can view themselves" ON workers;
DROP POLICY IF EXISTS "workers_own_access" ON workers;
DROP POLICY IF EXISTS "workers_citizen_can_view_assigned" ON workers;
DROP POLICY IF EXISTS "workers_admin_council_access" ON workers;
DROP POLICY IF EXISTS "workers_authenticated_view" ON workers;
DROP POLICY IF EXISTS "Citizens can view assigned workers" ON workers;

-- 1. Workers can manage their own profile (view and update)
CREATE POLICY "Workers can manage themselves" 
ON workers 
FOR ALL 
USING (user_id = auth.uid());

-- 2. Admins can manage all workers in their council
CREATE POLICY "Admins can manage workers in their council" 
ON workers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND council_id = workers.council_id
  )
);

-- 3. Citizens can view workers assigned to their reports
CREATE POLICY "Citizens can view assigned workers" 
ON workers 
FOR SELECT 
USING (
  id IN (
    SELECT assigned_worker_id 
    FROM reports 
    WHERE citizen_id = auth.uid() 
    AND assigned_worker_id IS NOT NULL
  )
);

-- 4. Workers can view other workers in the same council (for coordination)
-- This is needed for worker interfaces that show team information
CREATE POLICY "Workers can view council colleagues" 
ON workers 
FOR SELECT 
USING (
  council_id IN (
    SELECT council_id 
    FROM workers 
    WHERE user_id = auth.uid()
  )
);

-- Add helpful comments for future reference
COMMENT ON POLICY "Workers can manage themselves" ON workers IS 
'Allows workers to view and update their own profile information';

COMMENT ON POLICY "Admins can manage workers in their council" ON workers IS 
'Allows admins full access to manage workers within their council jurisdiction';

COMMENT ON POLICY "Citizens can view assigned workers" ON workers IS 
'Allows citizens to see basic information about workers assigned to their reports';

COMMENT ON POLICY "Workers can view council colleagues" ON workers IS 
'Allows workers to see other workers in their council for coordination purposes';