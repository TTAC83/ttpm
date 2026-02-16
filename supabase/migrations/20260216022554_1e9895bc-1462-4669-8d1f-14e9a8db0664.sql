
ALTER TABLE public.solutions_lines
  ADD COLUMN IF NOT EXISTS number_of_products integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS number_of_artworks integer DEFAULT NULL;
