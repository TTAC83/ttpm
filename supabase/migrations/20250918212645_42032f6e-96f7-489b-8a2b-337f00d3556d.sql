-- Add feature_request_id column to product_gaps table to link feature requests to product gaps
ALTER TABLE public.product_gaps 
ADD COLUMN feature_request_id uuid REFERENCES public.feature_requests(id) ON DELETE SET NULL;