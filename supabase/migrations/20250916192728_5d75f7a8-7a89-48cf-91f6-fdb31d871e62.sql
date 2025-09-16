-- Test creating a worker profile for existing user to test cross-functionality
INSERT INTO workers (user_id, full_name, email, phone, specialty, council_id, is_available)
VALUES (
  'f3816aa3-85f5-4386-8990-c3ce0ec112ad',
  'Test Worker',
  's24cseu1704@bennett.edu.in',
  '+91-9876543210',
  'General Maintenance',
  '00000000-0000-0000-0000-000000000001',
  true
)
ON CONFLICT (user_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  specialty = EXCLUDED.specialty,
  is_available = EXCLUDED.is_available;