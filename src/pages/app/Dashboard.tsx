import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatDateUK } from '@/lib/dateUtils';

interface Company {
  id: string;
  name: string;
  is_internal: boolean;
  project_count: number;
}

interface ProjectEvent {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  is_critical: boolean;
  project: {
    name: string;
    company: {
      name: string;
    };
  };
}

export const Dashboard = () => {
  const { profile } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate 7-day date range (previous 2 days, today, next 4 days)
  const generateDateRange = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = -2; i <= 4; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  };

  const dateRange = generateDateRange();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch companies with project counts
        const { data: companiesData, error: companiesError } = await supabase
          .from('companies')
          .select(`
            id,
            name,
            is_internal,
            projects(count)
          `);

        if (companiesError) throw companiesError;

        const companiesWithCounts = companiesData?.map(company => ({
          id: company.id,
          name: company.name,
          is_internal: company.is_internal,
          project_count: company.projects?.[0]?.count || 0
        })) || [];

        setCompanies(companiesWithCounts);

        // Fetch events for the 7-day range
        const startDate = dateRange[0].toISOString().split('T')[0];
        const endDate = dateRange[dateRange.length - 1].toISOString().split('T')[0];

        const { data: eventsData, error: eventsError } = await supabase
          .from('project_events')
          .select(`
            id,
            title,
            start_date,
            end_date,
            is_critical,
            project_id
          `)
          .or(`start_date.gte.${startDate},end_date.gte.${startDate}`)
          .or(`start_date.lte.${endDate},end_date.lte.${endDate}`);

        if (eventsError) throw eventsError;

        // Fetch project and company data separately
        const projectIds = [...new Set(eventsData?.map(event => event.project_id) || [])];
        
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select(`
            id,
            name,
            company_id,
            companies!inner(
              name
            )
          `)
          .in('id', projectIds);

        if (projectsError) throw projectsError;

        // Create a map of projects for quick lookup
        const projectsMap = new Map(projectsData?.map(project => [
          project.id, 
          {
            name: project.name,
            company: {
              name: (project.companies as any).name
            }
          }
        ]) || []);

        const formattedEvents = eventsData?.map(event => ({
          id: event.id,
          title: event.title,
          start_date: event.start_date,
          end_date: event.end_date,
          is_critical: event.is_critical,
          project: projectsMap.get(event.project_id) || {
            name: 'Unknown Project',
            company: { name: 'Unknown Company' }
          }
        })) || [];

        setEvents(formattedEvents);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => {
      return dateStr >= event.start_date && dateStr <= event.end_date;
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Client overview and upcoming events
        </p>
      </div>
      
      {/* 7-Day Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Events</CardTitle>
          <CardDescription>Events across all projects for the next 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {dateRange.map((date, index) => {
              const dayEvents = getEventsForDate(date);
              const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' });
              const dayNumber = date.getDate();
              
              return (
                <div
                  key={index}
                  className={`p-3 border rounded-lg min-h-[120px] ${
                    isToday(date) ? 'bg-primary/5 border-primary' : ''
                  }`}
                >
                  <div className="text-center mb-2">
                    <div className="text-xs text-muted-foreground">{dayName}</div>
                    <div className={`text-sm font-medium ${isToday(date) ? 'text-primary' : ''}`}>
                      {dayNumber}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        className={`text-xs p-1 rounded text-left ${
                          event.is_critical 
                            ? 'bg-destructive/10 text-destructive border border-destructive/20' 
                            : 'bg-primary/10 text-primary border border-primary/20'
                        }`}
                      >
                        <div className="font-medium truncate" title={event.title}>
                          {event.title}
                        </div>
                        <div className="text-muted-foreground truncate" title={event.project.company.name}>
                          {event.project.company.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Client Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Client Summary</CardTitle>
          <CardDescription>Overview of all clients and their projects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {companies.map((company) => (
              <div key={company.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{company.name}</h3>
                  <Badge variant={company.is_internal ? 'default' : 'outline'}>
                    {company.is_internal ? 'Internal' : 'External'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {company.project_count} project{company.project_count !== 1 ? 's' : ''}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;