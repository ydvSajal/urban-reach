-- Drop ALL existing policies first to start clean
-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;  
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_view_council" ON profiles;

-- Reports policies  
DROP POLICY IF EXISTS "Citizens can view their own reports" ON reports;
DROP POLICY IF EXISTS "Citizens can create reports" ON reports;
DROP POLICY IF EXISTS "reports_citizen_full_access" ON reports;
DROP POLICY IF EXISTS "reports_worker_select" ON reports;
DROP POLICY IF EXISTS "reports_worker_update" ON reports;
DROP POLICY IF EXISTS "reports_citizen_access" ON reports;
DROP POLICY IF EXISTS "reports_worker_access" ON reports;
DROP POLICY IF EXISTS "reports_admin_access" ON reports;

-- Workers policies
DROP POLICY IF EXISTS "Workers can view themselves" ON workers;
DROP POLICY IF EXISTS "Workers can insert their own profile" ON workers;
DROP POLICY IF EXISTS "Workers can update their own profile" ON workers;
DROP POLICY IF EXISTS "Citizens can view assigned workers" ON workers;
DROP POLICY IF EXISTS "workers_select_own" ON workers;
DROP POLICY IF EXISTS "workers_insert_own" ON workers;
DROP POLICY IF EXISTS "workers_update_own" ON workers;
DROP POLICY IF EXISTS "workers_select_any_authenticated" ON workers;
DROP POLICY IF EXISTS "workers_own_access" ON workers;
DROP POLICY IF EXISTS "workers_admin_access" ON workers;
DROP POLICY IF EXISTS "workers_citizen_view" ON workers;

-- Other table policies
DROP POLICY IF EXISTS "councils_view_own" ON councils;
DROP POLICY IF EXISTS "status_history_view" ON status_history;
DROP POLICY IF EXISTS "status_history_insert" ON status_history;
DROP POLICY IF EXISTS "completions_worker_access" ON work_completions;
DROP POLICY IF EXISTS "completions_admin_view" ON work_completions;

-- Storage policies
DROP POLICY IF EXISTS "Users can view report images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view report images for accessible reports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload report images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own report images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete report images" ON storage.objects;

-- Now create simple, working policies

-- PROFILES: Users can only access their own profile
CREATE POLICY "profiles_own_access" ON profiles 
FOR ALL USING (user_id = auth.uid());

-- REPORTS: Citizens can access their own reports
CREATE POLICY "reports_citizen_own" ON reports 
FOR ALL USING (citizen_id = auth.uid());

-- REPORTS: Workers can view/update assigned reports  
CREATE POLICY "reports_worker_assigned" ON reports 
FOR SELECT USING (
  assigned_worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "reports_worker_update_assigned" ON reports 
FOR UPDATE USING (
  assigned_worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()
  )
);

-- WORKERS: Users can manage their own worker profile
CREATE POLICY "workers_own_profile" ON workers 
FOR ALL USING (user_id = auth.uid());

-- WORKERS: Citizens can view workers assigned to their reports
CREATE POLICY "workers_visible_to_citizens" ON workers 
FOR SELECT USING (
  id IN (
    SELECT DISTINCT assigned_worker_id 
    FROM reports 
    WHERE citizen_id = auth.uid() 
    AND assigned_worker_id IS NOT NULL
  )
);

-- COUNCILS: Users can view their council (if they have a profile)
CREATE POLICY "councils_user_council" ON councils 
FOR SELECT USING (
  id IN (SELECT council_id FROM profiles WHERE user_id = auth.uid())
);

-- REPORT STATUS HISTORY: View history for accessible reports
CREATE POLICY "status_history_accessible" ON report_status_history 
FOR SELECT USING (
  report_id IN (
    SELECT id FROM reports WHERE 
    citizen_id = auth.uid() OR
    assigned_worker_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
  )
);

-- REPORT STATUS HISTORY: Workers can add status updates
CREATE POLICY "status_history_worker_insert" ON report_status_history 
FOR INSERT WITH CHECK (
  changed_by = auth.uid() AND
  report_id IN (
    SELECT id FROM reports WHERE 
    assigned_worker_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
  )
);

-- WORK COMPLETIONS: Workers can manage their completions
CREATE POLICY "completions_worker_own" ON work_completions 
FOR ALL USING (
  worker_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
);

-- STORAGE: Basic report image access
CREATE POLICY "storage_reports_view" ON storage.objects 
FOR SELECT USING (bucket_id = 'reports');

CREATE POLICY "storage_reports_upload" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'reports' AND auth.role() = 'authenticated');

CREATE POLICY "storage_reports_update" ON storage.objects 
FOR UPDATE USING (bucket_id = 'reports' AND auth.role() = 'authenticated');