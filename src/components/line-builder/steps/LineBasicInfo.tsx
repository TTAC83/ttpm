import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

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

  const handleSpeedRangeChange = (values: number[]) => {
    setLineData({
      ...lineData,
      min_speed: values[0],
      max_speed: values[1],
    });
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

          <div className="space-y-4">
            <Label>Speed Range (units/min)</Label>
            <div className="px-4">
              <Slider
                value={[lineData.min_speed, lineData.max_speed]}
                onValueChange={handleSpeedRangeChange}
                max={1000}
                min={0}
                step={10}
                className="w-full"
              />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Min: {lineData.min_speed} units/min</span>
              <span>Max: {lineData.max_speed} units/min</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};