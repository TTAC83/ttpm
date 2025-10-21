import { useState, useCallback } from "react";
import { CameraFormData, emptyFormData } from "./types";

export function useCameraForm(initialData?: CameraFormData) {
  const [formData, setFormData] = useState<CameraFormData>(
    initialData || emptyFormData
  );

  const updateField = useCallback((field: keyof CameraFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const addAttribute = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      attributes: [
        ...prev.attributes,
        { id: Math.random().toString(36).substring(7), title: "", description: "" },
      ],
    }));
  }, []);

  const updateAttribute = useCallback((id: string, field: "title" | "description", value: string) => {
    setFormData(prev => ({
      ...prev,
      attributes: prev.attributes.map((attr) =>
        attr.id === id ? { ...attr, [field]: value } : attr
      ),
    }));
  }, []);

  const deleteAttribute = useCallback((id: string) => {
    setFormData(prev => ({
      ...prev,
      attributes: prev.attributes.filter((attr) => attr.id !== id),
    }));
  }, []);

  const toggleUseCase = useCallback((useCaseId: string) => {
    setFormData(prev => ({
      ...prev,
      use_case_ids: prev.use_case_ids.includes(useCaseId)
        ? prev.use_case_ids.filter((id) => id !== useCaseId)
        : [...prev.use_case_ids, useCaseId],
    }));
  }, []);

  const addRelayOutput = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      relay_outputs: [
        ...prev.relay_outputs,
        {
          id: Math.random().toString(36).substring(7),
          output_number: prev.relay_outputs.length + 1,
          type: "",
          custom_name: "",
          notes: "",
        },
      ],
    }));
  }, []);

  const updateRelayOutput = useCallback((id: string, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      relay_outputs: prev.relay_outputs.map((output) =>
        output.id === id ? { ...output, [field]: value } : output
      ),
    }));
  }, []);

  const deleteRelayOutput = useCallback((id: string) => {
    setFormData(prev => ({
      ...prev,
      relay_outputs: prev.relay_outputs.filter((output) => output.id !== id),
    }));
  }, []);

  const resetForm = useCallback((data?: CameraFormData) => {
    setFormData(data || emptyFormData);
  }, []);

  return {
    formData,
    updateField,
    addAttribute,
    updateAttribute,
    deleteAttribute,
    toggleUseCase,
    addRelayOutput,
    updateRelayOutput,
    deleteRelayOutput,
    resetForm,
  };
}
