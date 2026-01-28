export interface Position {
  id: string;
  name: string;
  position_x: number;
  position_y: number;
  titles: Array<{ id: string; title: "RLE" | "OP" }>;
  equipment: Equipment[];
}

export interface Equipment {
  id: string;
  name: string;
  equipment_type?: string;
  cameras: Camera[];
  iot_devices: IoTDevice[];
}

export interface Camera {
  id: string;
  name: string;
  camera_ip?: string;
  camera_type: string;
  lens_type: string;
  light_required?: boolean;
  light_id?: string;
  light_notes?: string;
  plc_attached?: boolean;
  plc_master_id?: string;
  relay_outputs?: RelayOutput[];
  hmi_required?: boolean;
  hmi_master_id?: string;
  hmi_notes?: string;
  horizontal_fov?: string;
  working_distance?: string;
  smallest_text?: string;
  use_case_ids?: string[];
  use_case_description?: string;
  attributes?: CameraAttribute[];
  product_flow?: string;
  camera_view_description?: string;
}

export interface RelayOutput {
  id: string;
  output_number: number;
  type: string;
  custom_name: string;
  notes: string;
}

export interface CameraAttribute {
  id: string;
  title: string;
  description: string;
}

export interface IoTDevice {
  id: string;
  name: string;
  hardware_master_id: string;
  receiver_mac_address?: string;
}

export interface LineData {
  name: string;
  min_speed: number;
  max_speed: number;
  line_description: string;
  product_description: string;
  photos_url: string;
}

export interface WizardConfig {
  tableName: 'lines' | 'solutions_lines';
  positionsTable: string;
  equipmentTable: string;
  camerasTable: string;
  iotDevicesTable: string;
  projectIdField: string;
}
