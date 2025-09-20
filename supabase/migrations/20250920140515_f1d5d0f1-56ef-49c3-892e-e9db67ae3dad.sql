-- Drop the policy I just created that also causes circular dependency
DROP POLICY IF EXISTS "Workers can view citizen profiles for their reports" ON profiles;

-- Create MINIMAL policies without any cross-table references
-- Start with basic profile access only
CREATE POLICY "All authenticated users can view any profile" 
ON profiles 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- For admin access, add council-specific access
CREATE POLICY "Admins can manage profiles in council" 
ON profiles 
FOR ALL 
USING (
  -- Only check council_id directly, no function calls
  profiles.council_id = (
    SELECT council_id FROM profiles p WHERE p.user_id = auth.uid()
  ) 
  AND EXISTS (
    SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);