-- Remove old foreign key constraints on cameras table that reference non-existent tables
ALTER TABLE cameras DROP CONSTRAINT IF EXISTS cameras_light_id_fkey;
ALTER TABLE cameras DROP CONSTRAINT IF EXISTS cameras_plc_master_id_fkey;
ALTER TABLE cameras DROP CONSTRAINT IF EXISTS cameras_hmi_master_id_fkey;

-- Add correct foreign key constraints to hardware_master
ALTER TABLE cameras 
  ADD CONSTRAINT cameras_light_id_fkey 
  FOREIGN KEY (light_id) 
  REFERENCES hardware_master(id) 
  ON DELETE SET NULL;

ALTER TABLE cameras 
  ADD CONSTRAINT cameras_plc_master_id_fkey 
  FOREIGN KEY (plc_master_id) 
  REFERENCES hardware_master(id) 
  ON DELETE SET NULL;

ALTER TABLE cameras 
  ADD CONSTRAINT cameras_hmi_master_id_fkey 
  FOREIGN KEY (hmi_master_id) 
  REFERENCES hardware_master(id) 
  ON DELETE SET NULL;