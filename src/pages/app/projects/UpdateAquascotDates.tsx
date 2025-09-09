import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { updateAquascotDates } from '@/utils/updateAquascotDates';

export const UpdateAquascotDates: React.FC = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const updateResults = await updateAquascotDates();
      setResults(updateResults);
      
      const successCount = updateResults.filter(r => r.status === 'updated').length;
      const failCount = updateResults.filter(r => r.status === 'failed').length;
      
      toast.success(`Updated ${successCount} tasks${failCount > 0 ? `, ${failCount} failed` : ''}`);
    } catch (error) {
      toast.error('Failed to update dates: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Update Aquascot Project Dates</CardTitle>
          <CardDescription>
            This will update the Aquascot project tasks with the provided schedule data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleUpdate}
            disabled={isUpdating}
            className="w-full"
          >
            {isUpdating ? 'Updating...' : 'Update All Dates'}
          </Button>
          
          {results.length > 0 && (
            <div className="mt-6 space-y-2">
              <h3 className="font-semibold">Update Results:</h3>
              {results.map((result, index) => (
                <div 
                  key={index}
                  className={`p-2 rounded text-sm ${
                    result.status === 'updated' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {result.task}: {result.status}
                  {result.error && <div className="text-xs mt-1">{result.error}</div>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};