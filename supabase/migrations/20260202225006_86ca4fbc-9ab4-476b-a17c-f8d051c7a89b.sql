UPDATE project_tasks 
SET status = 'Done', 
    actual_end = CURRENT_DATE 
WHERE project_id = '2b9e2d75-8a03-4eb6-bbc1-8d9ce63e9380'
  AND status != 'Done'