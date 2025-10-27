import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { featureRequestsService } from "@/lib/featureRequestsService";

interface DeleteFeatureRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureRequest: {
    id: string;
    title: string;
  } | null;
  onSuccess: () => void;
}

export function DeleteFeatureRequestDialog({
  open,
  onOpenChange,
  featureRequest,
  onSuccess,
}: DeleteFeatureRequestDialogProps) {
  const [password, setPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (password !== "Office365") {
      toast({
        title: "Error",
        description: "Incorrect password",
        variant: "destructive",
      });
      return;
    }

    if (!featureRequest) return;

    setIsDeleting(true);
    try {
      await featureRequestsService.deleteFeatureRequest(featureRequest.id);
      
      toast({
        title: "Success",
        description: "Feature request deleted successfully",
      });

      handleCancel();
      onSuccess();
    } catch (error) {
      console.error("Error deleting feature request:", error);
      toast({
        title: "Error",
        description: "Failed to delete feature request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setPassword("");
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete Feature Request
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete "{featureRequest?.title}".
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="delete-password">
              Enter password to confirm deletion:
            </Label>
            <Input
              id="delete-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleDelete();
                }
              }}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Feature Request"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
