-- Add line description and product description to lines table
ALTER TABLE public.lines 
ADD COLUMN line_description text,
ADD COLUMN product_description text;