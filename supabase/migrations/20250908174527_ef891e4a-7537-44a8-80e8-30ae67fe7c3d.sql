-- Create user role enum
CREATE TYPE public.user_role AS ENUM ('citizen', 'admin', 'worker');

-- Create priority enum
CREATE TYPE public.priority_level AS ENUM ('low', 'medium', 'high');

-- Create report status enum  
CREATE TYPE public.report_status AS ENUM ('pending', 'acknowledged', 'in_progress', 'resolved', 'closed');

-- Create report category enum
CREATE TYPE public.report_category AS ENUM ('roads', 'sanitation', 'water_supply', 'electricity', 'public_safety', 'parks', 'drainage', 'waste_management', 'street_lights', 'other');

-- Create councils table
CREATE TABLE public.councils (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'citizen',
    council_id UUID REFERENCES public.councils(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Create workers table
CREATE TABLE public.workers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    council_id UUID NOT NULL REFERENCES public.councils(id),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    specialty TEXT,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reports table
CREATE TABLE public.reports (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    report_number TEXT NOT NULL UNIQUE,
    citizen_id UUID NOT NULL REFERENCES auth.users(id),
    council_id UUID NOT NULL REFERENCES public.councils(id),
    assigned_worker_id UUID REFERENCES public.workers(id),
    category report_category NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    location_address TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    status report_status NOT NULL DEFAULT 'pending',
    priority priority_level DEFAULT 'medium',
    images TEXT[], -- Array of image URLs from Supabase Storage
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create report status history table
CREATE TABLE public.report_status_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    old_status report_status,
    new_status report_status NOT NULL,
    changed_by UUID NOT NULL REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.councils ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_status_history ENABLE ROW LEVEL SECURITY;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = user_uuid;
$$;

-- Create function to get user council
CREATE OR REPLACE FUNCTION public.get_user_council(user_uuid UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT council_id FROM public.profiles WHERE user_id = user_uuid;
$$;

-- RLS Policies for councils
CREATE POLICY "Users can view their council" ON public.councils
FOR SELECT USING (id = public.get_user_council(auth.uid()));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for workers
CREATE POLICY "Admins can manage workers in their council" ON public.workers
FOR ALL USING (
  public.get_user_role(auth.uid()) = 'admin' AND 
  council_id = public.get_user_council(auth.uid())
);

CREATE POLICY "Workers can view themselves" ON public.workers
FOR SELECT USING (user_id = auth.uid());

-- RLS Policies for reports
CREATE POLICY "Citizens can view their own reports" ON public.reports
FOR SELECT USING (citizen_id = auth.uid());

CREATE POLICY "Citizens can create reports" ON public.reports
FOR INSERT WITH CHECK (citizen_id = auth.uid());

CREATE POLICY "Admins can manage reports in their council" ON public.reports
FOR ALL USING (
  public.get_user_role(auth.uid()) = 'admin' AND 
  council_id = public.get_user_council(auth.uid())
);

CREATE POLICY "Workers can view assigned reports" ON public.reports
FOR SELECT USING (
  public.get_user_role(auth.uid()) = 'worker' AND 
  assigned_worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid())
);

-- RLS Policies for report status history
CREATE POLICY "Users can view status history for accessible reports" ON public.report_status_history
FOR SELECT USING (
  report_id IN (
    SELECT id FROM public.reports WHERE 
    citizen_id = auth.uid() OR 
    (public.get_user_role(auth.uid()) = 'admin' AND council_id = public.get_user_council(auth.uid())) OR
    (public.get_user_role(auth.uid()) = 'worker' AND assigned_worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid()))
  )
);

CREATE POLICY "Admins and workers can create status history" ON public.report_status_history
FOR INSERT WITH CHECK (
  public.get_user_role(auth.uid()) IN ('admin', 'worker') AND
  changed_by = auth.uid()
);

-- Create function to generate report number
CREATE OR REPLACE FUNCTION public.generate_report_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    report_num TEXT;
    year_part TEXT;
    sequence_part TEXT;
BEGIN
    year_part := EXTRACT(YEAR FROM NOW())::TEXT;
    
    SELECT LPAD(
        (COALESCE(MAX(CAST(SUBSTRING(report_number FROM 6) AS INTEGER)), 0) + 1)::TEXT, 
        6, 
        '0'
    ) INTO sequence_part
    FROM public.reports 
    WHERE report_number LIKE year_part || '%';
    
    report_num := year_part || sequence_part;
    
    RETURN report_num;
END;
$$;

-- Create trigger function to auto-generate report number
CREATE OR REPLACE FUNCTION public.set_report_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.report_number IS NULL OR NEW.report_number = '' THEN
        NEW.report_number := public.generate_report_number();
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger for report number generation
CREATE TRIGGER trigger_set_report_number
    BEFORE INSERT ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION public.set_report_number();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_councils_updated_at
    BEFORE UPDATE ON public.councils
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workers_updated_at
    BEFORE UPDATE ON public.workers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data
INSERT INTO public.councils (name, city, state, contact_email, contact_phone) VALUES
('Mumbai Municipal Corporation', 'Mumbai', 'Maharashtra', 'admin@mumbaimc.gov.in', '+91-22-12345678'),
('Delhi Municipal Corporation', 'Delhi', 'Delhi', 'admin@delhimc.gov.in', '+91-11-12345678');

-- Create storage bucket for report images
INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', false);

-- Create storage policies for report images
CREATE POLICY "Authenticated users can upload report images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'reports');

CREATE POLICY "Users can view report images for accessible reports" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'reports');

CREATE POLICY "Admins can delete report images in their council" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'reports' AND
  public.get_user_role(auth.uid()) = 'admin'
);