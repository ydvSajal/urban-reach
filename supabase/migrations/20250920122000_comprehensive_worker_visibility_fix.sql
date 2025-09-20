-- Comprehensive fix for worker visibility issues
-- This migration ensures citizens can see worker details for their assigned reports

-- First, let's ensure we have the correct policies for the workers table
-- Drop all existing worker policies to start clean
DROP POLICY IF EXISTS "workers_own" ON workers;
DROP POLICY IF EXISTS "workers_assigned_visible" ON workers;
DROP POLICY IF EXISTS "workers_citizen_view_assigned" ON workers;
DROP POLICY IF EXISTS "Citizens can view assigned workers" ON workers;
DROP POLICY IF EXISTS "Workers can view themselves" ON workers;
DROP POLICY IF EXISTS "Admins can manage workers in their council" ON workers;
DROP POLICY IF EXISTS "workers_own_profile" ON workers;
DROP POLICY IF EXISTS "workers_visible_to_citizens" ON workers;

-- Create comprehensive worker policies
-- 1. Workers can manage their own profile
CREATE POLICY "workers_own_access" ON workers 
FOR ALL 
USING (user_id = auth.uid());

-- 2. Citizens can view workers assigned to their reports
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

-- 3. Admins can manage all workers in their council
CREATE POLICY "workers_admin_council_access" ON workers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND council_id = workers.council_id
  )
);

-- 4. Additional policy for general worker visibility for authenticated users
-- This helps with admin interfaces and worker assignments
CREATE POLICY "workers_authenticated_view" ON workers 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Let's also ensure reports policies support worker information fetching
-- Check if we need to update reports policies
DROP POLICY IF EXISTS "reports_citizen_own" ON reports;
DROP POLICY IF EXISTS "reports_assigned_worker" ON reports;
DROP POLICY IF EXISTS "reports_update_worker" ON reports;

-- Recreate reports policies to ensure proper access
CREATE POLICY "reports_citizen_access" ON reports 
FOR ALL 
USING (citizen_id = auth.uid());

CREATE POLICY "reports_worker_view_assigned" ON reports 
FOR SELECT 
USING (
  assigned_worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "reports_worker_update_assigned" ON reports 
FOR UPDATE 
USING (
  assigned_worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()
  )
);

-- Admin access to reports in their council
CREATE POLICY "reports_admin_council_access" ON reports 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND council_id = reports.council_id
  )
);