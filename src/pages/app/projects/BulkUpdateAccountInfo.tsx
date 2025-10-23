import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Check, X, AlertCircle } from 'lucide-react';
import { parseUKDate, toISODateString } from '@/lib/dateUtils';

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

const excelData: ExcelRow[] = [
  { customer: "Aquascot Phase 1 Label Validation Riverside", goLiveStatus: "Not live", projectStatus: "All models required Retraining due to camera move.", estimatedGoLiveDate: "1/11/2025" },
  { customer: "Becketts Foods Ltd - Vision AI Label Validation & Meat Quality 13 Lines", goLiveStatus: "Implementation Phase", projectStatus: "New Project", estimatedGoLiveDate: "21/01/2025" },
  { customer: "Berry Ardeer +3 machines", goLiveStatus: "Churn", projectStatus: "", estimatedGoLiveDate: "" },
  { customer: "Butlers Farmhouse Cheeses - FRD Consultancy", goLiveStatus: "Complete", projectStatus: "", estimatedGoLiveDate: "" },
  { customer: "Butlers Farmhouse Cheeses Vision AI - 2 Lines", goLiveStatus: "Not live", projectStatus: "All models required Retraining due to camera move and Brownie (Angled Product)", estimatedGoLiveDate: "30/01/2025" },
  { customer: "Butternut Box - Label Validation + Core 2 Lines", goLiveStatus: "Implementation Phase", projectStatus: "Installation", estimatedGoLiveDate: "30/01/2025" },
  { customer: "Cranswick Watton Site - Label Validation 1 Line", goLiveStatus: "Semi Live - testing", projectStatus: "(Multi products in a basket resolved)", estimatedGoLiveDate: "10/11/2025" },
  { customer: "Delifrance (UK) Ltd Vision AI - 1 x M&S Sour Dough Ball Line", goLiveStatus: "Semi live -Counts, Length, Width & Height active", projectStatus: "Pending Features", estimatedGoLiveDate: "23/11/2025" },
  { customer: "Finsbury Foods Vision Project: 2 Camera Caterpillar Line Memory Lane Cakes Cardiff", goLiveStatus: "Not Live", projectStatus: "MwH (3rd party building Robot. All models were trained, but require retraining for Brownie", estimatedGoLiveDate: "1/12/2025" },
  { customer: "Hilton Foods Meat - Vision - Label Validation - 32 Lines", goLiveStatus: "Semi Live", projectStatus: "All models require retraining for Brownie", estimatedGoLiveDate: "15/01/2025" },
  { customer: "Kendal - Core - Phase 1 Main Canning Line", goLiveStatus: "Live", projectStatus: "", estimatedGoLiveDate: "" },
  { customer: "Kernow Coatings Core System", goLiveStatus: "Churn", projectStatus: "", estimatedGoLiveDate: "" },
  { customer: "Kettle Produce Ltd - Label Validation Phase 1 - 7 Lines (28 Lines phase 2)", goLiveStatus: "Implementation Phase", projectStatus: "Go live for 1 line & 6 product mid december", estimatedGoLiveDate: "15/01/2025" },
  { customer: "McColgans Core & Vision", goLiveStatus: "Core is live - Vision in implementation", projectStatus: "Vision installation", estimatedGoLiveDate: "1/1/2025" },
  { customer: "Oldershaw Group (Moulton Bulb Co) Site Core and Vision Lines 14 / 15 / 16 Phase 1", goLiveStatus: "Live with IoT and Grader Solution. Line 14, 15 & 16 vision solution in implementation", projectStatus: "Proceding with phase 3 of implementation", estimatedGoLiveDate: "15/12/2025" },
  { customer: "Park Cakes (Caterpillar Cake Spec Check) 4 Lines", goLiveStatus: "Implementation Phase", projectStatus: "", estimatedGoLiveDate: "15/01/2025" },
  { customer: "Quin Global UK 8 Lines Core & Vision 1 Camera", goLiveStatus: "Live (Energy monitoring & mixing solutions still required, pending customer information)", projectStatus: "(Energy monitoring & mixing solutions still required, pending customer information)", estimatedGoLiveDate: "" },
  { customer: "R & G Herbs Herb Dimensions and Label Validation", goLiveStatus: "Customer ERP project over running - no resource available for implementation.", projectStatus: "", estimatedGoLiveDate: "1/3/2026" },
  { customer: "Radnor Hills 2 x Site Core System", goLiveStatus: "Live", projectStatus: "", estimatedGoLiveDate: "" },
  { customer: "Silafrica Kenya Renewal Uplift", goLiveStatus: "Live", projectStatus: "", estimatedGoLiveDate: "" },
  { customer: "Silafrica Tanzania", goLiveStatus: "Live", projectStatus: "", estimatedGoLiveDate: "" },
  { customer: "Sofina Foods - Allergen label validation - 12 Lines", goLiveStatus: "Sofina Hull live by next friday, Malton being rescoped, Fraserborough yet to be scoped", projectStatus: "", estimatedGoLiveDate: "31/10/2025" },
  { customer: "Stonegate Farmers (Vision Phase 2) - 4 additional cameras", goLiveStatus: "", projectStatus: "", estimatedGoLiveDate: "" },
  { customer: "Stonegate Farmers Ltd PS for X Ray trial", goLiveStatus: "", projectStatus: "", estimatedGoLiveDate: "" },
  { customer: "Stonegate Farmers Ltd Vision (Phase 1)", goLiveStatus: "Testing/Acceptance phase", projectStatus: "", estimatedGoLiveDate: "" },
  { customer: "The Village Bakery Ltd - Vision & Core", goLiveStatus: "Live - (just tablets require from customer side for pancake line adoption/DT entry)", projectStatus: "", estimatedGoLiveDate: "" },
  { customer: "Vitacress Herbs 16 Lines Core Chichester Site", goLiveStatus: "Live", projectStatus: "", estimatedGoLiveDate: "" },
  { customer: "Yorkshire Premier Meat Ltd Label Validation and OEE Vision", goLiveStatus: "Live", projectStatus: "", estimatedGoLiveDate: "" },
  { customer: "Zertus Group - Vision & Core Opp", goLiveStatus: "Project being rescoped", projectStatus: "", estimatedGoLiveDate: "" },
];

const BulkUpdateAccountInfo = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [matches, setMatches] = useState<ProjectMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchProjectsAndMatch();
  }, []);

  const fetchProjectsAndMatch = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, customer_name, planned_go_live_date, current_status, churn_risk')
        .order('customer_name');

      if (error) throw error;

      setProjects(data || []);
      performMatching(data || []);
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
    fetchProjectsAndMatch();
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

  const highConfidenceMatches = matches.filter(m => m.confidence === 'high' && m.matchedProject);
  const needsReview = matches.filter(m => m.confidence !== 'high' || !m.matchedProject);

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bulk Update Account Info</h1>
          <p className="text-muted-foreground mt-2">
            Review and apply account info updates from Excel data
          </p>
        </div>
        <Button
          onClick={handleApplyUpdates}
          disabled={updating || highConfidenceMatches.length === 0}
          size="lg"
        >
          {updating ? 'Updating...' : `Apply ${highConfidenceMatches.length} Updates`}
        </Button>
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
