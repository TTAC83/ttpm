import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Users, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { WeekSelector } from '@/components/bau/WeekSelector';
import { CustomerNavigator } from '@/components/bau/CustomerNavigator';
import { CustomerReviewPanel } from '@/components/bau/CustomerReviewPanel';
import { 
  WeekOption, 
  CustomerWithHealth, 
  createOrOpenWeeklyMeeting,
  getWeekSummary,
  listWeeks
} from '@/lib/bauWeeklyService';

export const WeeklyReview = () => {
  const [selectedWeek, setSelectedWeek] = useState<WeekOption | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithHealth | null>(null);
  const [customers, setCustomers] = useState<CustomerWithHealth[]>([]);
  
  const { toast } = useToast();

  // Load available weeks and set default to latest
  const { data: weeks } = useQuery({
    queryKey: ['bau-weeks'],
    queryFn: listWeeks,
  });

  // Set default week when weeks load
  useEffect(() => {
    if (weeks && weeks.length > 0 && !selectedWeek) {
      setSelectedWeek(weeks[0]);
    }
  }, [weeks, selectedWeek]);

  // Get week summary for footer stats
  const { data: weekSummary } = useQuery({
    queryKey: ['week-summary', selectedWeek?.date_from, selectedWeek?.date_to],
    queryFn: () => selectedWeek ? getWeekSummary(selectedWeek.date_from, selectedWeek.date_to) : null,
    enabled: !!selectedWeek,
  });

  const handleWeekChange = (week: WeekOption) => {
    setSelectedWeek(week);
    setSelectedCustomer(null); // Reset selected customer when week changes
  };

  const handleCustomerSelect = (customer: CustomerWithHealth) => {
    setSelectedCustomer(customer);
  };

  const handleCreateOrOpenMeeting = async () => {
    if (!selectedWeek) return;

    try {
      const meeting = await createOrOpenWeeklyMeeting(selectedWeek.date_from, selectedWeek.date_to);
      toast({
        title: "Meeting Created",
        description: `${meeting.title} scheduled for ${new Date(meeting.date).toLocaleDateString()}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create meeting",
        variant: "destructive",
      });
    }
  };

  const handleNext = () => {
    if (!customers || customers.length === 0) return;
    
    const currentIndex = customers.findIndex(c => c.id === selectedCustomer?.id);
    if (currentIndex >= 0 && currentIndex < customers.length - 1) {
      setSelectedCustomer(customers[currentIndex + 1]);
      toast({
        title: "Next Customer",
        description: `Now reviewing ${customers[currentIndex + 1].name}`,
      });
    }
  };

  const hasNext = () => {
    if (!customers || !selectedCustomer) return false;
    const currentIndex = customers.findIndex(c => c.id === selectedCustomer.id);
    return currentIndex >= 0 && currentIndex < customers.length - 1;
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Sticky Header */}
      <Card className="sticky top-0 z-10 rounded-none border-x-0 border-t-0 backdrop-blur-sm bg-background/95">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                BAU Weekly Review
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Review customer health and KPIs for the selected week
              </p>
            </div>
            <div className="flex items-center gap-4">
              <WeekSelector 
                selectedWeek={selectedWeek} 
                onWeekChange={handleWeekChange} 
              />
              <Button 
                onClick={handleCreateOrOpenMeeting}
                disabled={!selectedWeek}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Create / Open Weekly Review Meeting
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left Pane - Customer Navigator */}
        <div className="w-80 border-r bg-muted/30">
          <CustomerNavigator
            selectedWeek={selectedWeek}
            selectedCustomer={selectedCustomer}
            onCustomerSelect={handleCustomerSelect}
          />
        </div>

        {/* Right Pane - Customer Review Panel */}
        <div className="flex-1">
          <CustomerReviewPanel
            customer={selectedCustomer}
            selectedWeek={selectedWeek}
            onNext={handleNext}
            hasNext={hasNext()}
          />
        </div>
      </div>

      {/* Footer */}
      {weekSummary && (
        <Card className="rounded-none border-x-0 border-b-0">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{weekSummary.totalCount} Total</Badge>
                  <Badge variant="default" className="bg-green-500 text-white">
                    {weekSummary.greenCount} Green
                  </Badge>
                  <Badge variant="destructive">{weekSummary.redCount} Red</Badge>
                  <Badge variant="secondary">{weekSummary.unreviewed} Unreviewed</Badge>
                </div>
                <div className="text-muted-foreground">
                  {weekSummary.reviewedCount} of {weekSummary.totalCount} customers reviewed
                </div>
              </div>
              
              <Button variant="outline" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Finish Weekly Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};