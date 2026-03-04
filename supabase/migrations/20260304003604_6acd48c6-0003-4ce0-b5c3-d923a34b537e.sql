
-- Copy Flow Wrap 1 camera settings to Flow Wrap 2 camera (keeping name/id)
-- Target camera: 0445f6d8-3fbf-4c25-a773-aa41ad26cabb (Flow Wrap 2)

-- 1. Update main camera record
UPDATE cameras SET
  camera_type = 'a5b4c20e-1374-49ff-8bdd-5cd2cfb8d372',
  light_required = true,
  light_notes = 'CIL Bar light required',
  plc_attached = true,
  plc_master_id = 'a68187af-00d7-4c37-bf8d-46b630fac79f',
  hmi_required = false,
  hmi_master_id = NULL,
  hmi_notes = NULL
WHERE id = '0445f6d8-3fbf-4c25-a773-aa41ad26cabb';

-- 2. Upsert measurements
INSERT INTO camera_measurements (camera_id, horizontal_fov, working_distance, smallest_text)
VALUES ('0445f6d8-3fbf-4c25-a773-aa41ad26cabb', 'TBC', 'TBC', '2')
ON CONFLICT (camera_id) DO UPDATE SET
  horizontal_fov = EXCLUDED.horizontal_fov,
  working_distance = EXCLUDED.working_distance,
  smallest_text = EXCLUDED.smallest_text,
  updated_at = now();

-- 3. Insert PLC relay outputs
DELETE FROM camera_plc_outputs WHERE camera_id = '0445f6d8-3fbf-4c25-a773-aa41ad26cabb';
INSERT INTO camera_plc_outputs (camera_id, output_number, type, custom_name, notes) VALUES
('0445f6d8-3fbf-4c25-a773-aa41ad26cabb', 1, 'Belt Stop', 'Flow wrap stop signal', ''),
('0445f6d8-3fbf-4c25-a773-aa41ad26cabb', 2, 'Sounder/Beacon', 'Beacon', '');

-- 4. Insert use cases
DELETE FROM camera_use_cases WHERE camera_id = '0445f6d8-3fbf-4c25-a773-aa41ad26cabb';
INSERT INTO camera_use_cases (camera_id, vision_use_case_id) VALUES
('0445f6d8-3fbf-4c25-a773-aa41ad26cabb', '788bd577-cce2-40f4-8ae4-4f3d0da4c8d2'),
('0445f6d8-3fbf-4c25-a773-aa41ad26cabb', '004b49cc-f00e-4cbd-866e-10317c81e1e4'),
('0445f6d8-3fbf-4c25-a773-aa41ad26cabb', 'c18b865f-70aa-48c4-90e1-0bdd838dbb37');

-- 5. Insert attributes
DELETE FROM camera_attributes WHERE camera_id = '0445f6d8-3fbf-4c25-a773-aa41ad26cabb';
INSERT INTO camera_attributes (camera_id, title, description, order_index) VALUES
('0445f6d8-3fbf-4c25-a773-aa41ad26cabb', 'Date Validation', 'Validation of Date against job import data', 0),
('0445f6d8-3fbf-4c25-a773-aa41ad26cabb', 'Product Name', 'Validation of correct packaging', 1),
('0445f6d8-3fbf-4c25-a773-aa41ad26cabb', 'Barcode', 'Verification of barcode', 2),
('0445f6d8-3fbf-4c25-a773-aa41ad26cabb', 'Allergens', 'Compare allergens detailed on ingredients panel against product allergen masterdata', 3);

-- 6. Insert camera view
DELETE FROM camera_views WHERE camera_id = '0445f6d8-3fbf-4c25-a773-aa41ad26cabb';
INSERT INTO camera_views (camera_id, product_flow, description) VALUES
('0445f6d8-3fbf-4c25-a773-aa41ad26cabb', 'Film travelling vertically downwards, correct orientation.', 'Camera facing film unwind');
