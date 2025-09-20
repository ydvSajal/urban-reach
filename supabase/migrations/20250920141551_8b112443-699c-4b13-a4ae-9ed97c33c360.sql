-- EMERGENCY FIX: Drop all problematic policies and create working ones

-- Drop all policies that cause infinite recursion
DROP POLICY IF EXISTS "Temporary broad profile access" ON profiles;
DROP POLICY IF EXISTS "Citizens basic report access" ON reports;
DROP POLICY IF EXISTS "Workers can view and update assigned reports basic" ON reports;
DROP POLICY IF EXISTS "Basic worker table access" ON workers;
DROP POLICY IF EXISTS "Admins can manage profiles in council" ON profiles;
DROP POLICY IF EXISTS "Citizens can view staff profiles who worked on their reports" ON profiles;
DROP POLICY IF EXISTS "All authenticated users can view any profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to view workers by ID" ON workers;

-- Create simple, working policies without circular dependencies

-- PROFILES table - simple access
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (user_id = auth.uid());

-- WORKERS table - simple access
CREATE POLICY "workers_select_own" ON workers FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "workers_insert_own" ON workers FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "workers_update_own" ON workers FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "workers_select_any_authenticated" ON workers FOR SELECT USING (auth.role() = 'authenticated');

-- REPORTS table - simple access 
CREATE POLICY "reports_citizen_full_access" ON reports FOR ALL USING (citizen_id = auth.uid());
CREATE POLICY "reports_worker_select" ON reports FOR SELECT USING (
  assigned_worker_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
);
CREATE POLICY "reports_worker_update" ON reports FOR UPDATE USING (
  assigned_worker_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
);

-- Allow basic viewing of profiles for report assignments
CREATE POLICY "profiles_view_for_reports" ON profiles FOR SELECT USING (
  user_id IN (
    SELECT DISTINCT assigned_worker_id FROM reports r 
    JOIN workers w ON r.assigned_worker_id = w.id 
    WHERE r.citizen_id = auth.uid()
  ) OR user_id = auth.uid()
);