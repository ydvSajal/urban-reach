-- Allow citizens to view the worker assigned to their own reports
-- This enables the frontend to fetch limited worker details for the
-- citizen who created the report.

-- Ensure RLS is enabled (it already is in prior migrations, but this is safe)
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

-- Citizens can SELECT workers that are assigned to their own reports
CREATE POLICY "Citizens can view assigned workers" ON public.workers
FOR SELECT USING (
  id IN (
    SELECT assigned_worker_id FROM public.reports WHERE citizen_id = auth.uid()
  )
);
