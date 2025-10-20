import { useState, useCallback, useEffect } from "react";
import { cameraService } from "@/lib/cameraService";
import { cameraFullSchema, type CameraFull } from "@/schemas/cameraSchema";
import { useToast } from "@/hooks/use-toast";

export const useCameraForm = (cameraId?: string, equipmentId?: string) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<CameraFull>({
    camera: {
      equipment_id: equipmentId || "",
      mac_address: "",
      camera_type: "",
      lens_type: "",
      light_required: false,
      light_id: null,
    },
    measurements: null,
    plc_outputs: [],
    attributes: [],
    use_cases: [],
    views: [],
  });

  // Load camera data
  useEffect(() => {
    if (cameraId) {
      loadCamera();
    }
  }, [cameraId]);

  const loadCamera = async () => {
    if (!cameraId) return;
    
    setIsLoading(true);
    try {
      const data = await cameraService.getCameraFull(cameraId);
      setFormData(data);
    } catch (error) {
      console.error("Error loading camera:", error);
      toast({
        title: "Error",
        description: "Failed to load camera data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateCamera = useCallback((updates: Partial<CameraFull["camera"]>) => {
    setFormData((prev) => ({
      ...prev,
      camera: { ...prev.camera, ...updates },
    }));
  }, []);

  const updateMeasurements = useCallback((updates: Partial<CameraFull["measurements"]>) => {
    setFormData((prev) => ({
      ...prev,
      measurements: { ...prev.measurements, ...updates },
    }));
  }, []);

  const updatePlcOutputs = useCallback((outputs: CameraFull["plc_outputs"]) => {
    setFormData((prev) => ({
      ...prev,
      plc_outputs: outputs,
    }));
  }, []);

  const updateAttributes = useCallback((attributes: CameraFull["attributes"]) => {
    setFormData((prev) => ({
      ...prev,
      attributes: attributes,
    }));
  }, []);

  const updateUseCases = useCallback((useCases: CameraFull["use_cases"]) => {
    setFormData((prev) => ({
      ...prev,
      use_cases: useCases,
    }));
  }, []);

  const updateViews = useCallback((views: CameraFull["views"]) => {
    setFormData((prev) => ({
      ...prev,
      views: views,
    }));
  }, []);

  const saveCamera = async (): Promise<boolean> => {
    setIsSaving(true);
    try {
      // Validate
      const validated = cameraFullSchema.parse(formData);
      
      // Save
      const result = await cameraService.saveCameraFull(validated);
      
      // Update form with returned data (includes IDs for new records)
      setFormData(result);
      
      toast({
        title: "Success",
        description: "Camera saved successfully",
      });
      
      return true;
    } catch (error: any) {
      console.error("Error saving camera:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save camera",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    formData,
    isLoading,
    isSaving,
    updateCamera,
    updateMeasurements,
    updatePlcOutputs,
    updateAttributes,
    updateUseCases,
    updateViews,
    saveCamera,
  };
};
