-- Fix infinite recursion in RLS policies
-- The issue is caused by circular dependency between profiles and reports tables

-- Drop the problematic policy that causes circular dependency
DROP POLICY IF EXISTS "Workers can view citizen profiles for assigned reports" ON profiles;

-- Modify the get_user_role function to avoid RLS issues by using a more direct approach
CREATE OR REPLACE FUNCTION public.get_user_role_direct(user_uuid UUID)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Use a direct query without triggering RLS on profiles
  SELECT 
    CASE 
      WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = user_uuid AND raw_user_meta_data->>'role' = 'admin') THEN 'admin'::user_role
      WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = user_uuid AND raw_user_meta_data->>'role' = 'worker') THEN 'worker'::user_role
      ELSE 'citizen'::user_role
    END;
$$;

-- Create a simplified function to get user council without causing recursion
CREATE OR REPLACE FUNCTION public.get_user_council_direct(user_uuid UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Get council from auth metadata or workers table for workers, profiles for others
  SELECT 
    CASE 
      WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = user_uuid AND raw_user_meta_data->>'role' = 'worker') 
      THEN (SELECT council_id FROM workers WHERE user_id = user_uuid LIMIT 1)
      ELSE (SELECT raw_user_meta_data->>'council_id' FROM auth.users WHERE id = user_uuid)::uuid
    END;
$$;

-- Update reports policies to use the new non-recursive functions
DROP POLICY IF EXISTS "Citizens can view their own reports" ON reports;
CREATE POLICY "Citizens can view their own reports" ON reports
FOR SELECT USING (citizen_id = auth.uid());

DROP POLICY IF EXISTS "Citizens can create reports" ON reports;
CREATE POLICY "Citizens can create reports" ON reports
FOR INSERT WITH CHECK (citizen_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage reports in their council" ON reports;
CREATE POLICY "Admins can manage reports in their council" ON reports
FOR ALL USING (
  public.get_user_role_direct(auth.uid()) = 'admin' AND 
  council_id = public.get_user_council_direct(auth.uid())
);

DROP POLICY IF EXISTS "Workers can view assigned reports" ON reports;
CREATE POLICY "Workers can view assigned reports" ON reports
FOR SELECT USING (
  public.get_user_role_direct(auth.uid()) = 'worker' AND 
  assigned_worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Workers can update assigned reports status" ON reports;
CREATE POLICY "Workers can update assigned reports status" 
ON reports FOR UPDATE 
USING (
  public.get_user_role_direct(auth.uid()) = 'worker' 
  AND assigned_worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid())
)
WITH CHECK (
  public.get_user_role_direct(auth.uid()) = 'worker' 
  AND assigned_worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid())
);

-- Update profiles policies to use non-recursive functions and remove circular dependency
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
FOR UPDATE USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Add a simpler policy for workers to view citizen profiles without circular dependency
CREATE POLICY "Workers can view profiles" ON profiles
FOR SELECT USING (
  public.get_user_role_direct(auth.uid()) = 'worker'
);

-- Update workers policies to use non-recursive functions
DROP POLICY IF EXISTS "Admins can manage workers in their council" ON workers;
CREATE POLICY "Admins can manage workers in their council" ON workers
FOR ALL USING (
  public.get_user_role_direct(auth.uid()) = 'admin' AND 
  council_id = public.get_user_council_direct(auth.uid())
);

-- Update report status history policies
DROP POLICY IF EXISTS "Users can view status history for accessible reports" ON report_status_history;
CREATE POLICY "Users can view status history for accessible reports" ON report_status_history
FOR SELECT USING (
  report_id IN (
    SELECT id FROM public.reports WHERE 
    citizen_id = auth.uid() OR 
    (public.get_user_role_direct(auth.uid()) = 'admin' AND council_id = public.get_user_council_direct(auth.uid())) OR
    (public.get_user_role_direct(auth.uid()) = 'worker' AND assigned_worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid()))
  )
);

DROP POLICY IF EXISTS "Admins and workers can create status history" ON report_status_history;
CREATE POLICY "Admins and workers can create status history" ON report_status_history
FOR INSERT WITH CHECK (
  public.get_user_role_direct(auth.uid()) IN ('admin', 'worker') AND
  changed_by = auth.uid()
);

-- Update councils policy
DROP POLICY IF EXISTS "Users can view their council" ON councils;
CREATE POLICY "Users can view their council" ON councils
FOR SELECT USING (
  id = public.get_user_council_direct(auth.uid()) OR
  public.get_user_role_direct(auth.uid()) = 'admin'
);

-- Add comment explaining the fix
COMMENT ON FUNCTION public.get_user_role_direct(UUID) IS 'Non-recursive function to get user role from auth metadata, avoiding RLS circular dependency';
COMMENT ON FUNCTION public.get_user_council_direct(UUID) IS 'Non-recursive function to get user council, avoiding RLS circular dependency';