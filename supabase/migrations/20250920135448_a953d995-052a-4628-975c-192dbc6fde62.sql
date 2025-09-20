-- Allow citizens to view profiles of staff members who have interacted with their reports
CREATE POLICY "Citizens can view staff profiles who worked on their reports" 
ON profiles 
FOR SELECT 
USING (
  -- Allow citizens to see profiles of users who have made status changes to their reports
  user_id IN (
    SELECT DISTINCT rsh.changed_by 
    FROM report_status_history rsh
    JOIN reports r ON rsh.report_id = r.id
    WHERE r.citizen_id = auth.uid()
  )
  OR
  -- Allow citizens to see their own profile
  user_id = auth.uid()
);