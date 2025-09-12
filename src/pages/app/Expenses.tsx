import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileSpreadsheet, Shield } from 'lucide-react';
import { UnassignedExpenses } from './expenses/UnassignedExpenses';
import { AssignedExpenses } from './expenses/AssignedExpenses';
import { ExpenseUpload } from '@/components/ExpenseUpload';
import { useExpenseAccess } from '@/hooks/useExpenseAccess';

export const Expenses = () => {
  const [activeTab, setActiveTab] = useState('unassigned');
  const [refreshKey, setRefreshKey] = useState(0);
  const { hasAccess, loading } = useExpenseAccess();

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1);
    setActiveTab('unassigned'); // Switch to unassigned to see new uploads
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-semibold mb-2">Access Restricted</h2>
              <p className="text-muted-foreground">
                You don't have permission to access the expenses section.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
        <ExpenseUpload onUploadSuccess={handleUploadSuccess} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="unassigned" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Unassigned Expenses
          </TabsTrigger>
          <TabsTrigger value="assigned" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Assigned Expenses
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="unassigned" className="space-y-4">
          <UnassignedExpenses key={`unassigned-${refreshKey}`} />
        </TabsContent>
        
        <TabsContent value="assigned" className="space-y-4">
          <AssignedExpenses key={`assigned-${refreshKey}`} />
        </TabsContent>
      </Tabs>
    </div>
  );
};