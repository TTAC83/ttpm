import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BAUCustomer } from '@/lib/bauService';
import { format } from 'date-fns';

interface BAUOverviewTabProps {
  customer: BAUCustomer;
}

export const BAUOverviewTab = ({ customer }: BAUOverviewTabProps) => {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customer.open_tickets || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customer.total_tickets || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Devices Deployed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customer.devices_deployed || '-'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">SLA Response</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customer.sla_response_mins ? `${customer.sla_response_mins}m` : '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Company</div>
              <div>{customer.companies?.name || customer.company_name}</div>
            </div>
            
            <div>
              <div className="text-sm font-medium text-muted-foreground">Site Name</div>
              <div>{customer.site_name || '-'}</div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">Go Live Date</div>
              <div>
                {customer.go_live_date 
                  ? format(new Date(customer.go_live_date), 'MMMM d, yyyy')
                  : '-'
                }
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">Subscription Plan</div>
              <div>{customer.subscription_plan || '-'}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Level Agreement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Response Time</div>
              <div>
                {customer.sla_response_mins 
                  ? `${customer.sla_response_mins} minutes`
                  : 'Not specified'
                }
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">Resolution Time</div>
              <div>
                {customer.sla_resolution_hours 
                  ? `${customer.sla_resolution_hours} hours`
                  : 'Not specified'
                }
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">Devices Deployed</div>
              <div>{customer.devices_deployed || 'Not specified'}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {customer.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{customer.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};