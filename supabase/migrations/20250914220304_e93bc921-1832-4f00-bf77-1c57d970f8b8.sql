-- Clean up incorrect 1970 placeholder dates from BAU weekly data
DELETE FROM public.bau_weekly_reviews
WHERE date_from = '1970-01-01'::date OR date_to = '1970-01-01'::date;

DELETE FROM public.bau_weekly_metrics
WHERE date_from = '1970-01-01'::date OR date_to = '1970-01-01'::date;