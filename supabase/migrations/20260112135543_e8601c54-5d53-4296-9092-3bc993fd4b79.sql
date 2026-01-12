-- Add contract_signed and implementation_handover columns to solutions_projects
ALTER TABLE public.solutions_projects
ADD COLUMN contract_signed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN implementation_handover BOOLEAN NOT NULL DEFAULT false;