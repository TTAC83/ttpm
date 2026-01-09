import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileJson, AlertCircle } from "lucide-react";
import { importLine, validateLineExport, LineExportData } from "@/lib/lineExportService";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LineImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectType: "implementation" | "solutions";
  onImportComplete: () => void;
}

export const LineImportDialog: React.FC<LineImportDialogProps> = ({
  open,
  onOpenChange,
  projectId,
  projectType,
  onImportComplete,
}) => {
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<LineExportData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setParseError(null);
    setParsedData(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!validateLineExport(data)) {
        setParseError("Invalid line export file format");
        return;
      }

      setParsedData(data);
    } catch (error) {
      setParseError("Failed to parse JSON file");
    }
  };

  const handleImport = async () => {
    if (!parsedData) return;

    setImporting(true);
    try {
      await importLine(parsedData, projectId, projectType);

      toast({
        title: "Success",
        description: `Line "${parsedData.line.line_name}" imported successfully`,
      });

      onImportComplete();
      handleClose();
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import line",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setParsedData(null);
    setParseError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Line Configuration</DialogTitle>
          <DialogDescription>
            Upload a previously exported line JSON file to create a new line with all its equipment and cameras.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Upload */}
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-2">
                <FileJson className="h-8 w-8 text-primary" />
                <div className="text-left">
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to select a line export JSON file
                </p>
              </div>
            )}
          </div>

          {/* Parse Error */}
          {parseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          {/* Parsed Data Preview */}
          {parsedData && (
            <div className="rounded-lg border p-4 space-y-2">
              <h4 className="font-medium">Line Preview</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>{" "}
                  <span className="font-medium">{parsedData.line.line_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Source:</span>{" "}
                  <span className="font-medium capitalize">{parsedData.sourceType}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Equipment:</span>{" "}
                  <span className="font-medium">{parsedData.equipment.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Cameras:</span>{" "}
                  <span className="font-medium">
                    {parsedData.equipment.filter((e) => e.camera).length}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Exported: {new Date(parsedData.exportedAt).toLocaleString()}
              </p>
            </div>
          )}

          {/* Target Info */}
          <div className="text-sm text-muted-foreground">
            Will be imported to:{" "}
            <span className="font-medium capitalize">{projectType} project</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!parsedData || importing}>
            {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Import Line
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
