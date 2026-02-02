-- Add head_of_support column to projects table
ALTER TABLE public.projects ADD COLUMN head_of_support UUID REFERENCES profiles(user_id);

-- Pre-fill with Omair Anwer's user_id for all existing projects
UPDATE public.projects SET head_of_support = '1348ed43-210f-4d01-b977-27c3b7cee1b9';