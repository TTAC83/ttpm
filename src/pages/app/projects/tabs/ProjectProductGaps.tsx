import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ExternalLink, Link as LinkIcon } from "lucide-react";
import { ProductGapDrawer } from "@/components/ProductGapDrawer";
import { productGapsService, ProductGap } from "@/lib/productGapsService";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface ProjectProductGapsProps {
  projectId: string;
}

export function ProjectProductGaps({ projectId }: ProjectProductGapsProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProductGap, setSelectedProductGap] = useState<ProductGap | undefined>();

  const { data: productGaps = [], isLoading } = useQuery({
    queryKey: ['project-product-gaps', projectId],
    queryFn: () => productGapsService.getProjectProductGaps(projectId),
  });

  const navigate = useNavigate();

  const handleCreateNew = () => {
    setSelectedProductGap(undefined);
    setDrawerOpen(true);
  };

  const handleEditProductGap = (productGap: ProductGap) => {
    setSelectedProductGap(productGap);
    setDrawerOpen(true);
  };

  if (isLoading) {
    return <div>Loading product gaps...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Product Gaps</h3>
        <Button onClick={handleCreateNew} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Product Gap
        </Button>
      </div>

      {productGaps.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No product gaps recorded for this project.
        </div>
      ) : (
        <div className="space-y-2">
          {productGaps.map((gap) => (
            <div
              key={gap.id}
              className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => handleEditProductGap(gap)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">{gap.title}</h4>
                    <Badge variant={gap.is_critical ? "destructive" : "default"}>
                      {gap.is_critical ? "Critical" : "Normal"}
                    </Badge>
                    <Badge variant={gap.status === 'Live' ? "default" : "secondary"}>
                      {gap.status}
                    </Badge>
                    {gap.feature_request_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        title="View linked feature request"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/app/feature-requests/${gap.feature_request_id}`);
                        }}
                      >
                        <LinkIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {gap.description && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {gap.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {gap.assigned_to_name && (
                      <span>Assigned to: {gap.assigned_to_name}</span>
                    )}
                    {gap.estimated_complete_date && (
                      <span>Est. Complete: {format(new Date(gap.estimated_complete_date), 'MMM dd, yyyy')}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {gap.ticket_link && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(gap.ticket_link, '_blank');
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProductGapDrawer
        projectId={projectId}
        productGap={selectedProductGap}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}