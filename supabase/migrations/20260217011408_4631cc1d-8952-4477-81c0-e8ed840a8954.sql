
ALTER TABLE public.solutions_projects
  ADD COLUMN feasibility_signed_off boolean NOT NULL DEFAULT false,
  ADD COLUMN feasibility_signed_off_by uuid REFERENCES auth.users(id),
  ADD COLUMN feasibility_signed_off_at timestamptz;
