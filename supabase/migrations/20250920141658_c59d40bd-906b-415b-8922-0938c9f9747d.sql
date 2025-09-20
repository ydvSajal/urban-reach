-- Add admin access policies for proper admin functionality

-- Allow admin users to view all profiles in their council
CREATE POLICY "admin_view_council_profiles" ON profiles 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
    AND p.council_id = profiles.council_id
  )
);

-- Allow admin users to view all reports in their council  
CREATE POLICY "admin_view_council_reports" ON reports
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
    AND p.council_id = reports.council_id
  )
);

-- Allow admin users to update reports in their council
CREATE POLICY "admin_update_council_reports" ON reports
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
    AND p.council_id = reports.council_id
  )
);

-- Allow admin users to view all workers in their council
CREATE POLICY "admin_view_council_workers" ON workers
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
    AND p.council_id = workers.council_id
  )
);