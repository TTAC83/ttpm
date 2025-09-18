import { supabase } from "@/integrations/supabase/client";
import { FeatureRequest, FeatureRequestStatus } from "./featureRequestsService";

export interface CustomerProductGap {
  id: string;
  customer_name: string;
  project_name: string;
  title: string;
  is_critical: boolean;
  project_id: string;
}

export interface FeatureRequestDashboardItem extends FeatureRequest {
  priority_score: number;
  total_product_gaps: number;
  critical_product_gaps: number;
  affected_customers: number;
  customer_details: CustomerProductGap[];
  days_overdue: number | null;
  completion_status: 'on_time' | 'overdue' | 'completed' | 'no_date';
}

export interface DashboardStats {
  total_requests: number;
  in_progress: number;
  overdue: number;
  completed_this_quarter: number;
  critical_gaps_count: number;
  customers_affected: number;
}

export const featureDashboardService = {
  async getDashboardStats(): Promise<DashboardStats> {
    const { data: requests, error: requestsError } = await supabase
      .from('feature_requests')
      .select('*');

    if (requestsError) throw requestsError;

    const { data: productGaps, error: gapsError } = await supabase
      .from('product_gaps')
      .select(`
        *,
        projects!inner(name, companies!inner(name))
      `)
      .not('feature_request_id', 'is', null);

    if (gapsError) throw gapsError;

    const now = new Date();
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);

    const overdue = requests?.filter(r => 
      r.required_date && 
      new Date(r.required_date) < now && 
      r.status !== 'Complete'
    ).length || 0;

    const completed_this_quarter = requests?.filter(r => 
      r.complete_date && 
      new Date(r.complete_date) >= quarterStart &&
      r.status === 'Complete'
    ).length || 0;

    const critical_gaps_count = productGaps?.filter(g => g.is_critical).length || 0;
    
    const unique_customers = new Set(productGaps?.map(g => 
      (g.projects as any)?.companies?.name
    ).filter(Boolean));

    return {
      total_requests: requests?.length || 0,
      in_progress: requests?.filter(r => 
        r.status === 'In Design' || r.status === 'In Dev'
      ).length || 0,
      overdue,
      completed_this_quarter,
      critical_gaps_count,
      customers_affected: unique_customers.size
    };
  },

  async getFeatureRequestsDashboard(): Promise<FeatureRequestDashboardItem[]> {
    // Get all feature requests
    const { data: requests, error: requestsError } = await supabase
      .from('feature_requests')
      .select(`
        *,
        profiles!feature_requests_created_by_profiles_fkey(name)
      `)
      .order('updated_at', { ascending: false });

    if (requestsError) throw requestsError;

    // Get all product gaps with their related data
    const { data: productGaps, error: gapsError } = await supabase
      .from('product_gaps')
      .select(`
        id,
        title,
        is_critical,
        feature_request_id,
        project_id,
        projects!inner(
          id,
          name,
          companies!inner(name)
        )
      `)
      .eq('status', 'Live')
      .not('feature_request_id', 'is', null);

    if (gapsError) throw gapsError;

    const now = new Date();

    return (requests || []).map(request => {
      // Find product gaps for this feature request
      const relatedGaps = productGaps?.filter(gap => 
        gap.feature_request_id === request.id
      ) || [];

      const total_product_gaps = relatedGaps.length;
      const critical_product_gaps = relatedGaps.filter(g => g.is_critical).length;
      
      // Get unique customers
      const customerDetails: CustomerProductGap[] = relatedGaps.map(gap => ({
        id: gap.id,
        customer_name: (gap.projects as any)?.companies?.name || 'Unknown',
        project_name: (gap.projects as any)?.name || 'Unknown',
        title: gap.title,
        is_critical: gap.is_critical,
        project_id: gap.project_id
      }));

      const unique_customers = new Set(customerDetails.map(c => c.customer_name));
      const affected_customers = unique_customers.size;

      // Calculate priority score (simple algorithm)
      let priority_score = 0;
      priority_score += total_product_gaps * 2; // Each gap adds 2 points
      priority_score += critical_product_gaps * 5; // Critical gaps add 5 points
      priority_score += affected_customers * 3; // Each customer adds 3 points

      // Calculate days overdue
      let days_overdue: number | null = null;
      let completion_status: 'on_time' | 'overdue' | 'completed' | 'no_date' = 'no_date';

      if (request.status === 'Complete') {
        completion_status = 'completed';
      } else if (request.required_date) {
        const requiredDate = new Date(request.required_date);
        const diffTime = now.getTime() - requiredDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays > 0) {
          days_overdue = diffDays;
          completion_status = 'overdue';
        } else {
          completion_status = 'on_time';
        }
      }

      return {
        ...request,
        creator: {
          name: (request.profiles as any)?.name,
          email: undefined
        },
        priority_score,
        total_product_gaps,
        critical_product_gaps,
        affected_customers,
        customer_details: customerDetails,
        days_overdue,
        completion_status
      };
    }).sort((a, b) => b.priority_score - a.priority_score); // Sort by priority score desc
  },

  getStatusBadgeVariant(status: FeatureRequestStatus): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
      case 'Requested': return 'outline';
      case 'Rejected': return 'destructive';
      case 'In Design': return 'secondary';
      case 'In Dev': return 'default';
      case 'Complete': return 'default';
      default: return 'outline';
    }
  },

  getPriorityColor(score: number): string {
    if (score >= 20) return 'text-red-600 dark:text-red-400';
    if (score >= 10) return 'text-orange-600 dark:text-orange-400';
    if (score >= 5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  }
};