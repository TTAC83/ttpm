import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LineBasicInfoProps {
  lineData: {
    name: string;
    min_speed: number;
    max_speed: number;
  };
  setLineData: (data: any) => void;
}

export const LineBasicInfo: React.FC<LineBasicInfoProps> = ({
  lineData,
  setLineData,
}) => {
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLineData({ ...lineData, name: e.target.value });
  };

  const handleMinSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLineData({ ...lineData, min_speed: parseInt(e.target.value) || 0 });
  };

  const handleMaxSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLineData({ ...lineData, max_speed: parseInt(e.target.value) || 0 });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Line Information</CardTitle>
          <CardDescription>
            Enter the basic information for your production line
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="line-name">Line Name</Label>
            <Input
              id="line-name"
              placeholder="Enter line name"
              value={lineData.name}
              onChange={handleNameChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min-speed">Min Speed (units/min)</Label>
              <Input
                id="min-speed"
                type="number"
                min="0"
                placeholder="0"
                value={lineData.min_speed || ""}
                onChange={handleMinSpeedChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-speed">Max Speed (units/min)</Label>
              <Input
                id="max-speed"
                type="number"
                min="0"
                placeholder="0"
                value={lineData.max_speed || ""}
                onChange={handleMaxSpeedChange}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};