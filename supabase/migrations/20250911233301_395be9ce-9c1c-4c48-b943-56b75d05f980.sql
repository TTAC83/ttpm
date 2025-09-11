-- Add factory details columns to solutions_projects table
ALTER TABLE public.solutions_projects 
ADD COLUMN servers_required integer DEFAULT 0,
ADD COLUMN gateways_required integer DEFAULT 0,
ADD COLUMN tv_display_devices_required integer DEFAULT 0,
ADD COLUMN receivers_required integer DEFAULT 0,
ADD COLUMN lines_required integer DEFAULT 0;