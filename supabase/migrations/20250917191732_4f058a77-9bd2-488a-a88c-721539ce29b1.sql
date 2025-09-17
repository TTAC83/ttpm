-- Add foreign key constraints for implementation_blockers table
ALTER TABLE public.implementation_blockers 
ADD CONSTRAINT implementation_blockers_owner_fkey 
FOREIGN KEY (owner) REFERENCES auth.users(id);

ALTER TABLE public.implementation_blockers 
ADD CONSTRAINT implementation_blockers_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE public.implementation_blockers 
ADD CONSTRAINT implementation_blockers_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id);