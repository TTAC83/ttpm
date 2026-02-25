import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, ListPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MultiLineCard } from "./MultiLineCard";
import { BulkAddLinesDialog } from "./BulkAddLinesDialog";
import { useCloneLine } from "./hooks/useCloneLine";
import { WizardConfig } from "./types/lineWizard";
import {
  checkLineCompleteness,
  getSolutionTypeMap,
  LineCompletenessResult,
} from "@/pages/app/solutions/hooks/lineCompletenessCheck";

interface Line {
  id: string;
  line_name: string;
  camera_count: number;
  iot_device_count: number;
  min_speed?: number;
  max_speed?: number;
  line_description?: string;
  product_description?: string;
  photos_url?: string;
  number_of_products?: number;
  number_of_artworks?: number;
  created_at: string;
}

interface MultiLineEditorProps {
  projectId: string;
  projectType: "implementation" | "solutions";
  tableName: "lines" | "solutions_lines";
  projectIdField: "project_id" | "solutions_project_id";
  config: WizardConfig;
  description?: string;
}

export const MultiLineEditor: React.FC<MultiLineEditorProps> = ({
  projectId,
  projectType,
  tableName,
  projectIdField,
  config,
  description = "Configure production lines with equipment, devices, and process flow",
}) => {
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [completenessMap, setCompletenessMap] = useState<Record<string, number>>({});
  const [cloningLineId, setCloningLineId] = useState<string | null>(null);
  const { toast } = useToast();
  const { cloneLine, isCloning } = useCloneLine(config);

  const fetchLines = useCallback(async () => {
    try {
      const query = supabase.from(tableName) as any;
      const { data, error } = await query
        .select("*")
        .eq(projectIdField, projectId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setLines(data || []);
    } catch (error) {
      console.error("Error fetching lines:", error);
      toast({ title: "Error", description: "Failed to fetch lines", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [projectId, tableName, projectIdField]);

  useEffect(() => {
    fetchLines();
  }, [fetchLines]);

  // Compute completeness for solutions projects
  useEffect(() => {
    if (projectType !== "solutions" || lines.length === 0) return;
    let cancelled = false;

    const compute = async () => {
      const typeMap = await getSolutionTypeMap(projectId);
      const results = await Promise.all(
        lines.map((line) =>
          checkLineCompleteness(
            {
              id: line.id,
              line_name: line.line_name,
              min_speed: line.min_speed,
              max_speed: line.max_speed,
              line_description: line.line_description,
              product_description: line.product_description,
              photos_url: line.photos_url,
              number_of_products: line.number_of_products,
              number_of_artworks: line.number_of_artworks,
            },
            typeMap
          )
        )
      );
      if (!cancelled) {
        const map: Record<string, number> = {};
        results.forEach((r) => (map[r.lineId] = r.percentage));
        setCompletenessMap(map);
      }
    };

    compute();
    return () => {
      cancelled = true;
    };
  }, [lines, projectId, projectType]);

  const handleBulkAdd = async (names: string[]) => {
    const inserts = names.map((name) => {
      const row: any = {
        line_name: name,
        min_speed: 0,
        max_speed: 0,
        camera_count: 0,
        iot_device_count: 0,
      };
      if (tableName === "lines") {
        row.project_id = projectId;
      } else {
        row.solutions_project_id = projectId;
      }
      return row;
    });

    const { error } = await supabase.from(tableName).insert(inserts);
    if (error) throw error;

    toast({ title: "Lines Created", description: `${names.length} lines added` });
    await fetchLines();
  };

  const handleCreateLine = async () => {
    const row: any = {
      line_name: `Line ${lines.length + 1}`,
      min_speed: 0,
      max_speed: 0,
      camera_count: 0,
      iot_device_count: 0,
    };
    if (tableName === "lines") {
      row.project_id = projectId;
    } else {
      row.solutions_project_id = projectId;
    }

    const { error } = await supabase.from(tableName).insert(row);
    if (error) {
      toast({ title: "Error", description: "Failed to create line", variant: "destructive" });
      return;
    }
    await fetchLines();
  };

  const handleClone = async (lineId: string) => {
    setCloningLineId(lineId);
    const success = await cloneLine(lineId, projectId);
    setCloningLineId(null);
    if (success) await fetchLines();
  };

  const handleDelete = async (lineId: string) => {
    try {
      const query = supabase.from(tableName) as any;
      const { error } = await query.delete().eq("id", lineId);
      if (error) throw error;
      toast({ title: "Success", description: "Line deleted successfully" });
      await fetchLines();
    } catch (error) {
      console.error("Error deleting line:", error);
      toast({ title: "Error", description: "Failed to delete line", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Production Lines</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setBulkOpen(true)}>
                <ListPlus className="mr-2 h-4 w-4" />
                Bulk Add
              </Button>
              <Button onClick={handleCreateLine}>
                <Plus className="mr-2 h-4 w-4" />
                Add Line
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {lines.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Lines Configured</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first production line or bulk-add multiple lines
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => setBulkOpen(true)}>
                <ListPlus className="mr-2 h-4 w-4" />
                Bulk Add Lines
              </Button>
              <Button onClick={handleCreateLine}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Line
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        lines.map((line) => (
          <MultiLineCard
            key={line.id}
            lineId={line.id}
            lineName={line.line_name}
            config={config}
            projectId={projectId}
            completeness={completenessMap[line.id] ?? 0}
            onSaved={fetchLines}
            onClone={handleClone}
            onDelete={handleDelete}
            isCloning={cloningLineId === line.id}
            solutionsProjectId={projectType === "solutions" ? projectId : undefined}
          />
        ))
      )}

      <BulkAddLinesDialog open={bulkOpen} onOpenChange={setBulkOpen} onAdd={handleBulkAdd} />
    </div>
  );
};
