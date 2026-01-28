export interface CameraFormData {
  name: string;
  camera_ip: string;
  camera_type: string;
  lens_type: string;
  light_required: boolean;
  light_id: string;
  light_notes: string;
  plc_attached: boolean;
  plc_master_id: string;
  relay_outputs: Array<{
    id: string;
    output_number: number;
    type: string;
    custom_name: string;
    notes: string;
  }>;
  hmi_required: boolean;
  hmi_master_id: string;
  hmi_notes: string;
  horizontal_fov: string;
  working_distance: string;
  smallest_text: string;
  use_case_ids: string[];
  use_case_description: string;
  attributes: Array<{
    id: string;
    title: string;
    description: string;
  }>;
  product_flow: string;
  camera_view_description: string;
}

export interface MasterData {
  cameras: Array<{ id: string; manufacturer: string; model_number: string; camera_type?: string }>;
  lenses: Array<{ id: string; manufacturer: string; model_number: string; lens_type?: string; focal_length?: string }>;
  lights: Array<{ id: string; manufacturer: string; model_number: string; description?: string }>;
  plcs: Array<{ id: string; manufacturer: string; model_number: string; plc_type?: string }>;
  hmis: Array<{ id: string; sku_no: string; product_name: string }>;
  visionUseCases: Array<{ id: string; name: string; description?: string; category?: string }>;
}

export const emptyFormData: CameraFormData = {
  name: "",
  camera_ip: "",
  camera_type: "",
  lens_type: "",
  light_required: false,
  light_id: "",
  light_notes: "",
  plc_attached: false,
  plc_master_id: "",
  relay_outputs: [],
  hmi_required: false,
  hmi_master_id: "",
  hmi_notes: "",
  horizontal_fov: "",
  working_distance: "",
  smallest_text: "",
  use_case_ids: [],
  use_case_description: "",
  attributes: [],
  product_flow: "",
  camera_view_description: "",
};
