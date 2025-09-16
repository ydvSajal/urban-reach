-- Fix data integrity issues with simpler approach
-- 1. Ensure all users have proper council associations
UPDATE profiles 
SET council_id = '00000000-0000-0000-0000-000000000001' 
WHERE council_id IS NULL;

-- 2. Ensure Bennett University council exists
INSERT INTO councils (id, name, city, state, contact_email, contact_phone)
SELECT '00000000-0000-0000-0000-000000000001', 'Bennett University', 'Greater Noida', 'Uttar Pradesh', 'admin@bennett.edu.in', '+91-120-123-4567'
WHERE NOT EXISTS (SELECT 1 FROM councils WHERE id = '00000000-0000-0000-0000-000000000001');