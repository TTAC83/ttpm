// ========================================
// RESTORE POINT - Before schema migration
// Date: 2025-01-12
// Purpose: Safe restore point before database schema redesign for project lifecycle transitions
// ========================================

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
import { UpdateProjectDates } from "./pages/app/projects/UpdateProjectDates";
import ProjectDetail from "./pages/app/projects/ProjectDetail";
import MasterDataManagement from "./pages/app/admin/MasterDataManagement";
import HardwareManagement from "./pages/app/admin/HardwareManagement";
import VisionUseCases from "./pages/app/admin/VisionUseCases";
import ContactRolesManagement from "./pages/app/admin/ContactRolesManagement";
import FeatureRequests from "./pages/app/FeatureRequests";
import FeatureRequestDetail from "./pages/app/FeatureRequestDetail";
import FeatureDashboard from "./pages/app/FeatureDashboard";
import CompleteSignup from "./pages/CompleteSignup";
import MyWork from "./pages/app/MyWork";
import ResetPassword from "./pages/ResetPassword";
import Actions from "./pages/app/Actions";
import GlobalTasks from "./pages/app/GlobalTasks";
import GlobalCalendar from "./pages/app/GlobalCalendar";
import GlobalModels from "./pages/app/GlobalModels";
import { Expenses } from "./pages/app/Expenses";
import { SolutionsList } from "./pages/app/solutions/SolutionsList";
import { NewSolutionsProject } from "./pages/app/solutions/NewSolutionsProject";
import { SolutionsProjectDetail } from "./pages/app/solutions/SolutionsProjectDetail";
import { BAU } from "./pages/app/BAU";
import { NewBAUCustomer } from "./pages/app/NewBAUCustomer";
import { BAUDetail } from "./pages/app/BAUDetail";
import { WeeklyReview } from "./pages/app/bau/WeeklyReview";
import WeeklyReviewPage from "./pages/app/bau/WeeklyReviewPage";
import { BoardSummary as BAUBoardSummary } from "./pages/app/bau/BoardSummary";
import ImplementationWeeklyReview from "./pages/app/ImplementationWeeklyReview";
import WBS from "./pages/app/implementation/WBS";
import ImplementationEscalations from "./pages/app/ImplementationBlockers";
import ProductGaps from "./pages/app/ProductGaps";
import ExecutiveSummary from "./pages/app/implementation/ExecutiveSummary";
import BoardSummary from "./pages/app/implementation/BoardSummary";
import { InternalRoute } from "@/components/auth/InternalRoute";
import ExpansionReport from "./pages/app/global-dashboards/ExpansionReport";
import ScheduleRequired from "./pages/app/vision-models/ScheduleRequired";
import FootageRequired from "./pages/app/vision-models/FootageRequired";
import AnnotationRequired from "./pages/app/vision-models/AnnotationRequired";
import ProcessingRequired from "./pages/app/vision-models/ProcessingRequired";
import DeploymentRequired from "./pages/app/vision-models/DeploymentRequired";
import ValidationRequired from "./pages/app/vision-models/ValidationRequired";
import Complete from "./pages/app/vision-models/Complete";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <div className="safe-area-top safe-area-bottom safe-area-left safe-area-right min-h-screen">
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
              path="/reset-password" 
              element={
                <AuthGuard requireAuth={false}>
                  <ResetPassword />
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
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="my-work" element={<MyWork />} />
              <Route path="profile" element={<Profile />} />
              
              {/* Global Dashboards */}
              <Route path="global-dashboards/expansion-report" element={<ExpansionReport />} />
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
                path="projects/update-dates/:projectId" 
                element={
                  <AuthGuard requiredRole="internal_admin">
                    <UpdateProjectDates />
                  </AuthGuard>
                } 
              />
              <Route path="projects/:id" element={<ProjectDetail />} />
              <Route path="solutions" element={<SolutionsList />} />
              <Route 
                path="solutions/new" 
                element={
                  <AuthGuard requiredRole="internal_admin">
                    <NewSolutionsProject />
                  </AuthGuard>
                } 
              />
              <Route path="solutions/:id" element={<SolutionsProjectDetail />} />
              <Route path="actions" element={<Actions />} />
              <Route path="tasks" element={<GlobalTasks />} />
              <Route path="calendar" element={<GlobalCalendar />} />
              <Route path="models" element={<GlobalModels />} />
              <Route path="vision-models/footage-required" element={<InternalRoute>
                <FootageRequired />
              </InternalRoute>} />
              <Route path="vision-models/schedule-required" element={<InternalRoute>
                <ScheduleRequired />
              </InternalRoute>} />
              <Route path="vision-models/annotation-required" element={<InternalRoute>
                <AnnotationRequired />
              </InternalRoute>} />
              <Route path="vision-models/processing-required" element={<InternalRoute>
                <ProcessingRequired />
              </InternalRoute>} />
              <Route path="vision-models/deployment-required" element={<InternalRoute>
                <DeploymentRequired />
              </InternalRoute>} />
              <Route path="vision-models/validation-required" element={<InternalRoute>
                <ValidationRequired />
              </InternalRoute>} />
              <Route path="vision-models/complete" element={<InternalRoute>
                <Complete />
              </InternalRoute>} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="bau" element={<BAU />} />
              <Route path="bau/board-summary" element={<BAUBoardSummary />} />
              <Route 
                path="bau/new" 
                element={
                  <AuthGuard requiredRole="internal_admin">
                    <NewBAUCustomer />
                  </AuthGuard>
                } 
              />
              <Route path="bau/weekly-review" element={<WeeklyReview />} />
              <Route path="bau/weekly-review-page" element={<WeeklyReviewPage />} />
              <Route path="bau/:id" element={<BAUDetail />} />
              <Route path="implementation/weekly-review" element={<ImplementationWeeklyReview />} />
              <Route path="implementation/executive-summary" element={<InternalRoute><ExecutiveSummary /></InternalRoute>} />
              <Route path="implementation/board-summary" element={<InternalRoute><BoardSummary /></InternalRoute>} />
              <Route path="implementation/wbs" element={<WBS />} />
              <Route path="implementation/blockers" element={<InternalRoute>
                <ImplementationEscalations />
              </InternalRoute>} />
              <Route path="blockers" element={<InternalRoute>
                <ImplementationEscalations />
              </InternalRoute>} />
              <Route path="product-gaps" element={<InternalRoute>
                <ProductGaps />
              </InternalRoute>} />
              <Route path="feature-dashboard" element={<InternalRoute>
                <FeatureDashboard />
              </InternalRoute>} />
              <Route path="feature-requests" element={<InternalRoute>
                <FeatureRequests />
              </InternalRoute>} />
              <Route path="feature-requests/:id" element={<InternalRoute>
                <FeatureRequestDetail />
              </InternalRoute>} />
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
              <Route 
                path="admin/hardware" 
                element={
                  <AuthGuard requiredRole="internal_admin">
                    <HardwareManagement />
                  </AuthGuard>
                } 
              />
              <Route 
                path="admin/vision-use-cases" 
                element={
                  <AuthGuard requiredRole="internal_admin">
                    <VisionUseCases />
                  </AuthGuard>
                } 
              />
              <Route 
                path="admin/contact-roles" 
                element={
                  <AuthGuard requiredRole="internal_admin">
                    <ContactRolesManagement />
                  </AuthGuard>
                } 
              />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </div>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;