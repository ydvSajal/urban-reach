-- Drop all policies that cause circular dependencies and recreate them properly
-- First, drop problematic policies

-- Drop profiles policies that reference reports
DROP POLICY IF EXISTS "Workers can view citizen profiles for assigned reports" ON profiles;
DROP POLICY IF EXISTS "Citizens can view staff profiles who worked on their reports" ON profiles;

-- Drop reports policies that use functions calling profiles  
DROP POLICY IF EXISTS "Admins can manage reports in their council" ON reports;
DROP POLICY IF EXISTS "Workers can update assigned reports status" ON reports;
DROP POLICY IF EXISTS "Workers can view assigned reports" ON reports;

-- Create new policies without circular dependencies

-- Profiles policies - simple user-based access
CREATE POLICY "Users can view their own profile" 
ON profiles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" 
ON profiles 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile" 
ON profiles 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Reports policies - direct user ID based access without function calls
CREATE POLICY "Citizens can view their own reports" 
ON reports 
FOR SELECT 
USING (citizen_id = auth.uid());

CREATE POLICY "Citizens can create reports" 
ON reports 
FOR INSERT 
WITH CHECK (citizen_id = auth.uid());

-- Workers can view reports assigned directly to them (using worker user_id)
CREATE POLICY "Workers can view assigned reports by user_id" 
ON reports 
FOR SELECT 
USING (
  assigned_worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Workers can update assigned reports by user_id" 
ON reports 
FOR UPDATE 
USING (
  assigned_worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()
  )
);