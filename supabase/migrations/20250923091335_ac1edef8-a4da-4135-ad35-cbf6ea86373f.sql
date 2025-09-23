-- Fix v_master_steps view to alias name as step_name for application compatibility
DROP VIEW IF EXISTS public.v_master_steps;

CREATE VIEW public.v_master_steps AS 
SELECT ms.id,
    ms.name AS step_name,  -- Alias name as step_name for app compatibility
    ms.position,
    COUNT(mt.id) AS task_count
FROM master_steps ms
LEFT JOIN master_tasks mt ON mt.step_id = ms.id
GROUP BY ms.id, ms.name, ms.position;