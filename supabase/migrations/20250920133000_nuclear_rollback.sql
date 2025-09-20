-- NUCLEAR OPTION: Completely disable RLS on workers table temporarily
-- This will restore your site immediately while we fix the policies

-- First, drop ALL policies on workers table
DROP POLICY IF EXISTS "Workers can manage themselves" ON workers;
DROP POLICY IF EXISTS "Admins can manage workers in their council" ON workers;
DROP POLICY IF EXISTS "Citizens can view assigned workers" ON workers;
DROP POLICY IF EXISTS "Workers can view council colleagues" ON workers;
DROP POLICY IF EXISTS "workers_own_access" ON workers;
DROP POLICY IF EXISTS "workers_citizen_can_view_assigned" ON workers;
DROP POLICY IF EXISTS "workers_admin_council_access" ON workers;
DROP POLICY IF EXISTS "workers_emergency_view" ON workers;
DROP POLICY IF EXISTS "workers_authenticated_view" ON workers;
DROP POLICY IF EXISTS "workers_citizen_view_assigned" ON workers;
DROP POLICY IF EXISTS "workers_self_management" ON workers;
DROP POLICY IF EXISTS "workers_admin_access" ON workers;

-- TEMPORARILY DISABLE RLS to restore functionality
ALTER TABLE workers DISABLE ROW LEVEL SECURITY;

-- Add a comment to remember to re-enable later
COMMENT ON TABLE workers IS 'RLS temporarily disabled due to infinite recursion. Re-enable after fixing policies.';