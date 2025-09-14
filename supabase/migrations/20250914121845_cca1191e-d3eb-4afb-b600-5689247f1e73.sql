-- Update Bennett University users to have admin role and correct council assignment
UPDATE public.profiles 
SET 
  role = 'admin',
  council_id = '00000000-0000-0000-0000-000000000001'
WHERE email LIKE '%@bennett.edu.in';

-- If there are any Bennett users without profiles, create them as admin
INSERT INTO public.profiles (user_id, email, role, council_id, full_name)
SELECT 
  au.id,
  au.email,
  'admin'::user_role,
  '00000000-0000-0000-0000-000000000001',
  COALESCE(au.raw_user_meta_data->>'full_name', '')
FROM auth.users au
WHERE au.email LIKE '%@bennett.edu.in'
AND NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = au.id
);