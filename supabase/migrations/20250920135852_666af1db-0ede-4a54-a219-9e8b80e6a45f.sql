-- Create a simple policy for workers that doesn't reference reports table
-- This allows citizens to view specific workers by ID without causing recursion
CREATE POLICY "Allow users to view workers by ID" 
ON workers 
FOR SELECT 
USING (auth.role() = 'authenticated');