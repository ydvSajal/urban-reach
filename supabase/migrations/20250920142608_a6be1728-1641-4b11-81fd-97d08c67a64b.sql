-- First, drop all problematic policies to stop infinite recursion
DROP POLICY IF EXISTS "admin_view_council_profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_view_for_reports" ON profiles;
DROP POLICY IF EXISTS "admin_view_council_reports" ON reports;
DROP POLICY IF EXISTS "admin_update_council_reports" ON reports;
DROP POLICY IF EXISTS "admin_view_council_workers" ON workers;
DROP POLICY IF EXISTS "Admins can manage reports in their council" ON reports;
DROP POLICY IF EXISTS "Workers can view assigned reports" ON reports;
DROP POLICY IF EXISTS "Workers can update assigned reports status" ON reports;
DROP POLICY IF EXISTS "Users can view status history for accessible reports" ON report_status_history;
DROP POLICY IF EXISTS "Admins and workers can create status history" ON report_status_history;
DROP POLICY IF EXISTS "Admins can view completions in their council" ON work_completions;
DROP POLICY IF EXISTS "Admins can manage workers in their council" ON workers;
DROP POLICY IF EXISTS "Users can view their council" ON councils;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_user_role(uuid);
DROP FUNCTION IF EXISTS get_user_council(uuid);

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid DEFAULT auth.uid())
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE user_id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_council(user_uuid uuid DEFAULT auth.uid())
RETURNS uuid AS $$
  SELECT council_id FROM public.profiles WHERE user_id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Clean, simple RLS policies without recursion

-- Profiles policies
CREATE POLICY "profiles_select_own" ON profiles 
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "profiles_insert_own" ON profiles 
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_update_own" ON profiles 
FOR UPDATE USING (user_id = auth.uid());

-- Admin can view profiles in same council
CREATE POLICY "profiles_admin_view_council" ON profiles 
FOR SELECT USING (
  public.get_user_role() = 'admin' AND 
  council_id = public.get_user_council()
);

-- Reports policies
CREATE POLICY "reports_citizen_select" ON reports 
FOR SELECT USING (citizen_id = auth.uid());

CREATE POLICY "reports_citizen_insert" ON reports 
FOR INSERT WITH CHECK (citizen_id = auth.uid());

CREATE POLICY "reports_citizen_update" ON reports 
FOR UPDATE USING (citizen_id = auth.uid());

-- Workers can view their assigned reports
CREATE POLICY "reports_worker_select" ON reports 
FOR SELECT USING (
  assigned_worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()
  )
);

-- Workers can update their assigned reports
CREATE POLICY "reports_worker_update" ON reports 
FOR UPDATE USING (
  assigned_worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()
  )
);

-- Admin can manage reports in their council
CREATE POLICY "reports_admin_all" ON reports 
FOR ALL USING (
  public.get_user_role() = 'admin' AND 
  council_id = public.get_user_council()
);

-- Workers policies
CREATE POLICY "workers_select_own" ON workers 
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "workers_insert_own" ON workers 
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "workers_update_own" ON workers 
FOR UPDATE USING (user_id = auth.uid());

-- Admin can manage workers in their council
CREATE POLICY "workers_admin_all" ON workers 
FOR ALL USING (
  public.get_user_role() = 'admin' AND 
  council_id = public.get_user_council()
);

-- Citizens can view assigned workers
CREATE POLICY "workers_citizen_view_assigned" ON workers 
FOR SELECT USING (
  id IN (
    SELECT assigned_worker_id FROM reports 
    WHERE citizen_id = auth.uid() AND assigned_worker_id IS NOT NULL
  )
);

-- Councils policy
CREATE POLICY "councils_view_own" ON councils 
FOR SELECT USING (id = public.get_user_council());

-- Report status history policies
CREATE POLICY "status_history_view_accessible" ON report_status_history 
FOR SELECT USING (
  report_id IN (
    SELECT id FROM reports WHERE 
    citizen_id = auth.uid() OR
    (public.get_user_role() = 'admin' AND council_id = public.get_user_council()) OR
    assigned_worker_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
  )
);

CREATE POLICY "status_history_admin_worker_insert" ON report_status_history 
FOR INSERT WITH CHECK (
  public.get_user_role() IN ('admin', 'worker') AND 
  changed_by = auth.uid()
);

-- Work completions policies
CREATE POLICY "completions_worker_own" ON work_completions 
FOR ALL USING (
  worker_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
);

CREATE POLICY "completions_admin_council" ON work_completions 
FOR SELECT USING (
  public.get_user_role() = 'admin' AND
  worker_id IN (
    SELECT id FROM workers WHERE council_id = public.get_user_council()
  )
);