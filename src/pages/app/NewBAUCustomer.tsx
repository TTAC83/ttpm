import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { createBauCustomer, getCompanies, createCompany } from '@/lib/bauService';
import { useToast } from '@/hooks/use-toast';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Company {
  id: string;
  name: string;
}

export const NewBAUCustomer = () => {
  const [formData, setFormData] = useState({
    company_id: '',
    name: '',
    site_name: '',
    subscription_plan: '',
    sla_response_mins: '',
    sla_resolution_hours: '',
    devices_deployed: '',
    notes: '',
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companySearchOpen, setCompanySearchOpen] = useState(false);
  const [companySearchValue, setCompanySearchValue] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const data = await getCompanies();
        setCompanies(data);
      } catch (error) {
        console.error('Error loading companies:', error);
        toast({
          title: "Error",
          description: "Failed to load companies",
          variant: "destructive",
        });
      } finally {
        setCompaniesLoading(false);
      }
    };

    loadCompanies();
  }, []);

  const handleCompanyChange = async (value: string) => {
    const existingCompany = companies.find(c => c.name.toLowerCase() === value.toLowerCase());
    
    if (existingCompany) {
      // Use existing company
      setFormData(prev => ({
        ...prev,
        company_id: existingCompany.id,
        name: existingCompany.name
      }));
      setCompanySearchValue(existingCompany.name);
    } else {
      // Create new company
      try {
        const newCompanyId = await createCompany(value);
        const newCompany = { id: newCompanyId, name: value };
        setCompanies(prev => [...prev, newCompany]);
        setFormData(prev => ({
          ...prev,
          company_id: newCompanyId,
          name: value
        }));
        setCompanySearchValue(value);
        toast({
          title: "Company Created",
          description: `New company "${value}" has been added to master data`,
        });
      } catch (error) {
        console.error('Error creating company:', error);
        toast({
          title: "Error",
          description: "Failed to create new company",
          variant: "destructive",
        });
      }
    }
    setCompanySearchOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_id || !formData.name) {
      toast({
        title: "Validation Error",
        description: "Company and name are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const customerId = await createBauCustomer({
        company_id: formData.company_id,
        name: formData.name,
        site_name: formData.site_name || undefined,
        subscription_plan: formData.subscription_plan || undefined,
        sla_response_mins: formData.sla_response_mins ? parseInt(formData.sla_response_mins) : undefined,
        sla_resolution_hours: formData.sla_resolution_hours ? parseInt(formData.sla_resolution_hours) : undefined,
      });

      toast({
        title: "Success",
        description: "BAU customer created successfully",
      });

      navigate(`/app/bau/${customerId}`);
    } catch (error) {
      console.error('Error creating BAU customer:', error);
      toast({
        title: "Error",
        description: "Failed to create BAU customer",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (companiesLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => navigate('/app/bau')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to BAU
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">New BAU Customer</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="company">Company *</Label>
                <Popover open={companySearchOpen} onOpenChange={setCompanySearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={companySearchOpen}
                      className="w-full justify-between"
                    >
                      {companySearchValue || "Select or type company name..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Search or type new company..." 
                        value={companySearchValue}
                        onValueChange={setCompanySearchValue}
                      />
                      <CommandList>
                        <CommandEmpty>
                          <div className="p-2">
                            <p className="text-sm text-muted-foreground mb-2">
                              No company found.
                            </p>
                            <Button
                              size="sm"
                              onClick={() => handleCompanyChange(companySearchValue)}
                              disabled={!companySearchValue.trim()}
                            >
                              Create "{companySearchValue}"
                            </Button>
                          </div>
                        </CommandEmpty>
                        <CommandGroup>
                          {companies
                            .filter((company) =>
                              company.name.toLowerCase().includes(companySearchValue.toLowerCase())
                            )
                            .map((company) => (
                              <CommandItem
                                key={company.id}
                                value={company.name}
                                onSelect={() => handleCompanyChange(company.name)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.company_id === company.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {company.name}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Customer Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Customer display name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="site_name">Site Name</Label>
                <Input
                  id="site_name"
                  value={formData.site_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, site_name: e.target.value }))}
                  placeholder="Primary site name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subscription_plan">Subscription Plan</Label>
                <Input
                  id="subscription_plan"
                  value={formData.subscription_plan}
                  onChange={(e) => setFormData(prev => ({ ...prev, subscription_plan: e.target.value }))}
                  placeholder="e.g., Standard, Premium"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sla_response_mins">SLA Response Time (minutes)</Label>
                <Input
                  id="sla_response_mins"
                  type="number"
                  value={formData.sla_response_mins}
                  onChange={(e) => setFormData(prev => ({ ...prev, sla_response_mins: e.target.value }))}
                  placeholder="e.g., 60"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sla_resolution_hours">SLA Resolution Time (hours)</Label>
                <Input
                  id="sla_resolution_hours"
                  type="number"
                  value={formData.sla_resolution_hours}
                  onChange={(e) => setFormData(prev => ({ ...prev, sla_resolution_hours: e.target.value }))}
                  placeholder="e.g., 24"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about this BAU customer"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => navigate('/app/bau')}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create BAU Customer'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};