import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { 
  FeatureRequestWithProfile, 
  featureRequestsService 
} from "@/lib/featureRequestsService";
import { FeatureRequestDialog } from "@/components/FeatureRequestDialog";

export default function FeatureRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [featureRequest, setFeatureRequest] = useState<FeatureRequestWithProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const loadFeatureRequest = async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      const data = await featureRequestsService.getFeatureRequestById(id);
      if (!data) {
        toast.error("Feature request not found");
        navigate("/app/feature-requests");
        return;
      }
      setFeatureRequest(data);
    } catch (error) {
      console.error('Error loading feature request:', error);
      toast.error("Failed to load feature request");
      navigate("/app/feature-requests");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeatureRequest();
  }, [id]);

  const handleEdit = () => {
    setEditDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!featureRequest) return;
    
    try {
      await featureRequestsService.deleteFeatureRequest(featureRequest.id);
      toast.success("Feature request deleted successfully");
      navigate("/app/feature-requests");
    } catch (error) {
      console.error('Error deleting feature request:', error);
      toast.error("Failed to delete feature request");
    }
  };

  const handleEditSuccess = () => {
    loadFeatureRequest();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/app/feature-requests")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Feature Requests
          </Button>
        </div>
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Loading feature request...</p>
        </div>
      </div>
    );
  }

  if (!featureRequest) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/app/feature-requests")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Feature Requests
          </Button>
        </div>
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Feature request not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/app/feature-requests")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Feature Requests
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the feature request.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <CardTitle className="text-2xl">{featureRequest.title}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Created by {featureRequest.creator?.name || 'Unknown'}</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(featureRequest.created_at), { addSuffix: true })}</span>
                  {featureRequest.updated_at !== featureRequest.created_at && (
                    <>
                      <span>•</span>
                      <span>Updated {formatDistanceToNow(new Date(featureRequest.updated_at), { addSuffix: true })}</span>
                    </>
                  )}
                </div>
              </div>
              <Badge variant={featureRequestsService.getStatusBadgeVariant(featureRequest.status)}>
                {featureRequest.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {featureRequest.problem_statement && (
              <div>
                <h3 className="font-semibold mb-2">Problem Statement</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{featureRequest.problem_statement}</p>
              </div>
            )}

            {(featureRequest.user_story_role || featureRequest.user_story_goal || featureRequest.user_story_outcome) && (
              <div>
                <h3 className="font-semibold mb-2">User Story</h3>
                <div className="space-y-2 text-muted-foreground">
                  {featureRequest.user_story_role && (
                    <p><span className="font-medium">I am a:</span> {featureRequest.user_story_role}</p>
                  )}
                  {featureRequest.user_story_goal && (
                    <p><span className="font-medium">I would like:</span> {featureRequest.user_story_goal}</p>
                  )}
                  {featureRequest.user_story_outcome && (
                    <p><span className="font-medium">So I can:</span> {featureRequest.user_story_outcome}</p>
                  )}
                </div>
              </div>
            )}

            {featureRequest.solution_overview && (
              <div>
                <h3 className="font-semibold mb-2">Solution Overview</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{featureRequest.solution_overview}</p>
              </div>
            )}

            {featureRequest.requirements && (
              <div>
                <h3 className="font-semibold mb-2">Requirements</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{featureRequest.requirements}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <FeatureRequestDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        featureRequest={featureRequest}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}