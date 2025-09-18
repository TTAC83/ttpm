import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Search, ExternalLink, Link2 as FeatureLinkIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ProductGapDrawer } from "@/components/ProductGapDrawer";
import { productGapsService, ProductGap } from "@/lib/productGapsService";
import { format } from "date-fns";

export default function ProductGaps() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProductGap, setSelectedProductGap] = useState<ProductGap | undefined>();
  const navigate = useNavigate();

  const { data: productGaps = [], isLoading } = useQuery({
    queryKey: ['product-gaps'],
    queryFn: () => productGapsService.getAllProductGaps(),
  });

  // Debug: how many gaps have a linked feature
  if (import.meta.env.DEV) {
    const linkedCount = productGaps.filter(g => !!g.feature_request_id).length;
    console.log(`[ProductGaps] Loaded ${productGaps.length} gaps, ${linkedCount} linked to features`);
  }

  const filteredProductGaps = productGaps.filter(gap => {
    const matchesSearch = gap.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         gap.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         gap.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         gap.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || gap.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleCreateNew = () => {
    setSelectedProductGap(undefined);
    setDrawerOpen(true);
  };

  const handleEditProductGap = (productGap: ProductGap) => {
    setSelectedProductGap(productGap);
    setDrawerOpen(true);
  };

  const getStatusBadge = (status: string, isCritical: boolean) => {
    if (status === 'Closed') {
      return <Badge variant="secondary">Closed</Badge>;
    }
    return (
      <Badge variant={isCritical ? "destructive" : "default"}>
        {isCritical ? "Critical" : "Live"}
      </Badge>
    );
  };

  const getRowClassName = (productGap: ProductGap) => {
    if (productGap.status === 'Closed') return "";
    
    const isOverdue = productGap.estimated_complete_date && 
                     new Date(productGap.estimated_complete_date) < new Date();
    
    if (isOverdue && productGap.is_critical) {
      return "bg-destructive/10 border-destructive/20";
    } else if (isOverdue) {
      return "bg-amber-50 border-amber-200";
    } else if (productGap.is_critical) {
      return "bg-orange-50 border-orange-200";
    }
    return "";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Gaps</h1>
          <p className="text-muted-foreground">
            View product gaps across all projects. To add new ones, go to the specific project.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search product gaps..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Live">Live</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Product Gaps List */}
      <Card>
        {isLoading ? (
          <div className="p-8 text-center">Loading product gaps...</div>
        ) : filteredProductGaps.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchTerm || statusFilter !== "all" 
              ? "No product gaps match your filters." 
              : "No product gaps found."
            }
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="p-4 font-medium">Customer</th>
                  <th className="p-4 font-medium">Project</th>
                  <th className="p-4 font-medium">Product Gap</th>
                  <th className="p-4 font-medium">Assigned To</th>
                  <th className="p-4 font-medium">Est. Complete</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProductGaps.map((productGap) => (
                  <tr
                    key={productGap.id}
                    className={`border-b hover:bg-muted/50 transition-colors cursor-pointer ${getRowClassName(productGap)}`}
                    onClick={() => handleEditProductGap(productGap)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {productGap.company_name}
                        {productGap.feature_request_id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/app/feature-requests/${productGap.feature_request_id}`);
                            }}
                            className="text-primary hover:text-primary/80 transition-colors"
                            title="View linked feature request"
                            aria-label="View linked feature request"
                          >
                            <FeatureLinkIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <Link
                        to={`/app/projects/${productGap.project_id}`}
                        className="text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {productGap.project_name}
                      </Link>
                    </td>
                     <td className="p-4">
                      <div>
                        <div className="font-medium">{productGap.title}</div>
                        {productGap.description && (
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {productGap.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {productGap.assigned_to_name || (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </td>
                    <td className="p-4">
                      {productGap.estimated_complete_date ? (
                        <span className="text-sm">
                          {format(new Date(productGap.estimated_complete_date), 'MMM dd, yyyy')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Not set</span>
                      )}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(productGap.status, productGap.is_critical)}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {productGap.ticket_link && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(productGap.ticket_link, '_blank');
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ProductGapDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        productGap={selectedProductGap}
      />
    </div>
  );
}