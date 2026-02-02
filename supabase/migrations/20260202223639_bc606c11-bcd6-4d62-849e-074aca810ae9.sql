UPDATE project_tasks 
SET status = 'Done', 
    actual_end = CURRENT_DATE 
WHERE project_id IN (
  '54d9f3ee-1b54-40a4-aefb-46cfc88d5e5b',
  'd109e13f-d960-4eba-93d8-67ae9eb0b0a8',
  '07a5ad26-3a03-4501-ab4f-84ac275a17a9',
  '99a7e1ad-5ae3-48d1-88c2-bdf70c04993e',
  'fd8fac99-5edf-4914-af6e-6d61543d7f05',
  'db9cb1e4-acf1-47a0-8190-a66d51bc2d6b',
  '7afba47c-094c-4772-a51d-3d6b15aacbb5',
  'c43d6746-7cd1-4472-8da7-401774b65ef6'
)