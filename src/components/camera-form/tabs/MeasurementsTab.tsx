import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { CameraMeasurements } from "@/schemas/cameraSchema";

interface MeasurementsTabProps {
  data: CameraMeasurements | null | undefined;
  onChange: (updates: Partial<CameraMeasurements>) => void;
}

export const MeasurementsTab: React.FC<MeasurementsTabProps> = ({ data, onChange }) => {
  const measurements = data || { working_distance: null, horizontal_fov: null, smallest_text: null };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="working_distance">Working Distance (mm)</Label>
        <Input
          id="working_distance"
          type="number"
          step="0.1"
          value={measurements.working_distance || ""}
          onChange={(e) => onChange({ working_distance: e.target.value ? parseFloat(e.target.value) : null })}
          placeholder="Enter working distance"
        />
      </div>

      <div>
        <Label htmlFor="horizontal_fov">Horizontal FOV (mm)</Label>
        <Input
          id="horizontal_fov"
          type="number"
          step="0.1"
          value={measurements.horizontal_fov || ""}
          onChange={(e) => onChange({ horizontal_fov: e.target.value ? parseFloat(e.target.value) : null })}
          placeholder="Enter horizontal field of view"
        />
      </div>

      <div>
        <Label htmlFor="smallest_text">Smallest Text</Label>
        <Input
          id="smallest_text"
          value={measurements.smallest_text || ""}
          onChange={(e) => onChange({ smallest_text: e.target.value || null })}
          placeholder="Smallest readable text"
        />
      </div>
    </div>
  );
};
