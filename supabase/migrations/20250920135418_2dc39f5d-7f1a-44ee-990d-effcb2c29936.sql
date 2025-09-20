-- Allow citizens to view workers who are assigned to their reports
CREATE POLICY "Citizens can view assigned workers" 
ON workers 
FOR SELECT 
USING (
  id IN (
    SELECT assigned_worker_id 
    FROM reports 
    WHERE citizen_id = auth.uid() 
    AND assigned_worker_id IS NOT NULL
  )
);