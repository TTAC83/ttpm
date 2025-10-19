-- Add photos_url column to lines table
ALTER TABLE public.lines
ADD COLUMN photos_url text;

-- Add photos_url column to solutions_lines table
ALTER TABLE public.solutions_lines
ADD COLUMN photos_url text;