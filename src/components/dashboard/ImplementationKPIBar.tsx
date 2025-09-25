import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { loadWeeklyStats } from "@/lib/implementationWeekly";

interface ImplementationKPIBarProps {
  selectedWeek: string;
}

export function ImplementationKPIBar({ selectedWeek }: ImplementationKPIBarProps) {
  const statsQ = useQuery({
    queryKey: ["impl-stats", selectedWeek],
    queryFn: () => {
      console.log('Loading stats for week:', selectedWeek);
      return selectedWeek ? loadWeeklyStats(selectedWeek) : Promise.resolve(null);
    },
    enabled: !!selectedWeek,
    staleTime: 5 * 60 * 1000,
  });

  console.log('KPI Bar - selectedWeek:', selectedWeek, 'statsData:', statsQ.data, 'loading:', statsQ.isLoading, 'error:', statsQ.error);

  if (!selectedWeek) {
    return (
      <Card className="p-4">
        <div className="text-center text-muted-foreground">
          No week selected for KPI display
        </div>
      </Card>
    );
  }

  if (statsQ.isLoading) {
    return (
      <Card className="p-4">
        <div className="text-center text-muted-foreground">
          Loading KPI data for week {selectedWeek}...
        </div>
      </Card>
    );
  }

  if (statsQ.error) {
    return (
      <Card className="p-4">
        <div className="text-center text-destructive">
          Error loading KPI data: {(statsQ.error as Error).message}
        </div>
      </Card>
    );
  }

  if (!statsQ.data) {
    return (
      <Card className="p-4">
        <div className="text-center text-muted-foreground">
          No KPI data available for week {selectedWeek}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {statsQ.data?.total_companies || 0}
          </div>
          <div className="text-sm text-muted-foreground">Total Companies</div>
        </div>
        
        <div className="text-center">
          <div className="text-lg">
            <span className="text-green-600 font-semibold">
              {statsQ.data?.on_track || 0}
            </span>
            {" / "}
            <span className="text-red-600 font-semibold">
              {statsQ.data?.off_track || 0}
            </span>
            {" / "}
            <span className="text-gray-500">
              {statsQ.data?.no_status || 0}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">On Track / Off Track / No Status</div>
        </div>
        
        <div className="text-center">
          <div className="text-lg">
            <span className="text-green-600 font-semibold">
              {statsQ.data?.green_health || 0}
            </span>
            {" / "}
            <span className="text-red-600 font-semibold">
              {statsQ.data?.red_health || 0}
            </span>
            {" / "}
            <span className="text-gray-500">
              {statsQ.data?.no_health || 0}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">Green Health / Red Health / No Health</div>
        </div>
        
        <div className="text-center">
          <div className="text-lg">
            <span className="text-green-600 font-semibold">
              {statsQ.data ? (() => { 
                const assigned = (statsQ.data.green_health + statsQ.data.red_health); 
                return assigned > 0 ? Math.round((statsQ.data.green_health / assigned) * 100) : 0; 
              })() : 0}%
            </span>
          </div>
          <div className="text-sm text-muted-foreground">Overall Health</div>
        </div>
        
        <div className="text-center">
          <div className="text-lg">
            <span className="text-green-600 font-semibold">
              {statsQ.data ? (() => { 
                const assigned = (statsQ.data.on_track + statsQ.data.off_track); 
                return assigned > 0 ? Math.round((statsQ.data.on_track / assigned) * 100) : 0; 
              })() : 0}%
            </span>
          </div>
          <div className="text-sm text-muted-foreground">Projects on Track</div>
        </div>
      </div>
    </Card>
  );
}