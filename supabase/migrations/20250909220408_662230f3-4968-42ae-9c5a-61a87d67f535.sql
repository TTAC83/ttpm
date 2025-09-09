-- First, remove the foreign key constraint temporarily to allow updates
ALTER TABLE public.project_tasks DROP CONSTRAINT IF EXISTS project_tasks_master_task_id_fkey;

-- Clear existing master data
DELETE FROM public.master_tasks;
DELETE FROM public.master_steps;

-- Reset sequences
ALTER SEQUENCE master_steps_id_seq RESTART WITH 1;
ALTER SEQUENCE master_tasks_id_seq RESTART WITH 1;

-- Insert master steps
INSERT INTO public.master_steps (name, position) VALUES
('Project Initialisation', 1),
('Discovery & Launch', 2),
('Portal Configuration', 3),
('Hardware Configuration', 4),
('Customer Prep', 5),
('Super User Training', 6),
('Job Scheduling', 7),
('On Site Installation', 8),
('Validation', 9),
('Adoption & Handover', 10);

-- Insert master tasks
INSERT INTO public.master_tasks (step_id, title, planned_start_offset_days, planned_end_offset_days, position) VALUES
-- Project Initialisation
(1, 'Sales Handover', 0, 0, 1),
(1, 'Meeting the customer', 17, 17, 2),
(1, 'Portal Configuration', 18, 21, 3),

-- Discovery & Launch
(2, 'Discovery Day & all relevant activities on WBS', 35, 28, 1),

-- Portal Configuration
(3, 'Portal Configuration (Remaining)', 36, 32, 1),
(3, 'Portal Reporting', 29, 35, 2),
(3, 'Vision Specific Requirements', 42, 41, 3),

-- Hardware Configuration
(4, 'Hardware Ordering', 0, 41, 1),
(4, 'Hardware Configuration at Quattro', 36, 43, 2),
(4, 'Hardware delivery to customer', 41, 43, 3),

-- Customer Prep
(5, 'Customer Network Configuration', 36, 44, 1),
(5, 'Machine Signal Prep', 36, 47, 2),
(5, 'Customer Product Information', 36, 57, 3),
(5, 'Notifications', 36, 57, 4),
(5, 'Hardware installed', 45, 73, 5),
(5, 'Confirmation by customer all hardware is installed', 73, 74, 6),

-- Super User Training
(6, 'Portal Training', 17, 77, 1),

-- Job Scheduling
(7, 'ERP Setup', 36, 81, 1),

-- On Site Installation
(8, 'Arrange Site Visit', 74, 83, 1),
(8, 'IoT Device Install', 82, 83, 2),
(8, 'Vision Camera Install', 82, 83, 3),
(8, 'Other Install', 82, 96, 4),

-- Validation
(9, 'Vision Model Training', 83, 104, 1),
(9, 'Arange Vision Validation Site Visit', 104, 111, 2),
(9, 'Camera model validation', 112, 113, 3),
(9, 'Notification validation', 112, 114, 4),

-- Adoption & Handover
(10, 'Arrange Site Visit', 114, 121, 1),
(10, 'Guided Session 1', 122, 123, 2),
(10, 'Guided Session 2 - Operational Training', 122, 123, 3),
(10, 'Project charter for customer engagement', 122, 123, 4),
(10, 'Performance Training Modules', 122, 123, 5);

-- Update any existing project_tasks to set master_task_id to null since the old IDs no longer exist
UPDATE public.project_tasks SET master_task_id = NULL WHERE master_task_id IS NOT NULL;

-- Re-add the foreign key constraint
ALTER TABLE public.project_tasks 
ADD CONSTRAINT project_tasks_master_task_id_fkey 
FOREIGN KEY (master_task_id) REFERENCES public.master_tasks(id);