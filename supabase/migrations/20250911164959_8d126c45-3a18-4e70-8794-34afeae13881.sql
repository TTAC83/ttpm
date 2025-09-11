-- Update the existing critical action to actually be marked as critical
UPDATE public.actions 
SET is_critical = true 
WHERE title = 'critical action' AND is_critical = false;