-- Fix the remaining function search path issue
CREATE OR REPLACE FUNCTION public.generate_report_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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