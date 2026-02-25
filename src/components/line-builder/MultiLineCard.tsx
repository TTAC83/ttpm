import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Save, Copy, Trash2, Loader2 } from "lucide-react";
import { LineBasicInfo } from "./steps/LineBasicInfo";
import { ProcessFlowBuilder } from "./steps/ProcessFlowBuilder";
import { EquipmentTitles } from "./steps/EquipmentTitles";
import { DeviceAssignment } from "./steps/DeviceAssignment";
import { useLineWizard } from "./hooks/useLineWizard";
import { WizardConfig } from "./types/lineWizard";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface MultiLineCardProps {
  lineId: string;
  lineName: string;
  config: WizardConfig;
  projectId: string;
  completeness?: number;
  onSaved: () => void;
  onClone: (lineId: string) => void;
  onDelete: (lineId: string) => void;
  isCloning?: boolean;
  defaultExpanded?: boolean;
  solutionsProjectId?: string;
}

type Section = "basic" | "flow" | "titles" | "devices";

export const MultiLineCard: React.FC<MultiLineCardProps> = ({
  lineId,
  lineName,
  config,
  projectId,
  completeness = 0,
  onSaved,
  onClone,
  onDelete,
  isCloning,
  defaultExpanded = false,
  solutionsProjectId,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [openSections, setOpenSections] = useState<Set<Section>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const {
    lineData,
    setLineData,
    positions,
    setPositions,
    handleComplete,
    isLoading,
  } = useLineWizard(config, projectId, lineId, expanded);

  // Track dirty state
  const wrappedSetLineData = useCallback((data: any) => {
    setLineData(data);
    setIsDirty(true);
  }, [setLineData]);

  const wrappedSetPositions = useCallback((pos: any) => {
    setPositions(pos);
    setIsDirty(true);
  }, [setPositions]);

  const toggleSection = (section: Section) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const success = await handleComplete();
      if (success) {
        setIsDirty(false);
        onSaved();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const completenessColor =
    completeness >= 100 ? "text-primary" : completeness >= 50 ? "text-accent-foreground" : "text-muted-foreground";

  const sections: { key: Section; label: string }[] = [
    { key: "basic", label: "Basic Info" },
    { key: "flow", label: "Process Flow" },
    { key: "titles", label: "Position Titles" },
    { key: "devices", label: "Devices" },
  ];

  return (
    <Card className="border-l-4 border-l-primary">
      {/* Header — always visible */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-3 min-w-0">
          {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          <span className="font-semibold truncate">{lineName}</span>
          {isDirty && (
            <Badge variant="outline" className="text-xs border-destructive/50 text-destructive">
              Unsaved
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 w-32">
            <Progress value={completeness} className="h-2" />
            <span className={`text-xs font-medium ${completenessColor}`}>{completeness}%</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onClone(lineId)}
            disabled={isCloning}
            title="Clone Line"
          >
            {isCloning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" title="Delete Line">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Line</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{lineName}"? This will also delete all equipment, devices, and configurations. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(lineId)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <CardContent className="pt-0 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading line data...</span>
            </div>
          ) : (
            <>
              {sections.map(({ key, label }) => {
                const isOpen = openSections.has(key);
                return (
                  <Collapsible key={key} open={isOpen} onOpenChange={() => toggleSection(key)}>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 px-3 rounded-md hover:bg-muted/50 transition-colors text-sm font-medium">
                      {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      {label}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-1 pb-2">
                      {key === "basic" && (
                        <LineBasicInfo lineData={lineData} setLineData={wrappedSetLineData} />
                      )}
                      {key === "flow" && (
                        <ProcessFlowBuilder positions={positions} setPositions={wrappedSetPositions} />
                      )}
                      {key === "titles" && (
                        <EquipmentTitles positions={positions} setPositions={wrappedSetPositions} />
                      )}
                      {key === "devices" && (
                        <DeviceAssignment
                          positions={positions}
                          setPositions={wrappedSetPositions}
                          solutionsProjectId={solutionsProjectId}
                        />
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}

              <div className="flex justify-end pt-2 border-t">
                <Button onClick={handleSave} disabled={isSaving || !isDirty}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Line
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
};
