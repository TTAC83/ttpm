import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Check, X, AlertCircle, Upload } from 'lucide-react';
import { parseUKDate, toISODateString } from '@/lib/dateUtils';
import * as XLSX from 'xlsx';

interface ExcelRow {
  customer: string;
  goLiveStatus: string;
  projectStatus: string;
  estimatedGoLiveDate: string;
}

interface ProjectMatch {
  excelRow: ExcelRow;
  matchedProject: any | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  manualOverride?: string;
}


const BulkUpdateAccountInfo = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [matches, setMatches] = useState<ProjectMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [fileUploaded, setFileUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (excelData.length > 0 && projects.length > 0) {
      performMatching(projects);
    }
  }, [excelData, projects]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

        // Skip header rows and parse data
        const parsedData: ExcelRow[] = [];
        for (let i = 2; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row[0]) { // Only process rows with customer name
            parsedData.push({
              customer: String(row[0] || '').trim(),
              goLiveStatus: String(row[1] || '').trim(),
              projectStatus: String(row[2] || '').trim(),
              estimatedGoLiveDate: String(row[3] || '').trim(),
            });
          }
        }

        setExcelData(parsedData);
        setFileUploaded(true);
        toast.success(`Loaded ${parsedData.length} rows from Excel`);
      } catch (error) {
        console.error('Error parsing Excel:', error);
        toast.error('Failed to parse Excel file');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, customer_name, planned_go_live_date, current_status, churn_risk')
        .order('customer_name');

      if (error) throw error;

      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const performMatching = (projectList: any[]) => {
    const matched: ProjectMatch[] = excelData.map(row => {
      const bestMatch = findBestMatch(row.customer, projectList);
      return {
        excelRow: row,
        matchedProject: bestMatch.project,
        confidence: bestMatch.confidence,
      };
    });

    setMatches(matched);
  };

  const findBestMatch = (excelName: string, projectList: any[]) => {
    const normalizedExcel = normalizeString(excelName);
    let bestMatch: any = null;
    let bestScore = 0;
    let confidence: 'high' | 'medium' | 'low' | 'none' = 'none';

    projectList.forEach(project => {
      const normalizedCustomer = normalizeString(project.customer_name || '');
      const normalizedProject = normalizeString(project.name || '');

      const customerScore = calculateSimilarity(normalizedExcel, normalizedCustomer);
      const projectScore = calculateSimilarity(normalizedExcel, normalizedProject);
      const score = Math.max(customerScore, projectScore);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = project;
      }
    });

    if (bestScore > 0.8) confidence = 'high';
    else if (bestScore > 0.6) confidence = 'medium';
    else if (bestScore > 0.4) confidence = 'low';
    else confidence = 'none';

    return { project: bestMatch, confidence };
  };

  const normalizeString = (str: string) => {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };

  const calculateSimilarity = (str1: string, str2: string) => {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;
    
    // Check if one contains the other
    if (str1.includes(str2) || str2.includes(str1)) {
      return 0.85;
    }

    // Simple word overlap scoring
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    const overlap = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2))).length;
    return overlap / Math.max(words1.length, words2.length);
  };

  const handleApplyUpdates = async () => {
    setUpdating(true);
    let successCount = 0;
    let errorCount = 0;

    for (const match of matches) {
      if (!match.matchedProject) continue;

      const currentStatus = [
        match.excelRow.goLiveStatus,
        match.excelRow.projectStatus
      ].filter(Boolean).join(' - ');

      let plannedGoLiveDate: string | null = null;
      if (match.excelRow.estimatedGoLiveDate) {
        const parsed = parseUKDate(match.excelRow.estimatedGoLiveDate);
        if (parsed) {
          plannedGoLiveDate = toISODateString(parsed);
        }
      }

      const updates: any = {};
      if (currentStatus) updates.current_status = currentStatus;
      if (plannedGoLiveDate) updates.planned_go_live_date = plannedGoLiveDate;

      // Set churn risk for churned customers
      if (match.excelRow.goLiveStatus.toLowerCase() === 'churn') {
        updates.churn_risk = 'Certain';
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('projects')
          .update(updates)
          .eq('id', match.matchedProject.id);

        if (error) {
          console.error('Error updating project:', error);
          errorCount++;
        } else {
          successCount++;
        }
      }
    }

    setUpdating(false);
    toast.success(`Updated ${successCount} projects${errorCount > 0 ? `, ${errorCount} errors` : ''}`);
    fetchProjects();
  };

  const getConfidenceBadge = (confidence: string) => {
    const variants: any = {
      high: 'default',
      medium: 'secondary',
      low: 'outline',
      none: 'destructive',
    };
    return <Badge variant={variants[confidence]}>{confidence}</Badge>;
  };

  if (loading) {
    return <div className="p-8">Loading projects...</div>;
  }

  if (!fileUploaded) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">Bulk Update Account Info</h1>
        <Card>
          <CardHeader>
            <CardTitle>Upload Excel File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Upload an Excel file with the following columns:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Column A: Customer Contracts (project name)</li>
              <li>Column B: Go Live Status</li>
              <li>Column C: Project Status</li>
              <li>Column D: Estimated Go Live Date</li>
            </ul>
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Excel File
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const highConfidenceMatches = matches.filter(m => m.confidence === 'high' && m.matchedProject);
  const needsReview = matches.filter(m => m.confidence !== 'high' || !m.matchedProject);

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bulk Update Account Info</h1>
          <p className="text-muted-foreground mt-2">
            Review and apply account info updates from Excel data ({excelData.length} rows loaded)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setFileUploaded(false);
              setExcelData([]);
              setMatches([]);
            }}
            variant="outline"
          >
            Upload Different File
          </Button>
          <Button
            onClick={handleApplyUpdates}
            disabled={updating || highConfidenceMatches.length === 0}
            size="lg"
          >
            {updating ? 'Updating...' : `Apply ${highConfidenceMatches.length} Updates`}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              High Confidence Matches ({highConfidenceMatches.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {highConfidenceMatches.map((match, idx) => (
              <div key={idx} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{match.excelRow.customer}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      → {match.matchedProject?.customer_name} - {match.matchedProject?.name}
                    </div>
                  </div>
                  {getConfidenceBadge(match.confidence)}
                </div>
                <div className="text-xs space-y-1 bg-muted/50 p-2 rounded">
                  {match.excelRow.goLiveStatus && (
                    <div><strong>Go Live Status:</strong> {match.excelRow.goLiveStatus}</div>
                  )}
                  {match.excelRow.projectStatus && (
                    <div><strong>Project Status:</strong> {match.excelRow.projectStatus}</div>
                  )}
                  {match.excelRow.estimatedGoLiveDate && (
                    <div><strong>Est. Go Live:</strong> {match.excelRow.estimatedGoLiveDate}</div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Needs Review ({needsReview.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {needsReview.map((match, idx) => (
              <div key={idx} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{match.excelRow.customer}</div>
                    {match.matchedProject ? (
                      <div className="text-xs text-muted-foreground mt-1">
                        → {match.matchedProject?.customer_name} - {match.matchedProject?.name}
                      </div>
                    ) : (
                      <div className="text-xs text-destructive mt-1 flex items-center gap-1">
                        <X className="h-3 w-3" /> No match found
                      </div>
                    )}
                  </div>
                  {getConfidenceBadge(match.confidence)}
                </div>
                <div className="text-xs space-y-1 bg-muted/50 p-2 rounded">
                  {match.excelRow.goLiveStatus && (
                    <div><strong>Go Live Status:</strong> {match.excelRow.goLiveStatus}</div>
                  )}
                  {match.excelRow.projectStatus && (
                    <div><strong>Project Status:</strong> {match.excelRow.projectStatus}</div>
                  )}
                  {match.excelRow.estimatedGoLiveDate && (
                    <div><strong>Est. Go Live:</strong> {match.excelRow.estimatedGoLiveDate}</div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BulkUpdateAccountInfo;
