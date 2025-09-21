import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface LineBasicInfoProps {
  lineData: {
    name: string;
    min_speed: number;
    max_speed: number;
    line_description: string;
    product_description: string;
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

  const handleLineDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLineData({ ...lineData, line_description: e.target.value });
  };

  const handleProductDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLineData({ ...lineData, product_description: e.target.value });
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="line-description">Line Description</Label>
              <Textarea
                id="line-description"
                placeholder="Describe the production line setup..."
                value={lineData.line_description || ""}
                onChange={handleLineDescriptionChange}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-description">Product Description</Label>
              <Textarea
                id="product-description"
                placeholder="Describe the products being manufactured..."
                value={lineData.product_description || ""}
                onChange={handleProductDescriptionChange}
                rows={4}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};