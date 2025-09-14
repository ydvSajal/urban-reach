-- Worker Management Enhancements
-- Add workload tracking and performance metrics to workers table

-- Add workload tracking columns to workers table
ALTER TABLE public.workers 
ADD COLUMN IF NOT EXISTS current_workload INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_workload INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS performance_rating DECIMAL(3,2) DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS total_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_completion_time INTEGER DEFAULT 0; -- in hours

-- Create index for efficient worker queries
CREATE INDEX IF NOT EXISTS idx_workers_availability ON public.workers(is_available, specialty);
CREATE INDEX IF NOT EXISTS idx_workers_workload ON public.workers(current_workload, max_workload);
CREATE INDEX IF NOT EXISTS idx_workers_performance ON public.workers(performance_rating DESC);

-- Create function to update worker workload
CREATE OR REPLACE FUNCTION public.update_worker_workload()
RETURNS TRIGGER AS $$
BEGIN
    -- When a report is assigned to a worker
    IF NEW.assigned_worker_id IS NOT NULL AND (OLD.assigned_worker_id IS NULL OR OLD.assigned_worker_id != NEW.assigned_worker_id) THEN
        -- Increment workload for new worker
        UPDATE public.workers 
        SET current_workload = current_workload + 1
        WHERE id = NEW.assigned_worker_id;
        
        -- Decrement workload for old worker if there was one
        IF OLD.assigned_worker_id IS NOT NULL THEN
            UPDATE public.workers 
            SET current_workload = GREATEST(current_workload - 1, 0)
            WHERE id = OLD.assigned_worker_id;
        END IF;
    END IF;
    
    -- When a report is unassigned from a worker
    IF NEW.assigned_worker_id IS NULL AND OLD.assigned_worker_id IS NOT NULL THEN
        UPDATE public.workers 
        SET current_workload = GREATEST(current_workload - 1, 0)
        WHERE id = OLD.assigned_worker_id;
    END IF;
    
    -- When a report is resolved or closed
    IF NEW.status IN ('resolved', 'closed') AND OLD.status NOT IN ('resolved', 'closed') AND NEW.assigned_worker_id IS NOT NULL THEN
        UPDATE public.workers 
        SET 
            current_workload = GREATEST(current_workload - 1, 0),
            total_completed = total_completed + 1
        WHERE id = NEW.assigned_worker_id;
        
        -- Calculate average completion time
        UPDATE public.workers 
        SET avg_completion_time = (
            SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600)::INTEGER
            FROM public.reports 
            WHERE assigned_worker_id = NEW.assigned_worker_id 
            AND status IN ('resolved', 'closed')
            AND resolved_at IS NOT NULL
        )
        WHERE id = NEW.assigned_worker_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for workload management
DROP TRIGGER IF EXISTS trigger_update_worker_workload ON public.reports;
CREATE TRIGGER trigger_update_worker_workload
    AFTER UPDATE ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION public.update_worker_workload();

-- Create function to calculate worker performance rating
CREATE OR REPLACE FUNCTION public.calculate_worker_performance(worker_id UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    completion_rate DECIMAL(3,2);
    avg_time_score DECIMAL(3,2);
    total_assigned INTEGER;
    total_completed INTEGER;
    avg_completion_hours INTEGER;
    performance_score DECIMAL(3,2);
BEGIN
    -- Get worker statistics
    SELECT 
        w.total_completed,
        w.avg_completion_time,
        COUNT(r.id) as assigned_count
    INTO total_completed, avg_completion_hours, total_assigned
    FROM public.workers w
    LEFT JOIN public.reports r ON r.assigned_worker_id = w.id
    WHERE w.id = worker_id
    GROUP BY w.id, w.total_completed, w.avg_completion_time;
    
    -- Calculate completion rate (0-5 scale)
    IF total_assigned > 0 THEN
        completion_rate := (total_completed::DECIMAL / total_assigned) * 5;
    ELSE
        completion_rate := 5.0;
    END IF;
    
    -- Calculate time efficiency score (0-5 scale, lower time is better)
    -- Assuming 48 hours is average, scale accordingly
    IF avg_completion_hours > 0 THEN
        avg_time_score := GREATEST(5 - (avg_completion_hours::DECIMAL / 48) * 2, 1);
    ELSE
        avg_time_score := 5.0;
    END IF;
    
    -- Weighted average: 60% completion rate, 40% time efficiency
    performance_score := (completion_rate * 0.6) + (avg_time_score * 0.4);
    
    -- Ensure score is between 1 and 5
    performance_score := GREATEST(LEAST(performance_score, 5.0), 1.0);
    
    RETURN performance_score;
END;
$$ LANGUAGE plpgsql;

-- Create function to update all worker performance ratings
CREATE OR REPLACE FUNCTION public.update_all_worker_performance()
RETURNS void AS $$
DECLARE
    worker_record RECORD;
BEGIN
    FOR worker_record IN SELECT id FROM public.workers LOOP
        UPDATE public.workers 
        SET performance_rating = public.calculate_worker_performance(worker_record.id)
        WHERE id = worker_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create worker specialties lookup table
CREATE TABLE IF NOT EXISTS public.worker_specialties (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    category_mapping TEXT[], -- Maps to report categories
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default specialties
INSERT INTO public.worker_specialties (name, description, category_mapping) VALUES
('Roads & Infrastructure', 'Road maintenance, pothole repairs, street construction', ARRAY['roads', 'drainage']),
('Water & Plumbing', 'Water supply issues, pipe repairs, water quality', ARRAY['water_supply', 'drainage']),
('Electrical & Lighting', 'Street lights, electrical repairs, power issues', ARRAY['electricity', 'street_lights']),
('Sanitation & Waste', 'Waste collection, cleaning, sanitation services', ARRAY['sanitation', 'waste_management']),
('Parks & Landscaping', 'Park maintenance, tree care, landscaping', ARRAY['parks']),
('Public Safety', 'Safety inspections, emergency response', ARRAY['public_safety']),
('General Maintenance', 'General repairs and maintenance tasks', ARRAY['other'])
ON CONFLICT (name) DO NOTHING;

-- Create worker availability schedule table
CREATE TABLE IF NOT EXISTS public.worker_schedules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(worker_id, day_of_week)
);

-- Create worker performance metrics view
CREATE OR REPLACE VIEW public.worker_performance_metrics AS
SELECT 
    w.id,
    w.full_name,
    w.specialty,
    w.is_available,
    w.current_workload,
    w.max_workload,
    w.performance_rating,
    w.total_completed,
    w.avg_completion_time,
    ROUND((w.current_workload::DECIMAL / w.max_workload) * 100, 1) as workload_percentage,
    COUNT(r.id) as total_assigned,
    COUNT(CASE WHEN r.status IN ('resolved', 'closed') THEN 1 END) as completed_reports,
    COUNT(CASE WHEN r.status = 'in_progress' THEN 1 END) as active_reports,
    COUNT(CASE WHEN r.status = 'acknowledged' THEN 1 END) as pending_reports,
    AVG(CASE 
        WHEN r.resolved_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (r.resolved_at - r.created_at))/3600 
    END)::INTEGER as actual_avg_completion_hours
