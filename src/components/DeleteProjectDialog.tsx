import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, AlertTriangle } from 'lucide-react';

interface DeleteProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  onSuccess: () => void;
}

export const DeleteProjectDialog = ({ 
  open, 
  onOpenChange, 
  projectId, 
  projectName, 
  onSuccess 
}: DeleteProjectDialogProps) => {
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (password !== 'Office365') {
      toast({
        title: 'Invalid Password',
        description: 'The delete password is incorrect.',
        variant: 'destructive',
      });
      return;
    }

    setIsDeleting(true);
    
    try {
      const { error } = await supabase.functions.invoke('delete-project', {
        body: { projectId }
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Project Deleted',
        description: `${projectName} and all related data have been permanently deleted.`,
      });

      onSuccess();
      onOpenChange(false);
      setPassword('');
    } catch (error: any) {
      console.error('Error deleting project:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete project. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setPassword('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Project
          </DialogTitle>
          <DialogDescription className="text-left space-y-2">
            <p>
              You are about to permanently delete <strong>{projectName}</strong> and all of its related data.
            </p>
            <p className="text-sm text-red-600 font-medium">
              This action cannot be undone. All project data including tasks, lines, equipment, 
              vision models, events, and attachments will be permanently removed.
            </p>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="deletePassword">
              Enter delete password to confirm:
            </Label>
            <Input
              id="deletePassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter delete password"
              className="w-full"
            />
          </div>
        </div>

        <DialogFooter>
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
            disabled={isDeleting || !password}
            className="gap-2"
          >
            {isDeleting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete Project
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};