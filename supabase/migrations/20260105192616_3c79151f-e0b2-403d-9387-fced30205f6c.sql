-- Fix the security definer view issue by setting security_invoker to true
ALTER VIEW v_contacts_enriched SET (security_invoker = true);