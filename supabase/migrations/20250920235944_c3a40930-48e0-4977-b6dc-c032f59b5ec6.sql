-- Add line description and product description to projects table
ALTER TABLE public.projects 
ADD COLUMN line_description text,
ADD COLUMN product_description text;