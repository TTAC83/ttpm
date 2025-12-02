-- Add RRP (GBP) column to hardware_master table
ALTER TABLE hardware_master
ADD COLUMN rrp_gbp NUMERIC;