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
    photos_url: string;
    number_of_products?: number;
    number_of_artworks?: number;
  };
  setLineData: (data: any) => void;
}

export const LineBasicInfo: React.FC<LineBasicInfoProps> = ({
  lineData,
  setLineData,
}) => {
  const handleChange = (field: string, value: string | number) => {
    setLineData({ ...lineData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Line Information</CardTitle>
          <CardDescription>
            Enter the basic information for your production line. All fields contribute to configuration completeness.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="line-name">Line Name</Label>
            <Input
              id="line-name"
              placeholder="Enter line name"
              value={lineData.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="photos-url">Photos SharePoint URL</Label>
            <Input
              id="photos-url"
              type="url"
              placeholder="https://sharepoint.com/..."
              value={lineData.photos_url || ""}
              onChange={(e) => handleChange("photos_url", e.target.value)}
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
                onChange={(e) => handleChange("min_speed", parseInt(e.target.value) || 0)}
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
                onChange={(e) => handleChange("max_speed", parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="number-of-products">Number of Products</Label>
              <Input
                id="number-of-products"
                type="number"
                min="0"
                placeholder="0"
                value={lineData.number_of_products || ""}
                onChange={(e) => handleChange("number_of_products", parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number-of-artworks">Number of Artworks</Label>
              <Input
                id="number-of-artworks"
                type="number"
                min="0"
                placeholder="0"
                value={lineData.number_of_artworks || ""}
                onChange={(e) => handleChange("number_of_artworks", parseInt(e.target.value) || 0)}
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
                onChange={(e) => handleChange("line_description", e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-description">Product Description</Label>
              <Textarea
                id="product-description"
                placeholder="Describe the products being manufactured..."
                value={lineData.product_description || ""}
                onChange={(e) => handleChange("product_description", e.target.value)}
                rows={4}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
