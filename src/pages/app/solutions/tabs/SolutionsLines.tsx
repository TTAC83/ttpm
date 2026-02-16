import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FactoryLine {
  id: string;
  name: string;
  solution_type: "vision" | "iot" | "both";
  group_name: string;
  factory_name: string;
}

interface SolutionsLinesProps {
  solutionsProjectId: string;
}

export const SolutionsLines: React.FC<SolutionsLinesProps> = ({ solutionsProjectId }) => {
  const [lines, setLines] = useState<FactoryLine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLines = async () => {
      try {
        // Get portal for this project
        const { data: portal } = await supabase
          .from("solution_portals" as any)
          .select("id")
          .eq("solutions_project_id", solutionsProjectId)
          .maybeSingle();

        if (!portal) { setLines([]); return; }

        // Get factories
        const { data: factories } = await supabase
          .from("solution_factories" as any)
          .select("id, name")
          .eq("portal_id", (portal as any).id);

        const factoryList = (factories as any[] | null) ?? [];
        if (factoryList.length === 0) { setLines([]); return; }

        const factoryIds = factoryList.map((f: any) => f.id);
        const factoryMap = Object.fromEntries(factoryList.map((f: any) => [f.id, f.name]));

        // Get groups
        const { data: groupsData } = await supabase
          .from("factory_groups" as any)
          .select("id, name, factory_id")
          .in("factory_id", factoryIds)
          .order("created_at");

        const groupList = (groupsData as any[] | null) ?? [];
        if (groupList.length === 0) { setLines([]); return; }

        const groupIds = groupList.map((g: any) => g.id);
        const groupMap = Object.fromEntries(
          groupList.map((g: any) => [g.id, { name: g.name, factory_id: g.factory_id }])
        );

        // Get lines
        const { data: linesData } = await supabase
          .from("factory_group_lines" as any)
          .select("id, name, solution_type, group_id")
          .in("group_id", groupIds)
          .order("created_at");

        const result: FactoryLine[] = ((linesData as any[] | null) ?? []).map((l: any) => ({
          id: l.id,
          name: l.name,
          solution_type: l.solution_type,
          group_name: groupMap[l.group_id]?.name ?? "Unknown",
          factory_name: factoryMap[groupMap[l.group_id]?.factory_id] ?? "Unknown",
        }));

        setLines(result);
      } catch (error) {
        console.error("Error fetching factory lines:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLines();
  }, [solutionsProjectId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const solutionBadge = (type: string) => {
    switch (type) {
      case "vision": return <Badge variant="secondary">Vision</Badge>;
      case "iot": return <Badge variant="outline">IoT</Badge>;
      case "both": return (
        <div className="flex gap-1">
          <Badge variant="secondary">Vision</Badge>
          <Badge variant="outline">IoT</Badge>
        </div>
      );
      default: return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Production Lines</CardTitle>
        <CardDescription>
          Lines are configured in the Factory tab. This view shows all lines across your factory structure.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {lines.length === 0 ? (
          <div className="text-center py-8">
            <Info className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <h3 className="text-sm font-medium text-muted-foreground mb-1">No Lines Configured</h3>
            <p className="text-xs text-muted-foreground">
              Add lines via the Factory tab to see them here.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Line Name</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Factory</TableHead>
                <TableHead>Solution Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="font-medium">{line.name}</TableCell>
                  <TableCell>{line.group_name}</TableCell>
                  <TableCell>{line.factory_name}</TableCell>
                  <TableCell>{solutionBadge(line.solution_type)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default SolutionsLines;
