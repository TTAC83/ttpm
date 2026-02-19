
-- Add SOW performance envelope and contract fields to solutions_projects
ALTER TABLE public.solutions_projects
  ADD COLUMN IF NOT EXISTS sow_sku_count integer,
  ADD COLUMN IF NOT EXISTS sow_complexity_tier text CHECK (sow_complexity_tier IN ('Green', 'Amber', 'Red')),
  ADD COLUMN IF NOT EXISTS sow_detection_accuracy_target numeric,
  ADD COLUMN IF NOT EXISTS sow_false_positive_rate numeric,
  ADD COLUMN IF NOT EXISTS sow_go_live_definition text,
  ADD COLUMN IF NOT EXISTS sow_acceptance_criteria text,
  ADD COLUMN IF NOT EXISTS sow_stability_period text,
  ADD COLUMN IF NOT EXISTS sow_hypercare_window text,
  ADD COLUMN IF NOT EXISTS sow_product_presentation_assumptions text,
  ADD COLUMN IF NOT EXISTS sow_environmental_stability_assumptions text,
  -- Infrastructure requirements (Required / Not Required)
  ADD COLUMN IF NOT EXISTS infra_network_ports text CHECK (infra_network_ports IN ('Required', 'Not Required')),
  ADD COLUMN IF NOT EXISTS infra_vlan text CHECK (infra_vlan IN ('Required', 'Not Required')),
  ADD COLUMN IF NOT EXISTS infra_static_ip text CHECK (infra_static_ip IN ('Required', 'Not Required')),
  ADD COLUMN IF NOT EXISTS infra_10gb_connection text CHECK (infra_10gb_connection IN ('Required', 'Not Required')),
  ADD COLUMN IF NOT EXISTS infra_mount_fabrication text CHECK (infra_mount_fabrication IN ('Required', 'Not Required')),
  ADD COLUMN IF NOT EXISTS infra_vpn text CHECK (infra_vpn IN ('Required', 'Not Required')),
  ADD COLUMN IF NOT EXISTS infra_storage text CHECK (infra_storage IN ('Required', 'Not Required')),
  ADD COLUMN IF NOT EXISTS infra_load_balancer text CHECK (infra_load_balancer IN ('Required', 'Not Required')),
  -- Model training scope (Vision)
  ADD COLUMN IF NOT EXISTS sow_initial_training_cycle text,
  ADD COLUMN IF NOT EXISTS sow_validation_period text,
  ADD COLUMN IF NOT EXISTS sow_retraining_exclusions text;
