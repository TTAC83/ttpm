import React, { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import type { CameraBasics } from "@/schemas/cameraSchema";

interface BasicsTabProps {
  data: CameraBasics;
  onChange: (updates: Partial<CameraBasics>) => void;
}

export const BasicsTab: React.FC<BasicsTabProps> = ({ data, onChange }) => {
  const [cameras, setCameras] = useState<any[]>([]);
  const [lights, setLights] = useState<any[]>([]);

  useEffect(() => {
    loadHardware();
  }, []);

  const loadHardware = async () => {
    const [camerasRes, lightsRes] = await Promise.all([
      supabase.from("hardware_master").select("*").eq("hardware_type", "Camera"),
      supabase.from("hardware_master").select("*").eq("hardware_type", "Light"),
    ]);

    if (camerasRes.data) setCameras(camerasRes.data);
    if (lightsRes.data) setLights(lightsRes.data);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="mac_address">MAC Address *</Label>
        <Input
          id="mac_address"
          value={data.mac_address}
          onChange={(e) => onChange({ mac_address: e.target.value })}
          placeholder="Enter MAC address"
        />
      </div>

      <div>
        <Label htmlFor="camera_type">Camera Type *</Label>
        <Select value={data.camera_type} onValueChange={(value) => onChange({ camera_type: value })}>
          <SelectTrigger id="camera_type">
            <SelectValue placeholder="Select camera type" />
          </SelectTrigger>
          <SelectContent>
            {cameras.map((cam) => (
              <SelectItem key={cam.id} value={cam.product_name}>
                {cam.product_name} - {cam.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="lens_type">Lens Type *</Label>
        <Input
          id="lens_type"
          value={data.lens_type}
          onChange={(e) => onChange({ lens_type: e.target.value })}
          placeholder="e.g., Standard, 4mm, 6mm"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="light_required"
          checked={data.light_required}
          onCheckedChange={(checked) => onChange({ light_required: !!checked })}
        />
        <Label htmlFor="light_required" className="cursor-pointer">
          Light Required
        </Label>
      </div>

      {data.light_required && (
        <div>
          <Label htmlFor="light_id">Light</Label>
          <Select
            value={data.light_id || ""}
            onValueChange={(value) => onChange({ light_id: value || null })}
          >
            <SelectTrigger id="light_id">
              <SelectValue placeholder="Select light" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {lights.map((light) => (
                <SelectItem key={light.id} value={light.id}>
                  {light.product_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};
