-- Add archived_at column to contacts table
ALTER TABLE public.contacts
ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for efficient filtering on archived status
CREATE INDEX idx_contacts_archived_at ON public.contacts (archived_at);

-- Optional: Add archived_by for audit trail
ALTER TABLE public.contacts
ADD COLUMN archived_by UUID DEFAULT NULL REFERENCES auth.users(id);