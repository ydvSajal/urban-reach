-- Update the reports bucket to be public
-- This allows authenticated users with proper report access to view images
UPDATE storage.buckets 
SET public = true 
WHERE id = 'reports';