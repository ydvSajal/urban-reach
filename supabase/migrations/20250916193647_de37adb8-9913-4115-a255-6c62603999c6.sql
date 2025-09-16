-- Fix RLS policies for workers table to allow workers to insert their own profile
DROP POLICY IF EXISTS "Workers can insert their own profile" ON public.workers;

CREATE POLICY "Workers can insert their own profile" 
ON public.workers 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow workers to update their own profile
DROP POLICY IF EXISTS "Workers can update their own profile" ON public.workers;

CREATE POLICY "Workers can update their own profile" 
ON public.workers 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid());

-- Add completion photos column to reports table
ALTER TABLE reports ADD COLUMN completion_photos text[] DEFAULT NULL;

-- Create table for work completion updates
CREATE TABLE work_completions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  completion_notes text,
  completion_photos text[],
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on work_completions
ALTER TABLE work_completions ENABLE ROW LEVEL SECURITY;

-- Workers can create their own completion records
CREATE POLICY "Workers can create their own completions" 
ON work_completions 
FOR INSERT 
TO authenticated
WITH CHECK (worker_id IN (SELECT id FROM workers WHERE user_id = auth.uid()));

-- Workers can view their own completions
CREATE POLICY "Workers can view their own completions" 
ON work_completions 
FOR SELECT 
TO authenticated
USING (worker_id IN (SELECT id FROM workers WHERE user_id = auth.uid()));

-- Admins can view all completions in their council
CREATE POLICY "Admins can view completions in their council" 
ON work_completions 
FOR SELECT 
TO authenticated
USING (
  get_user_role(auth.uid()) = 'admin' AND 
  worker_id IN (
    SELECT w.id FROM workers w 
    WHERE w.council_id = get_user_council(auth.uid())
  )
);