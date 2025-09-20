-- Drop ALL existing policies to eliminate infinite recursion issues
DROP POLICY IF EXISTS "Users can view their council" ON councils;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;  
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_view_for_reports" ON profiles;
DROP POLICY IF EXISTS "admin_view_council_profiles" ON profiles;

DROP POLICY IF EXISTS "Citizens can view their own reports" ON reports;
DROP POLICY IF EXISTS "Citizens can create reports" ON reports;
DROP POLICY IF EXISTS "reports_citizen_full_access" ON reports;
DROP POLICY IF EXISTS "reports_worker_select" ON reports;
DROP POLICY IF EXISTS "reports_worker_update" ON reports;
DROP POLICY IF EXISTS "Admins can manage reports in their council" ON reports;
DROP POLICY IF EXISTS "Workers can view assigned reports" ON reports;
DROP POLICY IF EXISTS "Workers can update assigned reports status" ON reports;
DROP POLICY IF EXISTS "admin_view_council_reports" ON reports;
DROP POLICY IF EXISTS "admin_update_council_reports" ON reports;

DROP POLICY IF EXISTS "Workers can view themselves" ON workers;
DROP POLICY IF EXISTS "Workers can insert their own profile" ON workers;
DROP POLICY IF EXISTS "Workers can update their own profile" ON workers;
DROP POLICY IF EXISTS "Citizens can view assigned workers" ON workers;
DROP POLICY IF EXISTS "workers_select_own" ON workers;
DROP POLICY IF EXISTS "workers_insert_own" ON workers;
DROP POLICY IF EXISTS "workers_update_own" ON workers;
DROP POLICY IF EXISTS "workers_select_any_authenticated" ON workers;
DROP POLICY IF EXISTS "Admins can manage workers in their council" ON workers;
DROP POLICY IF EXISTS "admin_view_council_workers" ON workers;

DROP POLICY IF EXISTS "Users can view status history for accessible reports" ON report_status_history;
DROP POLICY IF EXISTS "Admins and workers can create status history" ON report_status_history;

DROP POLICY IF EXISTS "Workers can create their own completions" ON work_completions;
DROP POLICY IF EXISTS "Workers can view their own completions" ON work_completions;
DROP POLICY IF EXISTS "Admins can view completions in their council" ON work_completions;

-- Create basic, working policies without recursion

-- PROFILES: Users can access their own profile only
CREATE POLICY "profiles_own" ON profiles 
FOR ALL USING (user_id = auth.uid());

-- REPORTS: Citizens can access their own reports
CREATE POLICY "reports_own" ON reports 
FOR ALL USING (citizen_id = auth.uid());

-- REPORTS: Workers can view their assigned reports
CREATE POLICY "reports_assigned_worker" ON reports 
FOR SELECT USING (
  assigned_worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()
  )
);

-- REPORTS: Workers can update their assigned reports
CREATE POLICY "reports_update_worker" ON reports 
FOR UPDATE USING (
  assigned_worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()
  )
);

-- WORKERS: Users can manage their own worker profile
CREATE POLICY "workers_own" ON workers 
FOR ALL USING (user_id = auth.uid());

-- WORKERS: Citizens can see workers assigned to their reports
CREATE POLICY "workers_assigned_visible" ON workers 
FOR SELECT USING (
  id IN (
    SELECT DISTINCT assigned_worker_id 
    FROM reports 
    WHERE citizen_id = auth.uid() 
    AND assigned_worker_id IS NOT NULL
  )
);

-- COUNCILS: Users can see their council
CREATE POLICY "councils_own" ON councils 
FOR SELECT USING (
  id IN (SELECT council_id FROM profiles WHERE user_id = auth.uid())
);

-- STATUS HISTORY: View for accessible reports
CREATE POLICY "status_history_view" ON report_status_history 
FOR SELECT USING (
  report_id IN (
    SELECT id FROM reports WHERE 
    citizen_id = auth.uid() OR
    assigned_worker_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
  )
);

-- STATUS HISTORY: Workers can add updates
CREATE POLICY "status_history_insert" ON report_status_history 
FOR INSERT WITH CHECK (
  changed_by = auth.uid() AND
  report_id IN (
    SELECT id FROM reports WHERE 
    assigned_worker_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
  )
);

-- COMPLETIONS: Workers can manage their own
CREATE POLICY "completions_own" ON work_completions 
FOR ALL USING (
  worker_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
);