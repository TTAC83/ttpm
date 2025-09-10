import React from "react";
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
import { UpdateFinsburyDates } from "./pages/app/projects/UpdateFinsburyDates";
import { UpdateCranswickWattonDates } from "./pages/app/projects/UpdateCranswickWattonDates";
import { UpdateButlersFarmhouseDates } from "./pages/app/projects/UpdateButlersFarmhouseDates";
import { UpdateButternutBoxDates } from "./pages/app/projects/UpdateButternutBoxDates";
import { UpdateMBCDates } from "./pages/app/projects/UpdateMBCDates";
import { UpdateHFUKDates } from "./pages/app/projects/UpdateHFUKDates";
import { UpdateKettleProduceDates } from "./pages/app/projects/UpdateKettleProduceDates";
import { UpdateMytonGadbrookMorrisonsDates } from "./pages/app/projects/UpdateMytonGadbrookMorrisonsDates";
import { UpdateRGFreshDates } from "./pages/app/projects/UpdateRGFreshDates";
import { UpdateVillageBakeryDates } from "./pages/app/projects/UpdateVillageBakeryDates";
import { UpdateParkCakesDates } from "./pages/app/projects/UpdateParkCakesDates";
import ProjectDetail from "./pages/app/projects/ProjectDetail";
import MasterDataManagement from "./pages/app/admin/MasterDataManagement";
import CompleteSignup from "./pages/CompleteSignup";
import Actions from "./pages/app/Actions";
import GlobalTasks from "./pages/app/GlobalTasks";

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
              path="/complete-signup" 
              element={
                <AuthGuard requireAuth={false}>
                  <CompleteSignup />
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
              <Route 
                path="projects/update-finsbury" 
                element={
                  <AuthGuard requiredRole="internal_admin">
                    <UpdateFinsburyDates />
                  </AuthGuard>
                } 
              />
              <Route 
                path="projects/update-cranswick-watton" 
                element={
                  <AuthGuard requiredRole="internal_admin">
                    <UpdateCranswickWattonDates />
                  </AuthGuard>
                } 
              />
              <Route 
                path="projects/update-butlers-farmhouse" 
                element={
                  <AuthGuard requiredRole="internal_admin">
                    <UpdateButlersFarmhouseDates />
                  </AuthGuard>
                } 
              />
              <Route 
                path="projects/update-mbc" 
                element={
                  <AuthGuard requiredRole="internal_admin">
                    <UpdateMBCDates />
                  </AuthGuard>
                } 
              />
              <Route 
                path="projects/update-hfuk" 
                element={
                  <AuthGuard requiredRole="internal_admin">
                    <UpdateHFUKDates />
                  </AuthGuard>
                } 
              />
              <Route 
                path="projects/update-kettle-produce" 
                element={
                  <AuthGuard requiredRole="internal_admin">
                    <UpdateKettleProduceDates />
                  </AuthGuard>
                } 
              />
              <Route 
                path="projects/update-rg-fresh" 
                element={
                  <AuthGuard requiredRole="internal_admin">
                    <UpdateRGFreshDates />
                  </AuthGuard>
                } 
              />
              <Route 
                path="projects/update-village-bakery" 
                element={
                  <AuthGuard requiredRole="internal_admin">
                    <UpdateVillageBakeryDates />
                  </AuthGuard>
                } 
              />
              <Route 
                path="projects/update-park-cakes" 
                element={
                  <AuthGuard requiredRole="internal_admin">
                    <UpdateParkCakesDates />
                  </AuthGuard>
                } 
              />
              <Route 
                path="projects/update-myton-gadbrook-morrisons" 
                element={
                  <AuthGuard requiredRole="internal_admin">
                    <UpdateMytonGadbrookMorrisonsDates />
                  </AuthGuard>
                } 
              />
              <Route 
                path="projects/update-butternut-box" 
                element={
                  <AuthGuard requiredRole="internal_admin">
                    <UpdateButternutBoxDates />
                  </AuthGuard>
                } 
              />
              <Route path="projects/:id" element={<ProjectDetail />} />
              <Route path="actions" element={<Actions />} />
              <Route path="tasks" element={<GlobalTasks />} />
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
