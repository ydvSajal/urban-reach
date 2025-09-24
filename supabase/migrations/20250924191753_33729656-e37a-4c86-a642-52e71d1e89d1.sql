-- Add audio message field to reports table
ALTER TABLE public.reports 
ADD COLUMN audio_message TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN public.reports.audio_message IS 'URL to the audio message recorded by citizen while submitting the report';