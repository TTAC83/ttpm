
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_active_at date;

CREATE OR REPLACE FUNCTION public.touch_last_active()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET last_active_at = CURRENT_DATE
  WHERE user_id = auth.uid()
    AND (last_active_at IS NULL OR last_active_at < CURRENT_DATE);
$$;

GRANT EXECUTE ON FUNCTION public.touch_last_active() TO authenticated;
