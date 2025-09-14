import { useState, useEffect } from 'react';
import { Upload, FileSpreadsheet, Calendar, TrendingUp, AlertTriangle, CheckCircle2, Plus, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface BAUWeeklyReviewsTabProps {
  customerId: string;
}

interface WeeklyUpload {
  id: string;
  storage_path: string;
  uploaded_at: string;
  processed_at: string | null;
  notes: string | null;
}

interface WeeklyMetric {
  id: string;
  date_from: string;
  date_to: string;
  metric_key: string;
  metric_value_numeric: number | null;
  metric_value_text: string | null;
  created_at: string;
}

interface WeeklyReview {
  id: string;
  date_from: string;
  date_to: string;
  health: 'green' | 'red';
  escalation: string | null;
  reviewed_at: string;
  reviewed_by: string;
}

export const BAUWeeklyReviewsTab = ({ customerId }: BAUWeeklyReviewsTabProps) => {
  const [uploads, setUploads] = useState<WeeklyUpload[]>([]);
  const [metrics, setMetrics] = useState<WeeklyMetric[]>([]);
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('upload');
  
  // Review form state
  const [reviewDateFrom, setReviewDateFrom] = useState('');
  const [reviewDateTo, setReviewDateTo] = useState('');
  const [reviewHealth, setReviewHealth] = useState<'green' | 'red'>('green');
  const [reviewEscalation, setReviewEscalation] = useState('');

  const { toast } = useToast();
  const { user, isInternalAdmin } = useAuth();

  useEffect(() => {
    loadData();
  }, [customerId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load weekly metrics for this customer
      const { data: metricsData, error: metricsError } = await supabase
        .from('bau_weekly_metrics')
        .select('*')
        .eq('bau_customer_id', customerId)
        .order('date_to', { ascending: false });

      if (metricsError) throw metricsError;
      setMetrics(metricsData || []);

      // Load weekly reviews for this customer
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('bau_weekly_reviews')
        .select('*')
        .eq('bau_customer_id', customerId)
        .order('date_to', { ascending: false });

      if (reviewsError) throw reviewsError;
      setReviews(reviewsData || []);

      // Load uploads (only if internal)
      if (isInternalAdmin) {
        const { data: uploadsData, error: uploadsError } = await supabase
          .from('bau_weekly_uploads')
          .select('*')
          .order('uploaded_at', { ascending: false })
          .limit(10);

        if (uploadsError) throw uploadsError;
        setUploads(uploadsData || []);
      }
    } catch (error) {
      console.error('Error loading weekly data:', error);
      toast({
        title: "Error",
        description: "Failed to load weekly review data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: "Invalid File",
        description: "Please upload an Excel file (.xlsx or .xls)",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      
      // Generate a unique filename
      const timestamp = new Date().toISOString().slice(0, 10);
      const fileName = `${timestamp}-${file.name}`;
      const filePath = `${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('bau-weekly-uploads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Register the upload in database
      const { data: uploadRecord, error: dbError } = await supabase
        .from('bau_weekly_uploads')
        .insert({
          storage_path: filePath,
          uploaded_by: user?.id,
          notes: `Upload for BAU customer ${customerId}`
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Call the edge function to process the file
      const { data: processResult, error: processError } = await supabase.functions
        .invoke('bau-weekly-import', {
          body: {
            path: filePath,
            upload_id: uploadRecord.id
          }
        });

      if (processError) throw processError;

      toast({
        title: "Success",
        description: `File uploaded and processed. ${processResult.processedRows} rows processed, ${processResult.totalMetrics} metrics imported.`,
      });

      // Reload data
      loadData();

      // Reset file input
      event.target.value = '';
      
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "Failed to upload and process file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewDateFrom || !reviewDateTo) {
      toast({
        title: "Missing Information",
        description: "Please select date range",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.rpc('set_bau_weekly_review', {
        p_bau_customer_id: customerId,
        p_date_from: reviewDateFrom,
        p_date_to: reviewDateTo,
        p_health: reviewHealth,
        p_escalation: reviewEscalation || null
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Weekly review saved",
      });

      // Reset form
      setReviewDateFrom('');
      setReviewDateTo('');
      setReviewHealth('green');
      setReviewEscalation('');

      // Reload data
      loadData();
    } catch (error) {
      console.error('Error saving review:', error);
      toast({
        title: "Error",
        description: "Failed to save weekly review",
        variant: "destructive",
      });
    }
  };

  // Group metrics by week
  const weeklyMetricsGrouped = metrics.reduce((acc, metric) => {
    const weekKey = `${metric.date_from}_${metric.date_to}`;
    if (!acc[weekKey]) {
      acc[weekKey] = {
        dateFrom: metric.date_from,
        dateTo: metric.date_to,
        metrics: []
      };
    }
    acc[weekKey].metrics.push(metric);
    return acc;
  }, {} as Record<string, { dateFrom: string; dateTo: string; metrics: WeeklyMetric[] }>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload">Upload Excel</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Weekly Excel Upload
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Upload Weekly Metrics</h3>
                <p className="text-muted-foreground mb-4">
                  Excel format: Column 1 = Date From, Column 2 = Date To, Column 3 = Customer Name, 
                  Columns 4+ = Metrics (Uptime %, Calls, Incidents, etc.)
                </p>
                <Label htmlFor="excel-upload" className="cursor-pointer">
                  <Button disabled={uploading} className="mb-2">
                    {uploading ? 'Processing...' : 'Choose Excel File'}
                  </Button>
                </Label>
                <Input
                  id="excel-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {isInternalAdmin && uploads.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Recent Uploads</h4>
                  <div className="space-y-2">
                    {uploads.slice(0, 5).map((upload) => (
                      <div key={upload.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="font-medium">{upload.storage_path}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(upload.uploaded_at), 'MMM d, yyyy HH:mm')}
                          </div>
                        </div>
                        <Badge variant={upload.processed_at ? "default" : "secondary"}>
                          {upload.processed_at ? "Processed" : "Pending"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Weekly Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.entries(weeklyMetricsGrouped).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No metrics data available. Upload an Excel file to get started.
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(weeklyMetricsGrouped).map(([weekKey, week]) => (
                    <div key={weekKey} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">
                        Week: {format(new Date(week.dateFrom), 'MMM d')} - {format(new Date(week.dateTo), 'MMM d, yyyy')}
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {week.metrics.map((metric) => (
                          <Card key={metric.id}>
                            <CardContent className="p-3">
                              <div className="text-sm text-muted-foreground">{metric.metric_key}</div>
                              <div className="text-lg font-semibold">
                                {metric.metric_value_numeric !== null 
                                  ? metric.metric_value_numeric.toLocaleString()
                                  : metric.metric_value_text
                                }
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews">
          <div className="space-y-6">
            {/* Create New Review */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create Weekly Review
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date-from">Date From</Label>
                    <Input
                      id="date-from"
                      type="date"
                      value={reviewDateFrom}
                      onChange={(e) => setReviewDateFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="date-to">Date To</Label>
                    <Input
                      id="date-to"
                      type="date"
                      value={reviewDateTo}
                      onChange={(e) => setReviewDateTo(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="health">Health Status</Label>
                  <Select value={reviewHealth} onValueChange={(value: 'green' | 'red') => setReviewHealth(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="green">Green (Good)</SelectItem>
                      <SelectItem value="red">Red (Issues)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="escalation">Escalation Notes (Optional)</Label>
                  <Textarea
                    id="escalation"
                    placeholder="Any issues, concerns, or escalation notes..."
                    value={reviewEscalation}
                    onChange={(e) => setReviewEscalation(e.target.value)}
                  />
                </div>

                <Button onClick={handleSubmitReview}>
                  Save Weekly Review
                </Button>
              </CardContent>
            </Card>

            {/* Previous Reviews */}
            <Card>
              <CardHeader>
                <CardTitle>Previous Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                {reviews.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No reviews yet. Create your first weekly review above.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Week</TableHead>
                        <TableHead>Health</TableHead>
                        <TableHead>Escalation</TableHead>
                        <TableHead>Reviewed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reviews.map((review) => (
                        <TableRow key={review.id}>
                          <TableCell>
                            {format(new Date(review.date_from), 'MMM d')} - {format(new Date(review.date_to), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {review.health === 'green' ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                              )}
                              <Badge variant={review.health === 'green' ? 'default' : 'destructive'}>
                                {review.health === 'green' ? 'Good' : 'Issues'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {review.escalation ? (
                              <div className="max-w-xs truncate">{review.escalation}</div>
                            ) : (
                              <span className="text-muted-foreground">None</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(review.reviewed_at), 'MMM d, yyyy')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Trend Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Trend charts and analysis will be available once you have uploaded multiple weeks of data.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};