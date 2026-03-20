
-- Remove is_variable and fixed_value from product_attributes (product level is just selection)
ALTER TABLE public.product_attributes DROP COLUMN IF EXISTS is_variable;
ALTER TABLE public.product_attributes DROP COLUMN IF EXISTS fixed_value;

-- Add is_variable to product_view_attributes (view level decides set/variable)
ALTER TABLE public.product_view_attributes ADD COLUMN IF NOT EXISTS is_variable boolean NOT NULL DEFAULT true;

-- Make value nullable (variable attrs won't have a value)
ALTER TABLE public.product_view_attributes ALTER COLUMN value DROP NOT NULL;
