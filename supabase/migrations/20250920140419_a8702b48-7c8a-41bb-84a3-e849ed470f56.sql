-- Step 1: Drop the problematic policies that cause recursion
-- Focus on the ones that create the circular dependency

-- Drop the profile policy that references reports table
DROP POLICY IF EXISTS "Workers can view citizen profiles for assigned reports" ON profiles;