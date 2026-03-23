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
import { Switch } from "@/components/ui/switch";
import { Info } from "lucide-react";
import { DATA_TYPES, getDataTypeConfig, getUnitOptions } from "./attributeConfig";

export interface AttributeFormData {
  name: string;
  data_type: string;
  unit_of_measure: string;
  validation_type: string;
  apply_min_max_date: boolean;
  is_custom: boolean;
}

const EMPTY_FORM: AttributeFormData = {
  name: "",
  data_type: "decimal",
  unit_of_measure: "",
  validation_type: "single_value",
  apply_min_max_date: false,
  is_custom: false,
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
  // Track whether user selected "Other" for data type / unit
  const [customDataType, setCustomDataType] = useState(false);
  const [customUnit, setCustomUnit] = useState(false);

  useEffect(() => {
    if (open) {
      const merged = initialData ? { ...EMPTY_FORM, ...initialData } : EMPTY_FORM;
      setFormData(merged);

      // Determine if data type / unit are custom (not in standard list)
      if (merged.is_custom) {
        const isStandardType = DATA_TYPES.some((dt) => dt.value === merged.data_type);
        setCustomDataType(!isStandardType);
        if (isStandardType) {
          const units = getUnitOptions(merged.data_type);
          const isStandardUnit = !merged.unit_of_measure || units.some((u) => u.value === merged.unit_of_measure);
          setCustomUnit(!isStandardUnit);
        } else {
          setCustomUnit(!!merged.unit_of_measure);
        }
      } else {
        setCustomDataType(false);
        setCustomUnit(false);
      }
    }
  }, [open, initialData]);

  const isCustom = formData.is_custom;
  const config = getDataTypeConfig(formData.data_type);
  const unitOptions = getUnitOptions(formData.data_type);
  const hasUnits = unitOptions.length > 0;

  const handleDataTypeChange = (value: string) => {
    if (value === "__other__") {
      setCustomDataType(true);
      setCustomUnit(false);
      setFormData({
        ...formData,
        data_type: "",
        unit_of_measure: "",
        validation_type: "single_value",
        apply_min_max_date: false,
      });
    } else {
      setCustomDataType(false);
      setCustomUnit(false);
      const newConfig = getDataTypeConfig(value);
      const defaultValidation = newConfig?.validationTypes[0]?.value || "single_value";
      setFormData({
        ...formData,
        data_type: value,
        unit_of_measure: "",
        validation_type: defaultValidation,
        apply_min_max_date: false,
      });
    }
  };

  const handleUnitChange = (value: string) => {
    if (value === "__other__") {
      setCustomUnit(true);
      setFormData({ ...formData, unit_of_measure: "" });
    } else {
      setCustomUnit(false);
      setFormData({ ...formData, unit_of_measure: value });
    }
  };

  const handleCustomToggle = (checked: boolean) => {
    if (!checked) {
      // Turning off custom — reset to defaults
      setCustomDataType(false);
      setCustomUnit(false);
      setFormData({
        ...formData,
        is_custom: false,
        data_type: "decimal",
        unit_of_measure: "",
        validation_type: "single_value",
        apply_min_max_date: false,
      });
    } else {
      setFormData({ ...formData, is_custom: true });
    }
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

  const isValid =
    formData.name.trim() &&
    formData.data_type &&
    formData.validation_type;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>
                {editMode ? "Edit Attribute" : "Add New Attribute"}
              </DialogTitle>
              <DialogDescription>
                {editMode
                  ? "Update the attribute definition"
                  : "Create a new master attribute"}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="custom-switch" className="text-sm font-medium">
                Custom
              </Label>
              <Switch
                id="custom-switch"
                checked={formData.is_custom}
                onCheckedChange={handleCustomToggle}
              />
            </div>
          </div>
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
                {isCustom && customDataType ? (
                  <div className="space-y-2">
                    <Input
                      value={formData.data_type}
                      onChange={(e) =>
                        setFormData({ ...formData, data_type: e.target.value })
                      }
                      placeholder="Enter custom data type"
                    />
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:underline"
                      onClick={() => {
                        setCustomDataType(false);
                        setFormData({ ...formData, data_type: "decimal", unit_of_measure: "", validation_type: "single_value" });
                      }}
                    >
                      ← Back to standard types
                    </button>
                  </div>
                ) : (
                  <Select
                    value={
                      isCustom && customDataType
                        ? "__other__"
                        : DATA_TYPES.some((dt) => dt.value === formData.data_type)
                        ? formData.data_type
                        : "__other__"
                    }
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
                      {isCustom && (
                        <SelectItem value="__other__" className="text-amber-600 font-medium">
                          Other (Custom)
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 2: Format */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Format</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Unit of Measure */}
              {(hasUnits || (isCustom && customDataType)) && (
                <div>
                  <Label htmlFor="attr-unit">
                    {!customDataType && <span className="text-destructive">*</span>} Unit of Measure
                  </Label>
                  {customUnit || (isCustom && customDataType) ? (
                    <div className="space-y-2">
                      <Input
                        value={formData.unit_of_measure}
                        onChange={(e) =>
                          setFormData({ ...formData, unit_of_measure: e.target.value })
                        }
                        placeholder="Enter custom unit"
                      />
                      {hasUnits && !customDataType && (
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:underline"
                          onClick={() => {
                            setCustomUnit(false);
                            setFormData({ ...formData, unit_of_measure: "" });
                          }}
                        >
                          ← Back to standard units
                        </button>
                      )}
                    </div>
                  ) : (
                    <Select
                      value={formData.unit_of_measure}
                      onValueChange={handleUnitChange}
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
                        {isCustom && (
                          <SelectItem value="__other__" className="text-amber-600 font-medium">
                            Other (Custom)
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* Validation Type */}
              {config && config.validationTypes.length > 0 && !customDataType && (
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

              {/* Custom data type — simple validation type input */}
              {customDataType && (
                <div>
                  <Label>Validation Type</Label>
                  <Input
                    value={formData.validation_type}
                    onChange={(e) =>
                      setFormData({ ...formData, validation_type: e.target.value })
                    }
                    placeholder="e.g., single_value"
                  />
                </div>
              )}
            </div>

            {/* Min/max date toggle for date type */}
            {config?.showMinMaxDate && !customDataType && (
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

            {config?.showMinMaxDate && formData.apply_min_max_date && !customDataType && (
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

            {/* Custom warning banner */}
            {isCustom && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium text-sm">
                  <Info className="h-4 w-4" />
                  Custom Attribute
                </div>
                <p className="text-sm text-amber-600 dark:text-amber-300 mt-1">
                  This attribute will be flagged as custom and highlighted in yellow. It will need to be officially added to the system when built.
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
