-- First, clear project tasks that reference master tasks to avoid foreign key constraint issues
DELETE FROM public.project_tasks;

-- Clear existing master data
DELETE FROM public.master_tasks;
DELETE FROM public.master_steps;

-- Insert master steps
INSERT INTO public.master_steps (id, name, position) VALUES
(1, 'Project Initialisation', 1),
(2, 'Discovery & Launch', 2),
(3, 'Portal Configuration', 3),
(4, 'Hardware Configuration', 4),
(5, 'Customer Prep', 5),
(6, 'Super User Training', 6),
(7, 'Job Scheduling', 7),
(8, 'On Site Installation', 8),
(9, 'Validation', 9),
(10, 'Adoption & Handover', 10);

-- Insert master tasks
INSERT INTO public.master_tasks (id, step_id, title, planned_start_offset_days, planned_end_offset_days, position) VALUES
-- Project Initialisation
(1, 1, 'Sales Handover', 0, 0, 1),
(2, 1, 'Meeting the customer', 17, 17, 2),
(3, 1, 'Portal Configuration', 18, 21, 3),

-- Discovery & Launch
(4, 2, 'Discovery Day & all relevant activities on WBS', 35, 28, 1),

-- Portal Configuration
(5, 3, 'Portal Configuration (Remaining)', 36, 32, 1),
(6, 3, 'Portal Reporting', 29, 35, 2),
(7, 3, 'Vision Specific Requirements', 42, 41, 3),

-- Hardware Configuration
(8, 4, 'Hardware Ordering', 0, 41, 1),
(9, 4, 'Hardware Configuration at Quattro', 36, 43, 2),
(10, 4, 'Hardware delivery to customer', 41, 43, 3),

-- Customer Prep
(11, 5, 'Customer Network Configuration', 36, 44, 1),
(12, 5, 'Machine Signal Prep', 36, 47, 2),
(13, 5, 'Customer Product Information', 36, 57, 3),
(14, 5, 'Notifications', 36, 57, 4),
(15, 5, 'Hardware installed', 45, 73, 5),
(16, 5, 'Confirmation by customer all hardware is installed', 73, 74, 6),

-- Super User Training
(17, 6, 'Portal Training', 17, 77, 1),

-- Job Scheduling
(18, 7, 'ERP Setup', 36, 81, 1),

-- On Site Installation
(19, 8, 'Arrange Site Visit', 74, 83, 1),
(20, 8, 'IoT Device Install', 82, 83, 2),
(21, 8, 'Vision Camera Install', 82, 83, 3),
(22, 8, 'Other Install', 82, 96, 4),

-- Validation
(23, 9, 'Vision Model Training', 83, 104, 1),
(24, 9, 'Arange Vision Validation Site Visit', 104, 111, 2),
(25, 9, 'Camera model validation', 112, 113, 3),
(26, 9, 'Notification validation', 112, 114, 4),

-- Adoption & Handover
(27, 10, 'Arrange Site Visit', 114, 121, 1),
(28, 10, 'Guided Session 1', 122, 123, 2),
(29, 10, 'Guided Session 2 - Operational Training', 122, 123, 3),
(30, 10, 'Project charter for customer engagement', 122, 123, 4),
(31, 10, 'Performance Training Modules', 122, 123, 5);

-- Reset sequences to continue from the highest ID
SELECT setval('master_steps_id_seq', (SELECT MAX(id) FROM master_steps));
SELECT setval('master_tasks_id_seq', (SELECT MAX(id) FROM master_tasks));