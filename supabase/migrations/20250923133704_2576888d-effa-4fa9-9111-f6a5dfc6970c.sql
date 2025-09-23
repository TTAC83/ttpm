-- Add new team assignment columns to projects table
ALTER TABLE projects 
ADD COLUMN sales_lead uuid REFERENCES auth.users(id),
ADD COLUMN solution_consultant uuid REFERENCES auth.users(id),
ADD COLUMN account_manager uuid REFERENCES auth.users(id);