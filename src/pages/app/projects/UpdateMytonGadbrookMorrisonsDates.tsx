import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { updateMytonGadbrookMorrisonsDates } from '@/utils/updateMytonGadbrookMorrisonsDates';

export const UpdateMytonGadbrookMorrisonsDates = () => {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [results, setResults] = useState<{ status: string; taskTitle: string; message?: string }[] | null>(null);

  const handleUpdate = async () => {
    try {
      setIsUpdating(true);
      setResults(null);
      
      const updateResults = await updateMytonGadbrookMorrisonsDates();
      setResults(updateResults);
      
      const successCount = updateResults.filter(r => r.status === 'updated').length;
      const failedCount = updateResults.filter(r => r.status === 'failed').length;
      
      toast({
        title: "Update Complete",
        description: `${successCount} tasks updated, ${failedCount} failed`,
        variant: successCount > 0 ? "default" : "destructive",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update Myton Gadbrook Morrisons project dates",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const successCount = results?.filter(r => r.status === 'updated').length || 0;
  const failedCount = results?.filter(r => r.status === 'failed').length || 0;
  const skippedCount = results?.filter(r => r.status === 'skipped').length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Update Myton Gadbrook Morrisons Project Dates</h1>
        <p className="text-muted-foreground">
          Update task dates for the Myton Gadbrook Morrisons project with predefined data
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Myton Gadbrook Morrisons Date Update</CardTitle>
          <CardDescription>
            This will update all task dates for the Myton Gadbrook Morrisons project with the latest schedule data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleUpdate} 
            disabled={isUpdating}
            className="w-full"
          >
            {isUpdating ? 'Updating...' : 'Update Myton Gadbrook Morrisons Dates'}
          </Button>

          {results && (
            <div className="space-y-2">
              <h3 className="font-semibold">Update Results:</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                  <div className="text-green-700 dark:text-green-300 font-medium">
                    Success: {successCount}
                  </div>
                </div>
                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded">
                  <div className="text-red-700 dark:text-red-300 font-medium">
                    Failed: {failedCount}
                  </div>
                </div>
                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <div className="text-gray-700 dark:text-gray-300 font-medium">
                    Skipped: {skippedCount}
                  </div>
                </div>
              </div>
              
              {failedCount > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-red-600 dark:text-red-400 mb-2">Failed Tasks:</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {results.filter(r => r.status === 'failed').map((result, index) => (
                      <div key={index} className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                        {result.taskTitle}: {result.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};