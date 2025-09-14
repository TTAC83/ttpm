import { supabase } from '@/integrations/supabase/client';

export interface WeekOption {
  date_from: string;
  date_to: string;
  label: string;
}

export interface CustomerWithHealth {
  id: string;
  name: string;
  site_name: string | null;
  health: 'green' | 'red' | null;
  company_name?: string;
}

export interface CustomerKPI {
  metric_key: string;
  metric_value_numeric: number | null;
  metric_value_text: string | null;
}

export interface WeeklyReview {
  bau_customer_id: string;
  date_from: string;
  date_to: string;
  health: 'green' | 'red';
  reason_code?: string | null;
  escalation: string | null;
  reviewed_by: string;
  reviewed_at: string;
}

export interface TrendDataPoint {
  date_to: string;
  metric_value_numeric: number | null;
}

// Get all available weeks from metrics data
export const listWeeks = async (): Promise<WeekOption[]> => {
  const { data, error } = await supabase
    .from('bau_weekly_metrics')
    .select('date_from, date_to')
    .order('date_to', { ascending: false });

  if (error) throw error;

  // Get unique week windows
  const uniqueWeeks = data.reduce((acc: WeekOption[], curr) => {
    const key = `${curr.date_from}-${curr.date_to}`;
    if (!acc.find(w => `${w.date_from}-${w.date_to}` === key)) {
      const fromDate = new Date(curr.date_from);
      const toDate = new Date(curr.date_to);
      const fmt = (d: Date) => d.toLocaleDateString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/London'
      });
      acc.push({
        date_from: curr.date_from,
        date_to: curr.date_to,
        label: `Week ${fmt(fromDate)} - ${fmt(toDate)}`
      });
    }
    return acc;
  }, []);

  return uniqueWeeks;
};

// Get BAU customers with their health for a specific week
export const getCustomersWithWeekHealth = async (
  weekFrom: string, 
  weekTo: string,
  searchQuery?: string
): Promise<CustomerWithHealth[]> => {
  let query = supabase
    .from('bau_customers')
    .select(`
      id,
      name,
      site_name,
      companies!inner(name)
    `)
    .eq('customer_type', 'bau')
    .order('name');

  if (searchQuery) {
    query = query.or(`name.ilike.%${searchQuery}%,site_name.ilike.%${searchQuery}%`);
  }

  const { data: customers, error: customersError } = await query;
  if (customersError) throw customersError;

  // Get health data for the specific week
  const { data: reviews, error: reviewsError } = await supabase
    .from('bau_weekly_reviews')
    .select('bau_customer_id, health')
    .eq('date_from', weekFrom)
    .eq('date_to', weekTo);

  if (reviewsError) throw reviewsError;

  // Combine customers with their health status
  return customers.map(customer => {
    const review = reviews.find(r => r.bau_customer_id === customer.id);
    return {
      id: customer.id,
      name: customer.name,
      site_name: customer.site_name,
      health: review?.health || null,
      company_name: customer.companies?.name
    };
  });
};

// Get KPIs for a specific customer and week
export const getCustomerKPIs = async (
  customerId: string,
  weekFrom: string,
  weekTo: string
): Promise<CustomerKPI[]> => {
  const { data, error } = await supabase
    .from('bau_weekly_metrics')
    .select('metric_key, metric_value_numeric, metric_value_text')
    .eq('bau_customer_id', customerId)
    .eq('date_from', weekFrom)
    .eq('date_to', weekTo)
    .order('metric_key');

  if (error) throw error;
  return data;
};

// Get trend data for a specific metric (last 8 weeks)
export const getMetricTrend = async (
  customerId: string,
  metricKey: string
): Promise<TrendDataPoint[]> => {
  const { data, error } = await supabase
    .from('bau_weekly_metrics')
    .select('date_to, metric_value_numeric')
    .eq('bau_customer_id', customerId)
    .eq('metric_key', metricKey)
    .not('metric_value_numeric', 'is', null)
    .order('date_to', { ascending: false })
    .limit(8);

  if (error) throw error;
  return data.reverse(); // Return in chronological order for chart
};

// Save weekly review (health + escalation)
export const saveReview = async ({
  customerId,
  weekFrom,
  weekTo,
  health,
  escalation
}: {
  customerId: string;
  weekFrom: string;
  weekTo: string;
  health: 'green' | 'red';
  escalation?: string;
}): Promise<void> => {
  const { error } = await supabase.rpc('set_bau_weekly_review', {
    p_bau_customer_id: customerId,
    p_date_from: weekFrom,
    p_date_to: weekTo,
    p_health: health,
    p_escalation: escalation || null
  });

  if (error) throw error;
};

// Get existing review for a customer and week
export const getCustomerReview = async (
  customerId: string,
  weekFrom: string,
  weekTo: string
): Promise<WeeklyReview | null> => {
  const { data, error } = await supabase
    .from('bau_weekly_reviews')
    .select('*')
    .eq('bau_customer_id', customerId)
    .eq('date_from', weekFrom)
    .eq('date_to', weekTo)
    .maybeSingle();

  if (error) throw error;
  return data;
};

// Get summary data for a week
export const getWeekSummary = async (weekFrom: string, weekTo: string) => {
  const { data: reviews, error } = await supabase
    .from('bau_weekly_reviews')
    .select(`
      *,
      bau_customers!inner(name, site_name)
    `)
    .eq('date_from', weekFrom)
    .eq('date_to', weekTo);

  if (error) throw error;

  const { data: totalCustomers, error: totalError } = await supabase
    .from('bau_customers')
    .select('id', { count: 'exact' })
    .eq('customer_type', 'bau');

  if (totalError) throw totalError;

  const greenCount = reviews.filter(r => r.health === 'green').length;
  const redCount = reviews.filter(r => r.health === 'red').length;
  const totalCount = totalCustomers.length || 0;
  const reviewedCount = reviews.length;
  const unreviewed = totalCount - reviewedCount;

  return {
    reviews,
    greenCount,
    redCount,
    totalCount,
    reviewedCount,
    unreviewed
  };
};

// Create or open weekly review meeting
export const createOrOpenWeeklyMeeting = async (weekFrom: string, weekTo: string) => {
  // For now, return a simple meeting object - this can be integrated with existing meeting system
  const title = `BAU Weekly Review — Week of ${weekFrom}`;
  const meetingDate = new Date(weekTo);
  meetingDate.setDate(meetingDate.getDate() + 1); // Next day after week end
  meetingDate.setHours(9, 0, 0, 0); // 9 AM

  return {
    title,
    date: meetingDate.toISOString(),
    duration: 60,
    description: `Weekly review meeting for BAU customers for the week of ${weekFrom} to ${weekTo}`
  };
};