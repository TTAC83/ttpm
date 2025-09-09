-- Insert sample companies
INSERT INTO companies (name, is_internal) VALUES 
('Thingtrax Ltd', true),
('Customer Corp', false),
('Tech Solutions Inc', false)
ON CONFLICT DO NOTHING;

-- Insert sample master steps and tasks
INSERT INTO master_steps (name, position) VALUES 
('Planning', 1),
('Design', 2),
('Implementation', 3),
('Testing', 4),
('Deployment', 5)
ON CONFLICT DO NOTHING;

INSERT INTO master_tasks (step_id, title, details, planned_start_offset_days, planned_end_offset_days, position) VALUES 
(1, 'Project Kickoff', 'Initial project setup and stakeholder alignment', 0, 3, 1),
(1, 'Requirements Gathering', 'Collect detailed project requirements', 4, 8, 2),
(2, 'System Design', 'Create technical architecture and design', 9, 15, 1),
(2, 'Infrastructure Planning', 'Plan server and network infrastructure', 16, 20, 2),
(3, 'Hardware Installation', 'Install cameras and IoT devices', 21, 30, 1),
(3, 'Software Configuration', 'Configure monitoring software', 31, 35, 2),
(4, 'System Testing', 'Test all components and integrations', 36, 42, 1),
(4, 'User Acceptance Testing', 'Customer testing and sign-off', 43, 47, 2),
(5, 'Go-Live', 'System deployment and go-live', 48, 50, 1),
(5, 'Handover', 'Training and project handover', 51, 55, 2)
ON CONFLICT DO NOTHING;