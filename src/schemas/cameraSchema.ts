import { z } from "zod";

export const cameraBasicsSchema = z.object({
  id: z.string().uuid().optional(),
  equipment_id: z.string().uuid(),
  mac_address: z.string().min(1, "MAC address is required").max(100),
  camera_type: z.string().min(1, "Camera type is required"),
  lens_type: z.string().min(1, "Lens type is required"),
  light_required: z.boolean().default(false),
  light_id: z.string().uuid().nullable().optional(),
});

export const plcOutputSchema = z.object({
  id: z.string().uuid().optional(),
  output_number: z.number().int().min(1).max(16),
  type: z.string().max(50).optional(),
  custom_name: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export const cameraMeasurementsSchema = z.object({
  id: z.string().uuid().optional(),
  working_distance: z.number().positive().optional().nullable(),
  horizontal_fov: z.number().positive().optional().nullable(),
  smallest_text: z.string().max(100).optional().nullable(),
});

export const cameraAttributeSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  order_index: z.number().int().min(0).default(0),
});

export const cameraUseCaseSchema = z.object({
  id: z.string().uuid().optional(),
  vision_use_case_id: z.string().uuid(),
  description: z.string().max(1000).optional(),
});

export const cameraViewSchema = z.object({
  id: z.string().uuid().optional(),
  product_flow: z.string().max(500).optional(),
  description: z.string().max(1000).optional(),
});

export const cameraFullSchema = z.object({
  camera: cameraBasicsSchema,
  measurements: cameraMeasurementsSchema.optional().nullable(),
  plc_outputs: z.array(plcOutputSchema).default([]),
  attributes: z.array(cameraAttributeSchema).default([]),
  use_cases: z.array(cameraUseCaseSchema).default([]),
  views: z.array(cameraViewSchema).default([]),
});

export type CameraBasics = z.infer<typeof cameraBasicsSchema>;
export type PlcOutput = z.infer<typeof plcOutputSchema>;
export type CameraMeasurements = z.infer<typeof cameraMeasurementsSchema>;
export type CameraAttribute = z.infer<typeof cameraAttributeSchema>;
export type CameraUseCase = z.infer<typeof cameraUseCaseSchema>;
export type CameraView = z.infer<typeof cameraViewSchema>;
export type CameraFull = z.infer<typeof cameraFullSchema>;
