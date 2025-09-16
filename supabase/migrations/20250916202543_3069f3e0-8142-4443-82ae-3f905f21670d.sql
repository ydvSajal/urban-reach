-- Fix function search path security issue
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;