FROM public.workers w
LEFT JOIN public.reports r ON r.assigned_worker_id = w.id
GROUP BY w.id, w.full_name, w.specialty, w.is_available, w.current_workload, 
         w.max_workload, w.performance_rating, w.total_completed, w.avg_completion_time;

-- Enable RLS for new tables
ALTER TABLE public.worker_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for worker_specialties (read-only for all authenticated users)
CREATE POLICY "Anyone can view worker specialties" ON public.worker_specialties
FOR SELECT TO authenticated USING (true);

-- RLS Policies for worker_schedules
CREATE POLICY "Workers can manage their own schedules" ON public.worker_schedules
FOR ALL USING (
    worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can view all worker schedules" ON public.worker_schedules
FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'admin'
);

-- Create function to get available workers for a category
CREATE OR REPLACE FUNCTION public.get_available_workers_for_category(report_category TEXT)
RETURNS TABLE (
    worker_id UUID,
    full_name TEXT,
    specialty TEXT,
    current_workload INTEGER,
    max_workload INTEGER,
    performance_rating DECIMAL(3,2),
    workload_percentage DECIMAL(5,1)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id as worker_id,
        w.full_name,
        w.specialty,
        w.current_workload,
        w.max_workload,
        w.performance_rating,
        ROUND((w.current_workload::DECIMAL / w.max_workload) * 100, 1) as workload_percentage
    FROM public.workers w
    JOIN public.worker_specialties ws ON ws.name = w.specialty
    WHERE w.is_available = true
    AND w.current_workload < w.max_workload
    AND report_category = ANY(ws.category_mapping)
    ORDER BY w.performance_rating DESC, w.current_workload ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to auto-assign worker to report
CREATE OR REPLACE FUNCTION public.auto_assign_worker(report_id UUID)
RETURNS UUID AS $$
DECLARE
    report_category TEXT;
    best_worker_id UUID;
BEGIN
    -- Get report category
    SELECT category INTO report_category
    FROM public.reports
    WHERE id = report_id;
    
    -- Find best available worker
    SELECT worker_id INTO best_worker_id
    FROM public.get_available_workers_for_category(report_category)
    LIMIT 1;
    
    -- Assign worker if found
    IF best_worker_id IS NOT NULL THEN
        UPDATE public.reports
        SET assigned_worker_id = best_worker_id,
            status = 'acknowledged'
        WHERE id = report_id;
    END IF;
    
    RETURN best_worker_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing workers with default values
UPDATE public.workers 
SET 
    current_workload = COALESCE(current_workload, 0),
    max_workload = COALESCE(max_workload, 10),
    performance_rating = COALESCE(performance_rating, 5.0),
    total_completed = COALESCE(total_completed, 0),
    avg_completion_time = COALESCE(avg_completion_time, 0);

-- Initialize current workload based on existing assignments
UPDATE public.workers 
SET current_workload = (
    SELECT COUNT(*)
    FROM public.reports r
    WHERE r.assigned_worker_id = workers.id
    AND r.status NOT IN ('resolved', 'closed')
);

-- Initialize total completed based on existing data
UPDATE public.workers 
SET total_completed = (
    SELECT COUNT(*)
    FROM public.reports r
    WHERE r.assigned_worker_id = workers.id
    AND r.status IN ('resolved', 'closed')
);

-- Calculate initial performance ratings
SELECT public.update_all_worker_performance();

-- Add comments for documentation
COMMENT ON TABLE public.worker_specialties IS 'Lookup table for worker specialties and their category mappings';
COMMENT ON TABLE public.worker_schedules IS 'Worker availability schedules by day of week';
COMMENT ON VIEW public.worker_performance_metrics IS 'Comprehensive view of worker performance and workload metrics';
COMMENT ON FUNCTION public.get_available_workers_for_category(TEXT) IS 'Returns available workers suitable for a specific report category';
COMMENT ON FUNCTION public.auto_assign_worker(UUID) IS 'Automatically assigns the best available worker to a report';
COMMENT ON FUNCTION public.calculate_worker_performance(UUID) IS 'Calculates performance rating for a worker based on completion rate and time';
COMMENT ON FUNCTION public.update_all_worker_performance() IS 'Updates performance ratings for all workers';