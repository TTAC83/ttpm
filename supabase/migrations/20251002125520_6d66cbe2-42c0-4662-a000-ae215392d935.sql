-- Create enum for reference status
CREATE TYPE public.reference_status_enum AS ENUM ('Active', 'Promised', 'Priority', 'N/A');

-- Add reference_status column to projects table
ALTER TABLE public.projects
ADD COLUMN reference_status public.reference_status_enum;