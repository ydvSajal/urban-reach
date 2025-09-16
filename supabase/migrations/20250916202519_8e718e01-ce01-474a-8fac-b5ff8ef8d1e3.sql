-- Fix worker-related RLS policies to ensure proper access

-- Update reports RLS policy for workers to allow status updates
DROP POLICY IF EXISTS "Workers can view assigned reports" ON reports;
CREATE POLICY "Workers can view assigned reports" 
ON reports FOR SELECT 
USING (
  (get_user_role(auth.uid()) = 'worker'::user_role) 
  AND (assigned_worker_id IN (
    SELECT w.id FROM workers w WHERE w.user_id = auth.uid()
  ))
);

-- Allow workers to update status of their assigned reports
CREATE POLICY "Workers can update assigned reports status" 
ON reports FOR UPDATE 
USING (
  (get_user_role(auth.uid()) = 'worker'::user_role) 
  AND (assigned_worker_id IN (
    SELECT w.id FROM workers w WHERE w.user_id = auth.uid()
  ))
)
WITH CHECK (
  (get_user_role(auth.uid()) = 'worker'::user_role) 
  AND (assigned_worker_id IN (
    SELECT w.id FROM workers w WHERE w.user_id = auth.uid()
  ))
);

-- Ensure workers can read profile data they need for citizen information
CREATE POLICY "Workers can view citizen profiles for assigned reports" 
ON profiles FOR SELECT 
USING (
  (get_user_role(auth.uid()) = 'worker'::user_role) 
  AND (user_id IN (
    SELECT r.citizen_id 
    FROM reports r 
    JOIN workers w ON r.assigned_worker_id = w.id 
    WHERE w.user_id = auth.uid()
  ))
);

-- Create function to automatically create worker profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_worker()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create worker profile if user role is worker
  IF NEW.raw_user_meta_data->>'role' = 'worker' THEN
    INSERT INTO public.workers (
      user_id, 
      full_name, 
      email, 
      council_id,
      is_available
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      NEW.email,
      -- Default to first council for now - should be set by admin
      (SELECT id FROM councils LIMIT 1),
      true
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic worker profile creation
DROP TRIGGER IF EXISTS on_auth_user_created_worker ON auth.users;
CREATE TRIGGER on_auth_user_created_worker
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_worker();