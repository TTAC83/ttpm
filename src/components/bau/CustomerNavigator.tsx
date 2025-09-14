import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { getCustomersWithWeekHealth, CustomerWithHealth, WeekOption } from '@/lib/bauWeeklyService';
import { cn } from '@/lib/utils';

interface CustomerNavigatorProps {
  selectedWeek: WeekOption | null;
  selectedCustomer: CustomerWithHealth | null;
  onCustomerSelect: (customer: CustomerWithHealth) => void;
}

export const CustomerNavigator: React.FC<CustomerNavigatorProps> = ({
  selectedWeek,
  selectedCustomer,
  onCustomerSelect
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: customers, isLoading, error } = useQuery({
    queryKey: ['bau-customers-week-health', selectedWeek?.date_from, selectedWeek?.date_to, searchQuery],
    queryFn: () => selectedWeek ? getCustomersWithWeekHealth(
      selectedWeek.date_from, 
      selectedWeek.date_to, 
      searchQuery || undefined
    ) : Promise.resolve([]),
    enabled: !!selectedWeek,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    return customers;
  }, [customers]);

  const getHealthBadge = (health: 'green' | 'red' | null) => {
    if (health === 'green') {
      return <Badge variant="default" className="bg-green-500 text-white">Green</Badge>;
    }
    if (health === 'red') {
      return <Badge variant="destructive">Red</Badge>;
    }
    return <Badge variant="outline">Unset</Badge>;
  };

  if (!selectedWeek) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Please select a week to view customers
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Customer List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-4 text-center text-destructive">
              Error loading customers: {error.message}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {searchQuery ? 'No customers found matching your search' : 'No BAU customers found'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => onCustomerSelect(customer)}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50",
                    selectedCustomer?.id === customer.id && "bg-muted border-primary"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{customer.name}</div>
                      {customer.site_name && (
                        <div className="text-sm text-muted-foreground truncate">
                          {customer.site_name}
                        </div>
                      )}
                      {customer.company_name && (
                        <div className="text-xs text-muted-foreground truncate">
                          {customer.company_name}
                        </div>
                      )}
                    </div>
                    <div className="ml-2 flex-shrink-0">
                      {getHealthBadge(customer.health)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer Stats */}
      {filteredCustomers.length > 0 && (
        <div className="p-4 border-t text-sm text-muted-foreground">
          {filteredCustomers.length} customer{filteredCustomers.length === 1 ? '' : 's'} •{' '}
          {filteredCustomers.filter(c => c.health === 'green').length} Green •{' '}
          {filteredCustomers.filter(c => c.health === 'red').length} Red •{' '}
          {filteredCustomers.filter(c => !c.health).length} Unset
        </div>
      )}
    </div>
  );
};