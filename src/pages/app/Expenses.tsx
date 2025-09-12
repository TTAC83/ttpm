import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { UnassignedExpenses } from './expenses/UnassignedExpenses';
import { AssignedExpenses } from './expenses/AssignedExpenses';
import { ExpenseUpload } from '@/components/ExpenseUpload';

export const Expenses = () => {
  const [activeTab, setActiveTab] = useState('unassigned');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1);
    setActiveTab('unassigned'); // Switch to unassigned to see new uploads
  };

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