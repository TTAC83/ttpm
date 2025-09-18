import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Calendar } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function WeeklyReviewPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a valid Excel file (.xlsx or .xls)");
      return;
    }

    setIsUploading(true);
    
    try {
      // Upload file to Supabase storage
      const fileName = `${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('bau-weekly-uploads')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Insert record into bau_weekly_uploads table
      const { error: insertError } = await supabase
        .from('bau_weekly_uploads')
        .insert({
          storage_path: uploadData.path,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id || '',
          notes: 'Weekly review upload'
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(`Database insert failed: ${insertError.message}`);
      }

      // Call the Supabase function to process the file
      const { error: functionError } = await supabase.functions
        .invoke('bau-weekly-import', {
          body: { filePath: uploadData.path }
        });

      if (functionError) {
        console.error('Function error:', functionError);
        throw new Error(`Processing failed: ${functionError.message}`);
      }

      toast.success("Excel file uploaded and processed successfully!");
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(error instanceof Error ? error.message : "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleWeeklyReviewClick = () => {
    navigate('/app/bau/weekly-review');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Weekly Review</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Weekly Excel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload your weekly BAU metrics Excel file to import customer data and KPIs.
              </p>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {isUploading ? "Uploading..." : "Choose Excel File"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Weekly Review Meeting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Start or continue your weekly review meeting to assess customer health and KPIs.
              </p>
              <Button 
                onClick={handleWeeklyReviewClick}
                className="w-full"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Open Weekly Review
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}