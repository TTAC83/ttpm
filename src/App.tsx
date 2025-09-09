import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/auth/AuthGuard";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import AppLayout from "./pages/app/AppLayout";
import Dashboard from "./pages/app/Dashboard";
import Profile from "./pages/app/Profile";
import UserManagement from "./pages/app/admin/UserManagement";
import ProjectsList from "./pages/app/projects/ProjectsList";
import NewProject from "./pages/app/projects/NewProject";
import BulkProjectCreation from "./pages/app/projects/BulkProjectCreation";
import { UpdateAquascotDates } from "./pages/app/projects/UpdateAquascotDates";
import ProjectDetail from "./pages/app/projects/ProjectDetail";
import MasterDataManagement from "./pages/app/admin/MasterDataManagement";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route 
              path="/auth" 
              element={
                <AuthGuard requireAuth={false}>
                  <AuthPage />
                </AuthGuard>
              } 
            />
            <Route 
              path="/app" 
              element={
                <AuthGuard requireAuth={true}>
                  <AppLayout />
                </AuthGuard>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="projects" element={<ProjectsList />} />
              <Route 
                path="projects/new" 
                element={
                  <AuthGuard requiredRole="internal_admin">
                    <NewProject />
                  </AuthGuard>
                } 
              />
              <Route 
                path="projects/bulk-create" 
                element={
                  <AuthGuard requiredRole="internal_admin">
                    <BulkProjectCreation />
                  </AuthGuard>
                } 
              />
              <Route 
                path="projects/update-aquascot" 
                element={
                  <AuthGuard requiredRole="internal_admin">
                    <UpdateAquascotDates />
                  </AuthGuard>
                } 
              />
              <Route path="projects/:id" element={<ProjectDetail />} />
              <Route 
                path="admin/users" 
                element={
                  <AuthGuard requiredRole="internal_admin">
                    <UserManagement />
                  </AuthGuard>
                } 
              />
              <Route 
                path="admin/masterdata" 
                element={
                  <AuthGuard requiredRole="internal_admin">
                    <MasterDataManagement />
                  </AuthGuard>
                } 
              />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
