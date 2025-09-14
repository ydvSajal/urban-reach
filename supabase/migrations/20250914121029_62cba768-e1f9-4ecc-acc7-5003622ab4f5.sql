-- Update Bennett University to have a consistent ID for testing
UPDATE public.councils 
SET id = '00000000-0000-0000-0000-000000000001'
WHERE name = 'Bennett University';

-- If no Bennett University exists, insert it with the fixed ID
INSERT INTO public.councils (id, name, city, state, contact_email, contact_phone) 
SELECT '00000000-0000-0000-0000-000000000001', 'Bennett University', 'Greater Noida', 'Uttar Pradesh', 'info@bennett.edu.in', NULL
WHERE NOT EXISTS (SELECT 1 FROM public.councils WHERE name = 'Bennett University');