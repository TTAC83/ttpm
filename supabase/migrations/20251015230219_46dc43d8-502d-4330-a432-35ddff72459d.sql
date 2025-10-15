-- Drop the existing check constraint on hardware_type
ALTER TABLE project_iot_requirements 
DROP CONSTRAINT IF EXISTS project_iot_requirements_hardware_type_check;

-- Add the updated check constraint with new hardware types
ALTER TABLE project_iot_requirements 
ADD CONSTRAINT project_iot_requirements_hardware_type_check 
CHECK (hardware_type IN ('gateway', 'receiver', 'device', 'server', 'sfp_addon', 'load_balancer', 'storage', 'tv_display'));

-- Add the hardware_master_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_iot_requirements' 
    AND column_name = 'hardware_master_id'
  ) THEN
    ALTER TABLE project_iot_requirements 
    ADD COLUMN hardware_master_id UUID REFERENCES hardware_master(id);
  END IF;
END $$;