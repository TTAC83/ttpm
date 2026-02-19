
ALTER TABLE public.solutions_projects
  ADD COLUMN IF NOT EXISTS infra_internet_speed_mbps integer,
  ADD COLUMN IF NOT EXISTS infra_lan_speed_gbps integer,
  ADD COLUMN IF NOT EXISTS infra_switch_uplink_gbps integer,
  ADD COLUMN IF NOT EXISTS infra_cable_spec text,
  ADD COLUMN IF NOT EXISTS infra_max_cable_distance_m integer,
  ADD COLUMN IF NOT EXISTS infra_poe_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS infra_dhcp_reservation boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS infra_remote_access_method text,
  ADD COLUMN IF NOT EXISTS infra_server_mounting text,
  ADD COLUMN IF NOT EXISTS infra_server_power_supply text,
  ADD COLUMN IF NOT EXISTS infra_notes text;
