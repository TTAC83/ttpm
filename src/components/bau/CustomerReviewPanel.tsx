import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, TrendingUp, Calendar, UserPlus, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  getCustomerKPIs, 
  getCustomerReview, 
  saveReview,
  CustomerWithHealth, 
  WeekOption 
} from '@/lib/bauWeeklyService';
import { TrendDrawer } from './TrendDrawer';

interface CustomerReviewPanelProps {
  customer: CustomerWithHealth | null;
  selectedWeek: WeekOption | null;
  onNext: () => void;
  hasNext: boolean;
}

export const CustomerReviewPanel: React.FC<CustomerReviewPanelProps> = ({
  customer,
  selectedWeek,
  onNext,
  hasNext
}) => {
  const [health, setHealth] = useState<'green' | 'red'>('green');
  const [escalation, setEscalation] = useState('');
  const [trendDrawer, setTrendDrawer] = useState<{
    isOpen: boolean;
    metricKey: string;
  }>({
    isOpen: false,
    metricKey: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch KPIs for current customer and week
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['customer-kpis', customer?.id, selectedWeek?.date_from, selectedWeek?.date_to],
    queryFn: () => customer && selectedWeek ? getCustomerKPIs(
      customer.id, 
      selectedWeek.date_from, 
      selectedWeek.date_to
    ) : Promise.resolve([]),
    enabled: !!customer && !!selectedWeek,
  });

  // Fetch existing review for current customer and week
  const { data: existingReview } = useQuery({
    queryKey: ['customer-review', customer?.id, selectedWeek?.date_from, selectedWeek?.date_to],
    queryFn: () => customer && selectedWeek ? getCustomerReview(
      customer.id, 
      selectedWeek.date_from, 
      selectedWeek.date_to
    ) : Promise.resolve(null),
    enabled: !!customer && !!selectedWeek,
  });

  // Update form state when customer or existing review changes
  useEffect(() => {
    if (existingReview) {
      setHealth(existingReview.health);
      setEscalation(existingReview.escalation || '');
    } else {
      setHealth('green');
      setEscalation('');
    }
  }, [existingReview, customer?.id]);

  // Save review mutation
  const saveReviewMutation = useMutation({
    mutationFn: saveReview,
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: ['bau-customers-week-health'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['customer-review'] 
      });
      
      toast({
        title: "Review Saved",
        description: `Saved review for ${customer?.name}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save review: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleSave = async () => {
    if (!customer || !selectedWeek) return;

    await saveReviewMutation.mutateAsync({
      customerId: customer.id,
      weekFrom: selectedWeek.date_from,
      weekTo: selectedWeek.date_to,
      health,
      escalation
    });
  };

  const handleSaveAndNext = async () => {
    await handleSave();
    if (hasNext) {
      onNext();
    }
  };

  const openTrendDrawer = (metricKey: string) => {
    setTrendDrawer({ isOpen: true, metricKey });
  };

  const closeTrendDrawer = () => {
    setTrendDrawer({ isOpen: false, metricKey: '' });
  };

  if (!customer || !selectedWeek) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Select a customer to view their review panel
      </div>
    );
  }

  // Filter to show only the 3 requested KPIs - matching actual database metric names
  const allowedKPIs = [
    'Jobs over 150% Complete',  // This is the actual metric name in the database
    'Percentage of Uncategorized',  // This matches the database
    'Unclassified Time'  // This is the closest match for unclassified time
  ];
  
  const numericKPIs = kpis?.filter(k => 
    k.metric_value_numeric !== null && 
    allowedKPIs.includes(k.metric_key)
  ) || [];
  
  const textKPIs = kpis?.filter(k => 
    k.metric_value_text !== null && 
    k.metric_value_numeric === null &&
    allowedKPIs.includes(k.metric_key)
  ) || [];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">{customer.name}</h2>
          {customer.site_name && (
            <p className="text-muted-foreground">{customer.site_name}</p>
          )}
          {customer.company_name && (
            <p className="text-sm text-muted-foreground">{customer.company_name}</p>
          )}
          <p className="text-sm font-medium text-primary">
            Week: {new Date(selectedWeek.date_from).toLocaleDateString()} - {new Date(selectedWeek.date_to).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* KPI Cards */}
        <div>
          <h3 className="text-lg font-medium mb-4">Key Performance Indicators</h3>
          
          {kpisLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : numericKPIs.length === 0 && textKPIs.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No KPI data available for this week
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Numeric KPIs as cards */}
              {numericKPIs.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {numericKPIs.map((kpi) => {
                    // Determine card styling based on KPI values
                    const getCardStyle = () => {
                      if (kpi.metric_key === 'Jobs over 150% Complete' && (kpi.metric_value_numeric || 0) > 1) {
                        return 'border-destructive bg-destructive/5';
                      }
                      if (kpi.metric_key === 'Percentage of Uncategorized') {
                        const percentage = (kpi.metric_value_numeric || 0) * 100;
                        if (percentage > 25) {
                          return 'border-destructive bg-destructive/5';
                        } else {
                          return 'border-green-500 bg-green-500/5';
                        }
                      }
                      return '';
                    };

                    // Format the display value
                    const getDisplayValue = () => {
                      if (kpi.metric_key === 'Percentage of Uncategorized') {
                        return `${((kpi.metric_value_numeric || 0) * 100).toFixed(1)}%`;
                      }
                      return kpi.metric_value_numeric?.toLocaleString() || 'N/A';
                    };

                    return (
                      <Card key={kpi.metric_key} className={`cursor-pointer hover:shadow-md transition-shadow ${getCardStyle()}`}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            {kpi.metric_key}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold">
                              {getDisplayValue()}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openTrendDrawer(kpi.metric_key)}
                              className="text-primary hover:text-primary"
                            >
                              <TrendingUp className="h-4 w-4" />
                            </Button>
                          </div>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => openTrendDrawer(kpi.metric_key)}
                            className="p-0 h-auto text-xs text-muted-foreground hover:text-primary"
                          >
                            View trend
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Text KPIs as chips */}
              {textKPIs.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Additional Metrics</h4>
                  <div className="flex flex-wrap gap-2">
                    {textKPIs.map((kpi) => (
                      <Badge key={kpi.metric_key} variant="outline" className="text-sm">
                        {kpi.metric_key}: {kpi.metric_value_text}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Health Selector */}
        <div>
          <h3 className="text-lg font-medium mb-4">Customer Health</h3>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <ToggleGroup
                  type="single"
                  value={health}
                  onValueChange={(value) => value && setHealth(value as 'green' | 'red')}
                  className="justify-start"
                >
                  <ToggleGroupItem value="green" className="data-[state=on]:bg-green-500 data-[state=on]:text-white">
                    Green
                  </ToggleGroupItem>
                  <ToggleGroupItem value="red" className="data-[state=on]:bg-destructive data-[state=on]:text-destructive-foreground">
                    Red
                  </ToggleGroupItem>
                </ToggleGroup>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Escalation Notes (optional)
                  </label>
                  <Textarea
                    value={escalation}
                    onChange={(e) => setEscalation(e.target.value)}
                    placeholder="Add any escalation notes or concerns..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div>
          <h3 className="text-lg font-medium mb-4">Actions</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Create Action
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule Meeting
            </Button>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="border-t bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {existingReview ? 'Review already saved' : 'Unsaved changes'}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={saveReviewMutation.isPending}
              variant="outline"
            >
              {saveReviewMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
            {hasNext && (
              <Button
                onClick={handleSaveAndNext}
                disabled={saveReviewMutation.isPending}
                className="flex items-center gap-2"
              >
                {saveReviewMutation.isPending ? 'Saving...' : 'Save & Next'}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Trend Drawer */}
      <TrendDrawer
        isOpen={trendDrawer.isOpen}
        onClose={closeTrendDrawer}
        customerId={customer.id}
        metricKey={trendDrawer.metricKey}
        customerName={customer.name}
      />
    </div>
  );
};