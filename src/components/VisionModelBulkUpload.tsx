import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { visionModelsService, VisionModel } from '@/lib/visionModelsService';
import { ScrollArea } from '@/components/ui/scroll-area';

interface VisionModelBulkUploadProps {
  projectId: string;
  projectType?: 'implementation' | 'solutions';
  onUploadSuccess: () => void;
}

interface ParsedRow {
  line: string;
  position: string;
  equipment: string;
  product_sku: string;
  product_title: string;
  use_case: string;
  group_name?: string;
  status: 'Footage Required' | 'Annotation Required' | 'Processing Required' | 'Deployment Required' | 'Validation Required' | 'Complete';
  start_date?: string;
  end_date?: string;
  product_run_start?: string;
  product_run_end?: string;
}

export function VisionModelBulkUpload({ 
  projectId, 
  projectType = 'implementation',
  onUploadSuccess 
}: VisionModelBulkUploadProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const parseFlexibleDate = (value: any): string | null => {
    if (!value) return null;
    
    // Handle Excel serial dates
    if (typeof value === 'number') {
      const date = XLSX.SSF.parse_date_code(value);
      if (date) {
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      }
    }
    
    // Handle string dates
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;
      
      // Try DD/MM/YYYY format
      const ddmmyyyy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
      const ddMatch = trimmed.match(ddmmyyyy);
      if (ddMatch) {
        const day = ddMatch[1].padStart(2, '0');
        const month = ddMatch[2].padStart(2, '0');
        const year = ddMatch[3];
        return `${year}-${month}-${day}`;
      }
      
      // Try ISO format
      const isoDate = new Date(trimmed);
      if (!isNaN(isoDate.getTime())) {
        return isoDate.toISOString().split('T')[0];
      }
    }
    
    return null;
  };

  const parseExcelFile = async (file: File): Promise<ParsedRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
          
          const parsed: ParsedRow[] = jsonData.map((row: any) => ({
            line: row['Line'] || '',
            position: row['Position'] || '',
            equipment: row['Equipment'] || '',
            product_sku: row['Product SKU'] || '',
            product_title: row['Product Title'] || '',
            use_case: row['Use Case'] || '',
            group_name: row['Group'] || undefined,
            status: (row['Status'] || 'Footage Required') as any,
            start_date: parseFlexibleDate(row['Start Date']),
            end_date: parseFlexibleDate(row['End Date']),
            product_run_start: parseFlexibleDate(row['Product Run Start']),
            product_run_end: parseFlexibleDate(row['Product Run End']),
          }));
          
          resolve(parsed);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const validateRow = (row: ParsedRow, rowIndex: number): string | null => {
    if (!row.line) return `Row ${rowIndex}: Line is required`;
    if (!row.position) return `Row ${rowIndex}: Position is required`;
    if (!row.equipment) return `Row ${rowIndex}: Equipment is required`;
    if (!row.product_sku) return `Row ${rowIndex}: Product SKU is required`;
    if (!row.product_title) return `Row ${rowIndex}: Product Title is required`;
    if (!row.use_case) return `Row ${rowIndex}: Use Case is required`;
    
    const validStatuses = ['Footage Required', 'Model Training', 'Model Validation', 'Complete'];
    if (!validStatuses.includes(row.status)) {
      return `Row ${rowIndex}: Invalid status "${row.status}"`;
    }
    
    return null;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset
    setResults(null);
    setProgress(0);
    setUploading(true);

    try {
      // Parse file
      setProgress(10);
      const rows = await parseExcelFile(file);
      
      if (rows.length === 0) {
        throw new Error('No data found in file');
      }

      setProgress(20);

      // Validate rows
      const validationErrors: any[] = [];
      const warnings: any[] = [];
      
      for (let i = 0; i < rows.length; i++) {
        const error = validateRow(rows[i], i + 2);
        if (error) {
          validationErrors.push({ row: i + 2, message: error });
        }
      }

      if (validationErrors.length > 0) {
        setResults({
          created: 0,
          updated: 0,
          warnings: [],
          errors: validationErrors
        });
        setUploading(false);
        return;
      }

      setProgress(40);

      // Verify line configurations
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const verification = await visionModelsService.verifyLineConfiguration(
          projectId,
          row.line,
          row.position,
          row.equipment,
          projectType
        );

        if (verification.warning) {
          warnings.push({
            row: i + 2,
            message: verification.warning,
            data: row
          });
        }

        setProgress(40 + (i / rows.length) * 30);
      }

      setProgress(70);

      // Transform rows to VisionModel format
      const models = rows.map(row => ({
        ...(projectType === 'solutions' 
          ? { solutions_project_id: projectId, project_type: 'solutions' as const }
          : { project_id: projectId, project_type: 'implementation' as const }
        ),
        line_name: row.line,
        position: row.position,
        equipment: row.equipment,
        product_sku: row.product_sku,
        product_title: row.product_title,
        use_case: row.use_case,
        group_name: row.group_name,
        start_date: row.start_date || null,
        end_date: row.end_date || null,
        product_run_start: row.product_run_start || null,
        product_run_end: row.product_run_end || null,
        status: row.status,
      }));

      setProgress(80);

      // Upload to database
      const uploadResult = await visionModelsService.bulkUpsertVisionModels(
        projectId,
        projectType,
        models,
        warnings
      );

      setProgress(100);

      // Combine results with warnings
      setResults({
        ...uploadResult,
        warnings: [...warnings, ...uploadResult.warnings]
      });

      toast({
        title: "Upload Complete",
        description: `Created: ${uploadResult.created}, Updated: ${uploadResult.updated}`,
      });

      onUploadSuccess();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to process file",
        variant: "destructive",
      });
      setResults({
        created: 0,
        updated: 0,
        warnings: [],
        errors: [{ row: 0, message: error.message || "Failed to process file" }]
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClose = () => {
    setOpen(false);
    setResults(null);
    setProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Upload Vision Models</DialogTitle>
          <DialogDescription>
            Upload an Excel or CSV file with vision model data. The system will update existing models (by Product SKU) or create new ones.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <FileSpreadsheet className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>Required columns:</strong> Line, Position, Equipment, Product SKU, Product Title, Use Case, Status</p>
                <p><strong>Optional columns:</strong> Group, Start Date, End Date, Product Run Start, Product Run End</p>
                <p className="text-xs text-muted-foreground">Date format: DD/MM/YYYY or MM/DD/YYYY (auto-detected)</p>
              </div>
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="file-upload"
              className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 ${
                uploading ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">Excel (.xlsx, .xls) or CSV files</p>
              </div>
              <input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                disabled={uploading}
              />
            </label>
          </div>

          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                {progress < 20 && "Reading file..."}
                {progress >= 20 && progress < 40 && "Validating data..."}
                {progress >= 40 && progress < 70 && "Verifying configurations..."}
                {progress >= 70 && progress < 100 && "Uploading to database..."}
                {progress === 100 && "Complete!"}
              </p>
            </div>
          )}

          {results && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-2xl font-bold">{results.created}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Updated</p>
                    <p className="text-2xl font-bold">{results.updated}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium">Warnings</p>
                    <p className="text-2xl font-bold">{results.warnings.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium">Errors</p>
                    <p className="text-2xl font-bold">{results.errors.length}</p>
                  </div>
                </div>
              </div>

              {results.warnings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    Warnings ({results.warnings.length})
                  </h4>
                  <ScrollArea className="h-32 w-full rounded border">
                    <div className="p-2 space-y-1">
                      {results.warnings.slice(0, 10).map((warning: any, idx: number) => (
                        <div key={idx} className="text-xs text-yellow-600">
                          Row {warning.row}: {warning.message}
                        </div>
                      ))}
                      {results.warnings.length > 10 && (
                        <div className="text-xs text-muted-foreground">
                          ... and {results.warnings.length - 10} more warnings
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {results.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    Errors ({results.errors.length})
                  </h4>
                  <ScrollArea className="h-32 w-full rounded border">
                    <div className="p-2 space-y-1">
                      {results.errors.slice(0, 10).map((error: any, idx: number) => (
                        <div key={idx} className="text-xs text-red-600">
                          Row {error.row}: {error.message}
                        </div>
                      ))}
                      {results.errors.length > 10 && (
                        <div className="text-xs text-muted-foreground">
                          ... and {results.errors.length - 10} more errors
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {results ? 'Close' : 'Cancel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}