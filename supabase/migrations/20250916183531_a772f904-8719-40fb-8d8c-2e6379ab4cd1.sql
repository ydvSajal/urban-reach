-- Fix data integrity issues
-- 1. Ensure all users have proper council associations
UPDATE profiles 
SET council_id = '00000000-0000-0000-0000-000000000001' 
WHERE council_id IS NULL;

-- 2. Create some sample workers with proper council association
INSERT INTO workers (user_id, council_id, full_name, email, specialty, is_available)
VALUES 
  ('822a5a83-65cd-428c-ab3f-364cc0a4d111', '00000000-0000-0000-0000-000000000001', 'Worker One', 'worker1@bennett.edu.in', 'Roads & Infrastructure', true),
  ('3915e7f6-b24b-45d4-a25a-819835e73206', '00000000-0000-0000-0000-000000000001', 'Worker Two', 'worker2@bennett.edu.in', 'Water & Sanitation', true)
ON CONFLICT (user_id) DO UPDATE SET
  council_id = EXCLUDED.council_id,
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  specialty = EXCLUDED.specialty;

-- 3. Ensure Bennett University council exists
INSERT INTO councils (id, name, city, state, contact_email, contact_phone)
VALUES ('00000000-0000-0000-0000-000000000001', 'Bennett University', 'Greater Noida', 'Uttar Pradesh', 'admin@bennett.edu.in', '+91-120-123-4567')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  contact_email = EXCLUDED.contact_email,
  contact_phone = EXCLUDED.contact_phone;