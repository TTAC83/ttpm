
ALTER TABLE public.master_attributes ADD COLUMN IF NOT EXISTS is_custom BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.master_attributes DROP CONSTRAINT IF EXISTS master_attributes_data_type_check;
