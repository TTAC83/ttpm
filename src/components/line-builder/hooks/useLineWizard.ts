import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Position, LineData } from "../types/lineWizard";
import { useLineData } from "./useLineData";
import { WizardConfig } from "../types/lineWizard";

export function useLineWizard(
  config: WizardConfig,
  projectId: string,
  editLineId?: string,
  open?: boolean
) {
  const [currentStep, setCurrentStep] = useState(1);
  const [lineData, setLineData] = useState<LineData>({
    name: "",
    min_speed: 0,
    max_speed: 0,
    line_description: "",
    product_description: "",
    photos_url: "",
    number_of_products: undefined,
    number_of_artworks: undefined,
  });
  const [positions, setPositions] = useState<Position[]>([]);
  const { toast } = useToast();
  const { loadData, saveData, isLoading } = useLineData(config);

  useEffect(() => {
    if (!open) {
      setCurrentStep(1);
      setLineData({
        name: "",
        min_speed: 0,
        max_speed: 0,
        line_description: "",
        product_description: "",
        photos_url: "",
        number_of_products: undefined,
        number_of_artworks: undefined,
      });
      setPositions([]);
    } else if (editLineId) {
      loadLineData();
    }
  }, [open, editLineId]);

  const loadLineData = async () => {
    if (!editLineId) return;

    try {
      const data = await loadData(editLineId);
      if (data) {
        setLineData(data.lineData);
        setPositions(data.positions);
      }
    } catch (error) {
      console.error('Error loading line data:', error);
      toast({
        title: "Error",
        description: "Failed to load line data",
        variant: "destructive",
      });
    }
  };

  const handleComplete = useCallback(async () => {
    try {
      await saveData(lineData, positions, projectId, editLineId);
      
      toast({
        title: "Success",
        description: editLineId ? "Line updated successfully" : "Line created successfully",
      });

      return true;
    } catch (error) {
      console.error('Error saving line:', error);
      toast({
        title: "Error",
        description: "Failed to save line. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [lineData, positions, projectId, editLineId, saveData, toast]);

  const handleNext = useCallback(() => {
    setCurrentStep((prev) => prev + 1);
  }, []);

  const handlePrevious = useCallback(() => {
    setCurrentStep((prev) => prev - 1);
  }, []);

  return {
    currentStep,
    setCurrentStep,
    lineData,
    setLineData,
    positions,
    setPositions,
    handleComplete,
    handleNext,
    handlePrevious,
    isLoading,
  };
}
