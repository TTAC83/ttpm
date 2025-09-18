import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  CreateFeatureRequestInput, 
  UpdateFeatureRequestInput, 
  FeatureRequest,
  FeatureRequestStatus,
  featureRequestsService 
} from "@/lib/featureRequestsService";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  problem_statement: z.string().optional(),
  user_story_role: z.string().optional(),
  user_story_goal: z.string().optional(),
  user_story_outcome: z.string().optional(),
  solution_overview: z.string().optional(),
  requirements: z.string().optional(),
  status: z.enum(['Requested', 'Rejected', 'In Design', 'In Dev', 'Complete'] as const).default('Requested'),
});

type FormData = z.infer<typeof formSchema>;

interface FeatureRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureRequest?: FeatureRequest | null;
  onSuccess: () => void;
}

export function FeatureRequestDialog({
  open,
  onOpenChange,
  featureRequest,
  onSuccess,
}: FeatureRequestDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!featureRequest;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: featureRequest?.title || "",
      problem_statement: featureRequest?.problem_statement || "",
      user_story_role: featureRequest?.user_story_role || "",
      user_story_goal: featureRequest?.user_story_goal || "",
      user_story_outcome: featureRequest?.user_story_outcome || "",
      solution_overview: featureRequest?.solution_overview || "",
      requirements: featureRequest?.requirements || "",
      status: (featureRequest?.status as FeatureRequestStatus) || 'Requested',
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      if (isEditing && featureRequest) {
        await featureRequestsService.updateFeatureRequest({
          id: featureRequest.id,
          ...data,
        } as UpdateFeatureRequestInput);
        toast.success("Feature request updated successfully");
      } else {
        await featureRequestsService.createFeatureRequest(data as CreateFeatureRequestInput);
        toast.success("Feature request created successfully");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving feature request:', error);
      toast.error("Failed to save feature request");
    } finally {
      setIsLoading(false);
    }
  };

  const statusOptions: FeatureRequestStatus[] = ['Requested', 'Rejected', 'In Design', 'In Dev', 'Complete'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Feature Request" : "New Feature Request"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update the feature request details." 
              : "Create a new feature request to suggest improvements or new functionality."
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief description of the feature" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="problem_statement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Problem Statement</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="What problem does this feature solve?"
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormLabel className="text-base font-medium">User Story</FormLabel>
              <div className="grid gap-4">
                <FormField
                  control={form.control}
                  name="user_story_role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>I am a...</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., project manager, engineer, customer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="user_story_goal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>I would like...</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., to be able to export reports" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="user_story_outcome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>So I can...</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., share progress with stakeholders" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="solution_overview"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Solution Overview</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="High-level description of how this could be implemented"
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Requirements</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Detailed requirements, acceptance criteria, or specifications"
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : isEditing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}