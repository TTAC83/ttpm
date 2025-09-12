import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface ExpenseUploadProps {
  onUploadSuccess: () => void;
}

interface ExpenseRow {
  account_code: string;
  account: string;
  expense_date: string;
  source: string;
  description: string;
  invoice_number: string;
  reference: string;
  gross: number;
  vat: number;
  net: number;
  vat_rate: number;
  vat_rate_name: string;
  customer: string;
}

export const ExpenseUpload = ({ onUploadSuccess }: ExpenseUploadProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<{
    success: number;
    errors: string[];
    total: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const expectedHeaders = [
    'Account Code', 'Account', 'Date', 'Source', 'Description', 
    'Invoice Number', 'Reference', 'Gross', 'VAT', 'Net', 
    'VAT Rate', 'VAT Rate Name', 'Customer'
  ];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    try {
      const fileData = await file.arrayBuffer();
      const workbook = XLSX.read(fileData);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Skip the first row (headers) and process data
      const rows = jsonData.slice(1) as any[][];
      
      if (rows.length === 0) {
        throw new Error('No data rows found in the Excel file');
      }

      // Validate headers
      const fileHeaders = jsonData[0] as string[];
      const missingHeaders = expectedHeaders.filter(header => 
        !fileHeaders.includes(header)
      );
      
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
      }

      const expenses: ExpenseRow[] = [];
      const errors: string[] = [];

      setUploadProgress(25);

      // Process each row
      rows.forEach((row, index) => {
        try {
          const expense: ExpenseRow = {
            account_code: row[0]?.toString() || '',
            account: row[1]?.toString() || '',
            expense_date: row[2] ? new Date(row[2]).toISOString().split('T')[0] : '',
            source: row[3]?.toString() || '',
            description: row[4]?.toString() || '',
            invoice_number: row[5]?.toString() || '',
            reference: row[6]?.toString() || '',
            gross: parseFloat(row[7]) || 0,
            vat: parseFloat(row[8]) || 0,
            net: parseFloat(row[9]) || 0,
            vat_rate: parseFloat(row[10]) || 0,
            vat_rate_name: row[11]?.toString() || '',
            customer: row[12]?.toString() || ''
          };

          // Basic validation
          if (!expense.account_code || !expense.account) {
            errors.push(`Row ${index + 2}: Missing account code or account name`);
            return;
          }

          expenses.push(expense);
        } catch (error) {
          errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Invalid data format'}`);
        }
      });

      setUploadProgress(50);

      if (expenses.length === 0) {
        throw new Error('No valid expense records found');
      }

      // Insert expenses into database
      const { data: insertedData, error } = await supabase
        .from('expenses')
        .insert(expenses)
        .select();

      setUploadProgress(100);

      if (error) {
        throw error;
      }

      setUploadResult({
        success: insertedData?.length || 0,
        errors,
        total: rows.length
      });

      if (insertedData?.length > 0) {
        toast({
          title: 'Upload Successful',
          description: `${insertedData.length} expenses uploaded successfully`,
        });
        onUploadSuccess();
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload expenses',
        variant: 'destructive',
      });
      setUploadResult({
        success: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        total: 0
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const resetDialog = () => {
    setUploadResult(null);
    setUploadProgress(0);
    setIsUploading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetDialog();
    }}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Upload Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload Expenses
          </DialogTitle>
          <DialogDescription>
            Upload an Excel file with expense data. The file should contain the following columns:
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Required columns: {expectedHeaders.join(', ')}
            </AlertDescription>
          </Alert>

          {!uploadResult && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full"
                variant="outline"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Processing...' : 'Select Excel File'}
              </Button>
            </>
          )}

          {isUploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                Processing expenses... {uploadProgress}%
              </p>
            </div>
          )}

          {uploadResult && (
            <div className="space-y-3">
              <Alert className={uploadResult.success > 0 ? 'border-green-500' : 'border-red-500'}>
                {uploadResult.success > 0 ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <AlertDescription>
                  <div className="space-y-1">
                    <p>
                      <strong>{uploadResult.success}</strong> out of <strong>{uploadResult.total}</strong> expenses uploaded successfully
                    </p>
                    {uploadResult.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium">Errors:</p>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {uploadResult.errors.slice(0, 5).map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                          {uploadResult.errors.length > 5 && (
                            <li>... and {uploadResult.errors.length - 5} more errors</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => setIsOpen(false)} 
                  className="flex-1"
                  variant={uploadResult.success > 0 ? "default" : "secondary"}
                >
                  {uploadResult.success > 0 ? 'Done' : 'Close'}
                </Button>
                <Button 
                  onClick={resetDialog}
                  variant="outline"
                  className="flex-1"
                >
                  Upload Another
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};