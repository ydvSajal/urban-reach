-- Step 2: Recreate the essential policies for basic functionality
-- Create a basic profile policy that doesn't use functions to query other tables

CREATE POLICY "Workers can view citizen profiles for their reports" 
ON profiles 
FOR SELECT 
USING (
  -- Workers can see citizen profiles only - simplified version
  EXISTS (
    SELECT 1 FROM workers w 
    WHERE w.user_id = auth.uid() 
    AND w.id IN (
      SELECT assigned_worker_id 
      FROM reports 
      WHERE citizen_id = profiles.user_id 
      AND assigned_worker_id IS NOT NULL
    )
  )
  OR user_id = auth.uid() -- users can see their own profile
);