import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, Eye, Edit, Download, Info, CheckCircle2, AlertCircle, ChevronDown, ChevronRight, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SolutionsLineWizard } from "@/components/solutions-line-builder/SolutionsLineWizard";
import { LineVisualization } from "@/components/line-builder/LineVisualization";
import { exportLine, downloadLineExport } from "@/lib/lineExportService";
import { useQueryClient } from "@tanstack/react-query";
import { useLineCompleteness } from "@/pages/app/solutions/hooks/useLineCompleteness";

interface SolutionsLine {
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

interface SolutionsLinesProps {
  solutionsProjectId: string;
}

export const SolutionsLines: React.FC<SolutionsLinesProps> = ({ solutionsProjectId }) => {
  const [lines, setLines] = useState<SolutionsLine[]>([]);
  const [groupMap, setGroupMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editLineId, setEditLineId] = useState<string | undefined>(undefined);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [exportingLineId, setExportingLineId] = useState<string | null>(null);
  const [expandedLineId, setExpandedLineId] = useState<string | null>(null);
  const [showGaps, setShowGaps] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { results: completenessResults, loading: completenessLoading, refresh: refreshCompleteness } = useLineCompleteness(lines, solutionsProjectId);

  const fetchLines = async () => {
    try {
      await syncFactoryLines();

      const { data, error } = await supabase
        .from("solutions_lines")
        .select("*")
        .eq("solutions_project_id", solutionsProjectId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setLines(data || []);
      await fetchGroupMap();
    } catch (error) {
      console.error("Error fetching lines:", error);
      toast({ title: "Error", description: "Failed to fetch lines", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const syncFactoryLines = async () => {
    try {
      const { data: portal } = await supabase
        .from("solution_portals" as any)
        .select("id")
        .eq("solutions_project_id", solutionsProjectId)
        .maybeSingle();
      if (!portal) return;

      const { data: factories } = await supabase
        .from("solution_factories" as any)
        .select("id")
        .eq("portal_id", (portal as any).id);
      const factoryList = (factories as any[] | null) ?? [];
      if (factoryList.length === 0) return;

      const { data: groupsData } = await supabase
        .from("factory_groups" as any)
        .select("id")
        .in("factory_id", factoryList.map((f: any) => f.id));
      const groupIds = ((groupsData as any[] | null) ?? []).map((g: any) => g.id);
      if (groupIds.length === 0) return;

      const { data: factoryLines } = await supabase
        .from("factory_group_lines" as any)
        .select("name")
        .in("group_id", groupIds);
      const factoryLineNames = ((factoryLines as any[] | null) ?? []).map((l: any) => l.name);
      if (factoryLineNames.length === 0) return;

      const { data: existing } = await supabase
        .from("solutions_lines")
        .select("line_name")
        .eq("solutions_project_id", solutionsProjectId);
      const existingNames = new Set((existing || []).map(l => l.line_name));

      const toInsert = factoryLineNames
        .filter((name: string) => !existingNames.has(name))
        .map((name: string) => ({
          line_name: name,
          solutions_project_id: solutionsProjectId,
          camera_count: 0,
          iot_device_count: 0,
        }));

      if (toInsert.length > 0) {
        await supabase.from("solutions_lines").insert(toInsert);
      }
    } catch (error) {
      console.error("Error syncing factory lines:", error);
    }
  };

  const fetchGroupMap = async () => {
    try {
      const { data: portal } = await supabase
        .from("solution_portals" as any)
        .select("id")
        .eq("solutions_project_id", solutionsProjectId)
        .maybeSingle();
      if (!portal) return;

      const { data: factories } = await supabase
        .from("solution_factories" as any)
        .select("id")
        .eq("portal_id", (portal as any).id);
      const factoryList = (factories as any[] | null) ?? [];
      if (factoryList.length === 0) return;

      const { data: groupsData } = await supabase
        .from("factory_groups" as any)
        .select("id, name")
        .in("factory_id", factoryList.map((f: any) => f.id));
      const groupList = (groupsData as any[] | null) ?? [];
      if (groupList.length === 0) return;

      const { data: glLines } = await supabase
        .from("factory_group_lines" as any)
        .select("name, group_id")
        .in("group_id", groupList.map((g: any) => g.id));

      const map: Record<string, string> = {};
      for (const fl of (glLines as any[] | null) ?? []) {
        const group = groupList.find((g: any) => g.id === fl.group_id);
        if (group) map[fl.name] = group.name;
      }
      setGroupMap(map);
    } catch (error) {
      console.error("Error fetching group map:", error);
    }
  };

  useEffect(() => { fetchLines(); }, [solutionsProjectId]);

  const handleEditLine = (lineId: string) => {
    setEditLineId(lineId);
    setWizardOpen(true);
  };

  const handleWizardComplete = () => {
    fetchLines();
    setWizardOpen(false);
    if (editLineId) {
      queryClient.invalidateQueries({ queryKey: ["line-visualization", editLineId] });
    }
    setEditLineId(undefined);
    // Refresh completeness after wizard closes
    setTimeout(() => refreshCompleteness(), 500);
  };

  const handleExportLine = async (lineId: string, lineName: string) => {
    setExportingLineId(lineId);
    try {
      const data = await exportLine(lineId, "solutions");
      const filename = `${lineName.replace(/\s+/g, "_")}_export_${new Date().toISOString().split("T")[0]}.json`;
      downloadLineExport(data, filename);
      toast({ title: "Export Complete", description: `Line "${lineName}" exported successfully` });
    } catch (error) {
      toast({ title: "Export Failed", description: error instanceof Error ? error.message : "Failed to export line", variant: "destructive" });
    } finally {
      setExportingLineId(null);
    }
  };

  const getStatusColor = (percentage: number) => {
    if (percentage === 100) return "text-green-500";
    if (percentage >= 50) return "text-amber-500";
    return "text-red-500";
  };

  const getStatusBgColor = (percentage: number) => {
    if (percentage === 100) return "bg-green-500/10 border-green-500/30";
    if (percentage >= 50) return "bg-amber-500/10 border-amber-500/30";
    return "bg-red-500/10 border-red-500/30";
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

  if (selectedLineId) {
    return <LineVisualization lineId={selectedLineId} onBack={() => setSelectedLineId(null)} />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Production Lines</CardTitle>
          <CardDescription>
            Lines are managed in the Factory tab. Click edit to configure each line. Indicators show configuration completeness.
          </CardDescription>
        </div>
        <Button
          variant={showGaps ? "default" : "outline"}
          size="sm"
          onClick={() => setShowGaps(!showGaps)}
          className="shrink-0"
        >
          <ListChecks className="h-4 w-4 mr-2" />
          {showGaps ? "Hide Gaps" : "Show Gaps"}
        </Button>
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
          <div className="space-y-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">Status</TableHead>
                  <TableHead>Line Name</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Speed Range</TableHead>
                  <TableHead>Cameras</TableHead>
                  <TableHead>IoT Devices</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => {
                  const result = completenessResults[line.id];
                  const percentage = result?.percentage ?? 0;
                  const isExpanded = expandedLineId === line.id;
                  const hasGaps = result && result.gaps.length > 0;

                  return (
                    <React.Fragment key={line.id}>
                      <TableRow className="cursor-pointer" onClick={() => showGaps && hasGaps && setExpandedLineId(isExpanded ? null : line.id)}>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center">
                                  {completenessLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                  ) : result?.isComplete ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                  ) : (
                                    <div className="relative">
                                      <AlertCircle className={`h-5 w-5 ${getStatusColor(percentage)}`} />
                                    </div>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                {result?.isComplete ? (
                                  <p className="text-sm font-medium">Configuration complete ✓</p>
                                ) : (
                                  <div>
                                    <p className="text-sm font-medium mb-1">{percentage}% complete</p>
                                    <p className="text-xs text-muted-foreground">Click row to see gaps</p>
                                  </div>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{line.line_name}</span>
                            {!completenessLoading && result && !result.isComplete && (
                              <Badge variant="outline" className={`text-xs ${getStatusBgColor(percentage)}`}>
                                {percentage}%
                              </Badge>
                            )}
                            {showGaps && hasGaps && (
                              isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {groupMap[line.line_name] ? (
                            <Badge variant="outline">{groupMap[line.line_name]}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {line.min_speed != null && line.max_speed != null && (line.min_speed > 0 || line.max_speed > 0)
                            ? `${line.min_speed} - ${line.max_speed} units/min`
                            : <span className="text-muted-foreground text-xs">Not specified</span>}
                        </TableCell>
                        <TableCell>{line.camera_count}</TableCell>
                        <TableCell>{line.iot_device_count}</TableCell>
                        <TableCell>{new Date(line.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedLineId(line.id)} title="View Line">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEditLine(line.id)} title="Edit Line">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleExportLine(line.id, line.line_name)}
                              disabled={exportingLineId === line.id}
                              title="Export Line"
                            >
                              {exportingLineId === line.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {showGaps && isExpanded && result && result.gaps.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/30 p-0">
                            <div className="px-6 py-3">
                              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                                Configuration Gaps — {result.gaps.reduce((sum, g) => sum + g.items.length, 0)} items remaining
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {result.gaps.map((gap, idx) => (
                                  <div key={idx} className={`rounded-md border p-3 ${getStatusBgColor(percentage)}`}>
                                    <p className="text-xs font-semibold mb-1.5">{gap.category}</p>
                                    <ul className="space-y-0.5">
                                      {gap.items.map((item, iIdx) => (
                                        <li key={iIdx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                          <span className="mt-1 h-1 w-1 rounded-full bg-current shrink-0" />
                                          {item}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <SolutionsLineWizard
        open={wizardOpen}
        onOpenChange={(open) => {
          setWizardOpen(open);
          if (!open) setEditLineId(undefined);
        }}
        solutionsProjectId={solutionsProjectId}
        onComplete={handleWizardComplete}
        editLineId={editLineId}
      />
    </Card>
  );
};

export default SolutionsLines;
