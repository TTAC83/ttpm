-- Add category field to vision_use_cases_master
ALTER TABLE public.vision_use_cases_master
ADD COLUMN category text;

-- Update existing use cases with appropriate categories
UPDATE public.vision_use_cases_master
SET category = CASE 
  WHEN name = 'Counting' THEN 'Counting'
  WHEN name = 'Object Detection' THEN 'Detection'
  WHEN name = 'Barcode/QR Reading' THEN 'Reading'
  WHEN name = 'OCR (Text Reading)' THEN 'Reading'
  WHEN name = 'Quality Control' THEN 'Inspection'
  WHEN name = 'Packaging Inspection' THEN 'Inspection'
  WHEN name = 'Measurement' THEN 'Measurement'
  WHEN name = 'Color Verification' THEN 'Verification'
  ELSE 'Other'
END;