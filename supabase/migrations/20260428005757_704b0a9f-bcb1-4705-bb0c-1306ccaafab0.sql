-- 1. Add created_by to gospa_questions for ownership
ALTER TABLE public.gospa_questions
  ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();

-- Tighten update/delete on gospa_questions: only creator (or legacy NULL) can edit/delete
DROP POLICY IF EXISTS gospa_questions_update ON public.gospa_questions;
DROP POLICY IF EXISTS gospa_questions_delete ON public.gospa_questions;

CREATE POLICY gospa_questions_update
ON public.gospa_questions
FOR UPDATE
USING (gospa_can_read() AND (created_by IS NULL OR created_by = auth.uid()))
WITH CHECK (gospa_can_read() AND (created_by IS NULL OR created_by = auth.uid()));

CREATE POLICY gospa_questions_delete
ON public.gospa_questions
FOR DELETE
USING (gospa_can_read() AND (created_by IS NULL OR created_by = auth.uid()));

-- 2. New per-entry table
CREATE TABLE IF NOT EXISTS public.gospa_question_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.gospa_questions(id) ON DELETE CASCADE,
  entry_type text NOT NULL CHECK (entry_type IN ('summary','risk','opportunity','link')),
  content text NOT NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gospa_question_entries_question_idx
  ON public.gospa_question_entries(question_id, entry_type);

ALTER TABLE public.gospa_question_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY gospa_question_entries_select
ON public.gospa_question_entries
FOR SELECT
USING (gospa_can_read());

CREATE POLICY gospa_question_entries_insert
ON public.gospa_question_entries
FOR INSERT
WITH CHECK (gospa_can_read() AND created_by = auth.uid());

CREATE POLICY gospa_question_entries_update
ON public.gospa_question_entries
FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY gospa_question_entries_delete
ON public.gospa_question_entries
FOR DELETE
USING (created_by = auth.uid());

-- updated_at trigger
DROP TRIGGER IF EXISTS gospa_question_entries_set_updated_at ON public.gospa_question_entries;
CREATE TRIGGER gospa_question_entries_set_updated_at
BEFORE UPDATE ON public.gospa_question_entries
FOR EACH ROW
EXECUTE FUNCTION public.set_timestamp_updated_at();