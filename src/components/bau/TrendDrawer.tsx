import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, TrendingUp } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getMetricTrend } from '@/lib/bauWeeklyService';

interface TrendDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  metricKey: string;
  customerName: string;
}

export const TrendDrawer: React.FC<TrendDrawerProps> = ({
  isOpen,
  onClose,
  customerId,
  metricKey,
  customerName
}) => {
  const { data: trendData, isLoading, error } = useQuery({
    queryKey: ['metric-trend', customerId, metricKey],
    queryFn: () => getMetricTrend(customerId, metricKey),
    enabled: isOpen && !!customerId && !!metricKey,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const chartData = trendData?.map((point, index) => ({
    week: `W${index + 1}`,
    date: new Date(point.date_to).toLocaleDateString(),
    value: point.metric_value_numeric,
    fullDate: point.date_to
  })) || [];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[500px] sm:w-[600px]">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {metricKey} Trend
              </SheetTitle>
              <SheetDescription>
                Last 8 weeks for {customerName}
              </SheetDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              Error loading trend data: {error.message}
            </div>
          ) : chartData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No historical data available for this metric
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Showing last {chartData.length} weeks of data
              </div>
              
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="week" 
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border rounded-lg shadow-lg p-3">
                              <div className="font-medium">{label}</div>
                              <div className="text-sm text-muted-foreground">
                                {data.date}
                              </div>
                              <div className="text-lg font-semibold text-primary">
                                {payload[0].value}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 4 }}
                      activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Latest Value</div>
                  <div className="font-medium">
                    {chartData[chartData.length - 1]?.value || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Previous Value</div>
                  <div className="font-medium">
                    {chartData[chartData.length - 2]?.value || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};