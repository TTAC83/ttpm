import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileSpreadsheet, Shield } from 'lucide-react';
import { UnassignedExpensesBatch } from './expenses/UnassignedExpensesBatch';
import { MyExpenses } from './expenses/MyExpenses';
import { AssignedExpenses } from './expenses/AssignedExpenses';
import { ProjectCosts } from './expenses/ProjectCosts';
import { AdminExpenseApproval } from './expenses/AdminExpenseApproval';
import { AdminExpenseManagement } from './expenses/AdminExpenseManagement';
import { ExpenseUpload } from '@/components/ExpenseUpload';
import { useExpenseAccess } from '@/hooks/useExpenseAccess';
import { useAuth } from '@/hooks/useAuth';

export const Expenses = () => {
  const [activeTab, setActiveTab] = useState('unassigned');
  const [refreshKey, setRefreshKey] = useState(0);
  const { hasAccess, loading } = useExpenseAccess();
  const { user } = useAuth();
  
  // Check if user is an admin expense approver
  const isAdminApprover = user?.email && [
    'allan@thingtrax.com',
    'paul@thingtrax.com', 
    'ishafqat@thingtrax.com',
    'agupta@thingtrax.com',
    'richard@thingtrax.com'
  ].includes(user.email.toLowerCase());

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
        <TabsList className={`grid w-full ${isAdminApprover ? 'grid-cols-6' : 'grid-cols-5'}`}>
          <TabsTrigger value="unassigned">Batch Assign</TabsTrigger>
          <TabsTrigger value="assigned-expenses">Assigned Expenses</TabsTrigger>
          <TabsTrigger value="assigned">My Expenses</TabsTrigger>
          <TabsTrigger value="projects">Project Costs</TabsTrigger>
          <TabsTrigger value="admin">Admin Approval</TabsTrigger>
          {isAdminApprover && (
            <TabsTrigger value="admin-manage">Manage All</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="unassigned" className="space-y-4">
          <UnassignedExpensesBatch key={`unassigned-${refreshKey}`} />
        </TabsContent>
        
        <TabsContent value="assigned-expenses" className="space-y-4">
          <AssignedExpenses key={`assigned-expenses-${refreshKey}`} />
        </TabsContent>
        
        <TabsContent value="assigned" className="space-y-4">
          <MyExpenses key={`my-expenses-${refreshKey}`} />
        </TabsContent>
        
        <TabsContent value="projects" className="space-y-4">
          <ProjectCosts key={`projects-${refreshKey}`} />
        </TabsContent>
        
        <TabsContent value="admin" className="space-y-4">
          <AdminExpenseApproval key={`admin-${refreshKey}`} />
        </TabsContent>
        
        {isAdminApprover && (
          <TabsContent value="admin-manage" className="space-y-4">
            <AdminExpenseManagement key={`admin-manage-${refreshKey}`} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};