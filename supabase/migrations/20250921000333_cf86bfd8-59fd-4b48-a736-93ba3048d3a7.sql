-- Add line description and product description to solutions_lines table
ALTER TABLE public.solutions_lines 
ADD COLUMN line_description text,
ADD COLUMN product_description text;