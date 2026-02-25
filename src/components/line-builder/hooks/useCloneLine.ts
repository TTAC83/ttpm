import { useState } from "react";
import { useLineData } from "./useLineData";
import { WizardConfig } from "../types/lineWizard";
import { useToast } from "@/hooks/use-toast";

export function useCloneLine(config: WizardConfig) {
  const [isCloning, setIsCloning] = useState(false);
  const { loadData, saveData } = useLineData(config);
  const { toast } = useToast();

  const cloneLine = async (sourceLineId: string, projectId: string, newName?: string) => {
    setIsCloning(true);
    try {
      const data = await loadData(sourceLineId);
      if (!data) throw new Error("Failed to load source line data");

      const clonedLineData = {
        ...data.lineData,
        name: newName || `${data.lineData.name} (Copy)`,
      };

      // Deep clone positions with new IDs
      const clonedPositions = data.positions.map((pos) => ({
        ...pos,
        id: `position-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        titles: pos.titles.map((t) => ({
          ...t,
          id: Math.random().toString(36).substring(7),
        })),
        equipment: pos.equipment.map((eq) => ({
          ...eq,
          id: `equipment-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          cameras: eq.cameras.map((cam) => ({
            ...cam,
            id: Math.random().toString(36).substring(7),
            attributes: (cam.attributes || []).map((attr) => ({
              ...attr,
              id: Math.random().toString(36).substring(7),
            })),
            relay_outputs: (cam.relay_outputs || []).map((ro) => ({
              ...ro,
              id: Math.random().toString(36).substring(7),
            })),
          })),
          iot_devices: eq.iot_devices.map((iot) => ({
            ...iot,
            id: Math.random().toString(36).substring(7),
          })),
        })),
      }));

      await saveData(clonedLineData, clonedPositions, projectId);

      toast({
        title: "Line Cloned",
        description: `"${clonedLineData.name}" created successfully`,
      });

      return true;
    } catch (error) {
      console.error("Error cloning line:", error);
      toast({
        title: "Clone Failed",
        description: error instanceof Error ? error.message : "Failed to clone line",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsCloning(false);
    }
  };

  return { cloneLine, isCloning };
}
