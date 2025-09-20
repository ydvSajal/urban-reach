-- EMERGENCY ROLLBACK: Remove policies causing infinite recursion
-- Apply this immediately to restore your website functionality

-- Remove all the problematic policies we just added
DROP POLICY IF EXISTS "Workers can manage themselves" ON workers;
DROP POLICY IF EXISTS "Admins can manage workers in their council" ON workers;
DROP POLICY IF EXISTS "Citizens can view assigned workers" ON workers;
DROP POLICY IF EXISTS "Workers can view council colleagues" ON workers;

-- Restore the previous working policies temporarily
-- Based on your previous migrations, restore these safe policies:

-- 1. Workers can access their own profile
CREATE POLICY "workers_own_access" ON workers 
FOR ALL 
USING (user_id = auth.uid());

-- 2. Citizens can view workers assigned to their reports (simple version)
CREATE POLICY "workers_citizen_can_view_assigned" ON workers 
FOR SELECT 
USING (
  id IN (
    SELECT DISTINCT assigned_worker_id 
    FROM reports 
    WHERE citizen_id = auth.uid() 
    AND assigned_worker_id IS NOT NULL
  )
);

-- 3. Admin access (simplified to avoid recursion)
CREATE POLICY "workers_admin_council_access" ON workers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Emergency: Allow authenticated users to view workers (temporary broad access)
-- We'll restrict this later once the site is working
CREATE POLICY "workers_emergency_view" ON workers 
FOR SELECT 
USING (auth.role() = 'authenticated');