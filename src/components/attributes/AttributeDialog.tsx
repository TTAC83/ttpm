import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Info } from "lucide-react";
import { DATA_TYPES, getDataTypeConfig, getUnitOptions } from "./attributeConfig";

export interface AttributeFormData {
  name: string;
  data_type: string;
  unit_of_measure: string;
  validation_type: string;
  apply_min_max_date: boolean;
}

const EMPTY_FORM: AttributeFormData = {
  name: "",
  data_type: "decimal",
  unit_of_measure: "",
  validation_type: "single_value",
  apply_min_max_date: false,
};

interface AttributeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AttributeFormData) => Promise<void>;
  initialData?: Partial<AttributeFormData>;
  editMode?: boolean;
}

export function AttributeDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  editMode = false,
}: AttributeDialogProps) {
  const [formData, setFormData] = useState<AttributeFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(initialData ? { ...EMPTY_FORM, ...initialData } : EMPTY_FORM);
    }
  }, [open, initialData]);

  const config = getDataTypeConfig(formData.data_type);
  const unitOptions = getUnitOptions(formData.data_type);
  const hasUnits = unitOptions.length > 0;

  const handleDataTypeChange = (value: string) => {
    const newConfig = getDataTypeConfig(value);
    const defaultValidation = newConfig?.validationTypes[0]?.value || "single_value";
    setFormData({
      ...formData,
      data_type: value,
      unit_of_measure: "",
      validation_type: defaultValidation,
      apply_min_max_date: false,
    });
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSubmit(formData);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const isValid = formData.name.trim() && formData.data_type && formData.validation_type;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editMode ? "Edit Attribute" : "Add New Attribute"}
          </DialogTitle>
          <DialogDescription>
            {editMode
              ? "Update the attribute definition"
              : "Create a new master attribute"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Section 1: Basic Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="attr-name">
                  <span className="text-destructive">*</span> Attribute Name
                </Label>
                <Input
                  id="attr-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Weight"
                />
              </div>
              <div>
                <Label htmlFor="attr-data-type">
                  <span className="text-destructive">*</span> Data Type
                </Label>
                <Select
                  value={formData.data_type}
                  onValueChange={handleDataTypeChange}
                >
                  <SelectTrigger id="attr-data-type">
                    <SelectValue placeholder="Select data type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DATA_TYPES.map((dt) => (
                      <SelectItem key={dt.value} value={dt.value}>
                        {dt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 2: Format */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Format</h3>
            <div className="grid grid-cols-2 gap-4">
              {hasUnits && (
                <div>
                  <Label htmlFor="attr-unit">
                    <span className="text-destructive">*</span> Unit of Measure
                  </Label>
                  <Select
                    value={formData.unit_of_measure}
                    onValueChange={(v) =>
                      setFormData({ ...formData, unit_of_measure: v })
                    }
                  >
                    <SelectTrigger id="attr-unit">
                      <SelectValue placeholder="Select Unit of Measurement" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitOptions.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {config && config.validationTypes.length > 0 && (
                <div>
                  <Label>
                    <span className="text-destructive">*</span> Validation Type
                  </Label>
                  <div className="flex gap-0 mt-1.5">
                    {config.validationTypes.map((vt) => (
                      <Button
                        key={vt.value}
                        type="button"
                        variant={
                          formData.validation_type === vt.value
                            ? "default"
                            : "outline"
                        }
                        className="flex-1 rounded-none first:rounded-l-md last:rounded-r-md"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            validation_type: vt.value,
                          })
                        }
                      >
                        {vt.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Min/max date toggle for date type */}
            {config?.showMinMaxDate && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="attr-min-max-date"
                  checked={formData.apply_min_max_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      apply_min_max_date: e.target.checked,
                    })
                  }
                  className="rounded border-input"
                />
                <Label htmlFor="attr-min-max-date">
                  Apply min/max date validation
                </Label>
              </div>
            )}

            {config?.showMinMaxDate && formData.apply_min_max_date && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-4 space-y-2">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-medium text-sm">
                  <Info className="h-4 w-4" />
                  System-Defined Date Validation Rules
                </div>
                <ul className="text-sm text-blue-600 dark:text-blue-300 space-y-1 ml-6 list-disc">
                  <li><strong>Minimum Allowed Date:</strong> Current System Date + 1 day</li>
                  <li><strong>Maximum Allowed Date:</strong> Date imported from ERP system</li>
                </ul>
                <p className="text-xs text-muted-foreground ml-6">
                  These rules are system-defined and non-configurable. They will be enforced automatically when attribute values are entered.
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || saving}>
            {saving ? "Saving..." : editMode ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}