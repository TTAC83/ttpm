import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Play, CheckCircle, XCircle } from 'lucide-react';
import { createBulkProjects } from '@/utils/bulkProjectCreation';

export const BulkProjectCreation = () => {
  const navigate = useNavigate();
  const { isInternalAdmin } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [completed, setCompleted] = useState(false);

  const handleBulkCreate = async () => {
    setLoading(true);
    setResults([]);
    setCompleted(false);

    try {
      const creationResults = await createBulkProjects();
      setResults(creationResults);
      setCompleted(true);
      
      const successCount = creationResults.filter(r => r.status === 'success').length;
      const errorCount = creationResults.filter(r => r.status === 'error').length;
      
      toast({
        title: "Bulk Creation Complete",
        description: `${successCount} projects created successfully, ${errorCount} errors`,
        variant: errorCount > 0 ? "destructive" : "default"
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create projects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isInternalAdmin()) {
    return null;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/app/projects')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Bulk Project Creation</h1>
          <p className="text-muted-foreground">
            Create "Phase 1" projects for multiple customers
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Phase 1 Projects</CardTitle>
          <CardDescription>
            This will create "Phase 1" projects for 17 customers with test data including random domains, 
            site details, contract dates, and team assignments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="font-semibold">Customers to be created:</h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div>• Aquascot</div>
              <div>• Butlers Farmhouse Cheeses</div>
              <div>• Butternut Box</div>
              <div>• Cranswick Watton</div>
              <div>• Finsbury</div>
              <div>• HFUK</div>
              <div>• Kettle Produce</div>
              <div>• MBC</div>
              <div>• Myton Gadbrook Morrisons</div>
              <div>• Park Cakes</div>
              <div>• R&G Fresh</div>
              <div>• Sofina Hull</div>
              <div>• Sofina Malton</div>
              <div>• Village Bakery</div>
              <div>• Vitacress</div>
              <div>• Zertus Fakenham</div>
              <div>• Zertus Heckington</div>
            </div>
          </div>

          <Button 
            onClick={handleBulkCreate} 
            disabled={loading || completed}
            className="w-full"
          >
            <Play className="h-4 w-4 mr-2" />
            {loading ? 'Creating Projects...' : completed ? 'Projects Created' : 'Create All Projects'}
          </Button>

          {results.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Creation Results:</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {results.map((result, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    {result.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-medium">{result.customer}</span>
                    {result.status === 'success' ? (
                      <span className="text-green-600">✓ Created</span>
                    ) : (
                      <span className="text-red-600">✗ {result.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkProjectCreation;