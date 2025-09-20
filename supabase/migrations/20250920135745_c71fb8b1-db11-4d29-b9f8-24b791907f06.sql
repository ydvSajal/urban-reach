-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Citizens can view assigned workers" ON workers;

-- Create a more specific policy that doesn't cause recursion
-- Workers table should be readable by citizens only when they have a direct worker assignment
-- We'll handle this in the application logic instead of RLS to avoid recursion