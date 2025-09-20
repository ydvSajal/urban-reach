-- Fix RLS policies to allow citizens to view worker information for their assigned reports
-- Enhanced version with full functionality preservation

-- Comprehensive cleanup of existing worker policies
DROP POLICY IF EXISTS "Admins can manage workers in their council" ON workers;
DROP POLICY IF EXISTS "Workers can view themselves" ON workers;
DROP POLICY IF EXISTS "workers_own_access" ON workers;
DROP POLICY IF EXISTS "workers_citizen_can_view_assigned" ON workers;
DROP POLICY IF EXISTS "workers_admin_council_access" ON workers;
DROP POLICY IF EXISTS "workers_authenticated_view" ON workers;
DROP POLICY IF EXISTS "Citizens can view assigned workers" ON workers;

-- 1. Workers can manage their own profile (CRITICAL: FOR ALL, not just SELECT)
CREATE POLICY "Workers can manage themselves" 
ON workers 
FOR ALL 
USING (user_id = auth.uid());

-- 2. Admins can manage workers in their council (optimized with EXISTS)
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

-- 3. Citizens can view assigned workers (your original requirement)
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

-- 4. Workers can view colleagues for coordination
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