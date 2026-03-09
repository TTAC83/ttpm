
-- 1. Create line_media table
CREATE TABLE public.line_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id uuid REFERENCES public.lines(id) ON DELETE CASCADE,
  solutions_line_id uuid REFERENCES public.solutions_lines(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint,
  description text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);

-- CHECK: exactly one FK must be set
ALTER TABLE public.line_media ADD CONSTRAINT line_media_one_fk
  CHECK (
    (line_id IS NOT NULL AND solutions_line_id IS NULL)
    OR (line_id IS NULL AND solutions_line_id IS NOT NULL)
  );

-- Enable RLS
ALTER TABLE public.line_media ENABLE ROW LEVEL SECURITY;

-- SELECT policy: internal users or company members
CREATE POLICY "Authenticated users can view line media"
  ON public.line_media FOR SELECT TO authenticated
  USING (
    is_internal()
    OR EXISTS (
      SELECT 1 FROM lines l JOIN projects pr ON pr.id = l.project_id
      WHERE l.id = line_media.line_id AND pr.company_id = user_company_id()
    )
    OR EXISTS (
      SELECT 1 FROM solutions_lines sl JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE sl.id = line_media.solutions_line_id AND sp.company_id = user_company_id()
    )
  );

-- INSERT policy
CREATE POLICY "Authenticated users can insert line media"
  ON public.line_media FOR INSERT TO authenticated
  WITH CHECK (
    is_internal()
    OR EXISTS (
      SELECT 1 FROM lines l JOIN projects pr ON pr.id = l.project_id
      WHERE l.id = line_media.line_id AND pr.company_id = user_company_id()
    )
    OR EXISTS (
      SELECT 1 FROM solutions_lines sl JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE sl.id = line_media.solutions_line_id AND sp.company_id = user_company_id()
    )
  );

-- UPDATE policy (for description edits)
CREATE POLICY "Authenticated users can update line media"
  ON public.line_media FOR UPDATE TO authenticated
  USING (
    is_internal()
    OR EXISTS (
      SELECT 1 FROM lines l JOIN projects pr ON pr.id = l.project_id
      WHERE l.id = line_media.line_id AND pr.company_id = user_company_id()
    )
    OR EXISTS (
      SELECT 1 FROM solutions_lines sl JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE sl.id = line_media.solutions_line_id AND sp.company_id = user_company_id()
    )
  );

-- DELETE policy
CREATE POLICY "Authenticated users can delete line media"
  ON public.line_media FOR DELETE TO authenticated
  USING (
    is_internal()
    OR EXISTS (
      SELECT 1 FROM lines l JOIN projects pr ON pr.id = l.project_id
      WHERE l.id = line_media.line_id AND pr.company_id = user_company_id()
    )
    OR EXISTS (
      SELECT 1 FROM solutions_lines sl JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE sl.id = line_media.solutions_line_id AND sp.company_id = user_company_id()
    )
  );

-- 2. Create private storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('line-media', 'line-media', false);

-- Storage RLS: authenticated upload
CREATE POLICY "Authenticated users can upload line media files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'line-media');

-- Storage RLS: authenticated read
CREATE POLICY "Authenticated users can read line media files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'line-media');

-- Storage RLS: authenticated delete
CREATE POLICY "Authenticated users can delete line media files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'line-media');
