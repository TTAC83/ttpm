
-- Auto-set owner = auth.uid() on insert for all gospa_* tables with an owner column
CREATE OR REPLACE FUNCTION public.gospa_set_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner IS NULL THEN
    NEW.owner := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['gospa_goals','gospa_objectives','gospa_questions','gospa_strategies','gospa_plans','gospa_metrics','gospa_blockers']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_owner_trg ON public.%I;', t);
    EXECUTE format('CREATE TRIGGER set_owner_trg BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.gospa_set_owner();', t);
    EXECUTE format('UPDATE public.%I SET owner = COALESCE(owner, (SELECT user_id FROM public.profiles WHERE is_internal = true ORDER BY created_at LIMIT 1)) WHERE owner IS NULL;', t);
  END LOOP;
END $$;
