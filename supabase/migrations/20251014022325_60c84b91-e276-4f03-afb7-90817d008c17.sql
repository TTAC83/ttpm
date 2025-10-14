-- Add hardware_master_id column to project_iot_requirements
ALTER TABLE public.project_iot_requirements 
ADD COLUMN hardware_master_id UUID REFERENCES public.hardware_master(id);