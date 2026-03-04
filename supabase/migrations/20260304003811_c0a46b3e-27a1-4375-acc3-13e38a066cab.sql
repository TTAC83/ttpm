
-- Update BOTH Flow Wrap 1 and Flow Wrap 2 cameras with full settings from wizard state

-- Flow Wrap 1 (9bff730d-9fa0-4734-a1aa-93800c8befb6) - persist wizard data
UPDATE cameras SET
  camera_type = 'a5b4c20e-1374-49ff-8bdd-5cd2cfb8d372',
  light_required = true,
  light_notes = 'CIL Bar light required',
  plc_attached = true,
  plc_master_id = 'a68187af-00d7-4c37-bf8d-46b630fac79f',
  hmi_required = false,
  hmi_master_id = NULL,
  hmi_notes = NULL,
  updated_at = now()
WHERE id = '9bff730d-9fa0-4734-a1aa-93800c8befb6';

-- Flow Wrap 1 measurements
INSERT INTO camera_measurements (camera_id, horizontal_fov, working_distance, smallest_text)
VALUES ('9bff730d-9fa0-4734-a1aa-93800c8befb6', 'TBC', 'TBC', '2')
ON CONFLICT (camera_id) DO UPDATE SET
  horizontal_fov = EXCLUDED.horizontal_fov,
  working_distance = EXCLUDED.working_distance,
  smallest_text = EXCLUDED.smallest_text,
  updated_at = now();

-- Flow Wrap 1 PLC relay outputs
DELETE FROM camera_plc_outputs WHERE camera_id = '9bff730d-9fa0-4734-a1aa-93800c8befb6';
INSERT INTO camera_plc_outputs (camera_id, output_number, type, custom_name, notes) VALUES
('9bff730d-9fa0-4734-a1aa-93800c8befb6', 1, 'Belt Stop', 'Flow wrap stop signal', ''),
('9bff730d-9fa0-4734-a1aa-93800c8befb6', 2, 'Sounder/Beacon', 'Beacon', '');

-- Flow Wrap 1 use cases
DELETE FROM camera_use_cases WHERE camera_id = '9bff730d-9fa0-4734-a1aa-93800c8befb6';
INSERT INTO camera_use_cases (camera_id, vision_use_case_id) VALUES
('9bff730d-9fa0-4734-a1aa-93800c8befb6', '788bd577-cce2-40f4-8ae4-4f3d0da4c8d2'),
('9bff730d-9fa0-4734-a1aa-93800c8befb6', '004b49cc-f00e-4cbd-866e-10317c81e1e4'),
('9bff730d-9fa0-4734-a1aa-93800c8befb6', 'c18b865f-70aa-48c4-90e1-0bdd838dbb37');

-- Flow Wrap 1 attributes
DELETE FROM camera_attributes WHERE camera_id = '9bff730d-9fa0-4734-a1aa-93800c8befb6';
INSERT INTO camera_attributes (camera_id, title, description, order_index) VALUES
('9bff730d-9fa0-4734-a1aa-93800c8befb6', 'Date Validation', 'Validation of Date against job import data', 0),
('9bff730d-9fa0-4734-a1aa-93800c8befb6', 'Product Name', 'Validation of correct packaging', 1),
('9bff730d-9fa0-4734-a1aa-93800c8befb6', 'Barcode', 'Verification of barcode', 2),
('9bff730d-9fa0-4734-a1aa-93800c8befb6', 'Allergens', 'Compare allergens detailed on ingredients panel against product allergen masterdata', 3);

-- Flow Wrap 1 camera view
DELETE FROM camera_views WHERE camera_id = '9bff730d-9fa0-4734-a1aa-93800c8befb6';
INSERT INTO camera_views (camera_id, product_flow, description) VALUES
('9bff730d-9fa0-4734-a1aa-93800c8befb6', 'Film travelling vertically downwards, correct orientation.', 'Camera facing film unwind');
