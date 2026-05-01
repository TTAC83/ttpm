ALTER TABLE public.gospa_question_entries
DROP CONSTRAINT IF EXISTS gospa_question_entries_entry_type_check;

ALTER TABLE public.gospa_question_entries
ADD CONSTRAINT gospa_question_entries_entry_type_check
CHECK (entry_type IN ('summary', 'risk', 'opportunity', 'link', 'key_insight'));