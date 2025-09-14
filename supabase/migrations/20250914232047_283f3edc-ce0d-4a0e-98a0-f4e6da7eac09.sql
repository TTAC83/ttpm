-- Add reason_code column to bau_weekly_reviews table
ALTER TABLE public.bau_weekly_reviews 
ADD COLUMN reason_code text;

-- Update the set_bau_weekly_review function to handle reason_code
CREATE OR REPLACE FUNCTION public.set_bau_weekly_review(
    p_bau_customer_id uuid,
    p_date_from date,
    p_date_to date,
    p_health bau_health_simple,
    p_reason_code text DEFAULT NULL,
    p_escalation text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.bau_weekly_reviews (
        bau_customer_id,
        date_from,
        date_to,
        health,
        reason_code,
        escalation,
        reviewed_by
    )
    VALUES (
        p_bau_customer_id,
        p_date_from,
        p_date_to,
        p_health,
        p_reason_code,
        p_escalation,
        auth.uid()
    )
    ON CONFLICT (bau_customer_id, date_from, date_to)
    DO UPDATE SET
        health = EXCLUDED.health,
        reason_code = EXCLUDED.reason_code,
        escalation = EXCLUDED.escalation,
        reviewed_by = EXCLUDED.reviewed_by,
        reviewed_at = now();
END;
$$;