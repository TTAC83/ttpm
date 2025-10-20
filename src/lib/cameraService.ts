import { supabase } from "@/integrations/supabase/client";
import type { CameraFull } from "@/schemas/cameraSchema";

export const cameraService = {
  async getCameraFull(cameraId: string): Promise<CameraFull> {
    const { data, error } = await supabase.rpc("get_camera_full", {
      p_camera_id: cameraId,
    });

    if (error) throw error;
    if (!data) throw new Error("Camera not found");

    return data as CameraFull;
  },

  async saveCameraFull(payload: CameraFull): Promise<CameraFull> {
    const { data, error } = await supabase.rpc("save_camera_full", {
      p_payload: payload as any,
    });

    if (error) throw error;
    if (!data) throw new Error("Failed to save camera");

    return data as CameraFull;
  },
};
