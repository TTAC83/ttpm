import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { productGapsService, ProductGap } from "@/lib/productGapsService";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  user_id: string;
  name: string;
}

interface ProductGapDrawerProps {
  projectId?: string;
  productGap?: ProductGap;
  featureRequest?: any; // Feature request to link to
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function ProductGapDrawer({ projectId, productGap, featureRequest, open, onOpenChange, onSuccess, trigger }: ProductGapDrawerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ticketLink, setTicketLink] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("unassigned");
  const [isCritical, setIsCritical] = useState(false);
  const [estimatedCompleteDate, setEstimatedCompleteDate] = useState<Date>();
  const [status, setStatus] = useState<'Live' | 'Closed'>('Live');
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || "");
  const [selectedFeatureRequestId, setSelectedFeatureRequestId] = useState<string>("");

  // Load internal users for assignment
  const { data: profiles = [] } = useQuery({
    queryKey: ['internal-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name')
        .eq('is_internal', true)
        .order('name');
      
      if (error) throw error;
      return data as Profile[];
    }
  });

  // Load projects when we need to select one for feature request assignment
  const { data: projects = [] } = useQuery({
    queryKey: ['user-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, company_id')
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !projectId && featureRequest // Only load when we need to select a project
  });

  // Load feature requests for selection
  const { data: featureRequests = [] } = useQuery({
    queryKey: ['feature-requests-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_requests')
        .select('id, title, problem_statement')
        .order('title');
      
      if (error) throw error;
      return data;
    }
  });

  // Initialize form when productGap or featureRequest changes
  useEffect(() => {
    if (productGap) {
      setTitle(productGap.title);
      setDescription(productGap.description || "");
      setTicketLink(productGap.ticket_link || "");
      setAssignedTo(productGap.assigned_to || "unassigned");
      setIsCritical(productGap.is_critical);
      setEstimatedCompleteDate(productGap.estimated_complete_date ? new Date(productGap.estimated_complete_date) : undefined);
      setStatus(productGap.status);
      setResolutionNotes(productGap.resolution_notes || "");
      setSelectedFeatureRequestId(productGap.feature_request_id || "none");
    } else {
      // Reset form for new product gap
      setTitle(featureRequest ? `Feature Request: ${featureRequest.title}` : "");
      setDescription(featureRequest ? `Created from feature request: ${featureRequest.problem_statement || 'No problem statement provided'}` : "");
      setTicketLink("");
      setAssignedTo("unassigned");
      setIsCritical(false);
      setEstimatedCompleteDate(undefined);
      setStatus('Live');
      setResolutionNotes("");
      setSelectedProjectId(projectId || "");
      setSelectedFeatureRequestId(featureRequest?.id || "none");
    }
  }, [productGap, featureRequest, projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Validation for project selection when assigning from feature request
    if (!projectId && !selectedProjectId) {
      toast({
        title: "Error",
        description: "Please select a project for this product gap.",
        variant: "destructive",
      });
      return;
    }

    // Validation for closing
    if (status === 'Closed' && !resolutionNotes.trim()) {
      toast({
        title: "Error",
        description: "Resolution notes are required to close a product gap.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const productGapData = {
        project_id: projectId || selectedProjectId,
        title: title.trim(),
        description: description.trim() || undefined,
        ticket_link: ticketLink.trim() || undefined,
        assigned_to: assignedTo === "unassigned" ? undefined : assignedTo,
        is_critical: isCritical,
        estimated_complete_date: estimatedCompleteDate ? format(estimatedCompleteDate, 'yyyy-MM-dd') : undefined,
        status,
        resolution_notes: resolutionNotes.trim() || undefined,
        feature_request_id: selectedFeatureRequestId === "none" ? undefined : selectedFeatureRequestId || undefined,
      };

      if (productGap) {
        await productGapsService.updateProductGap(productGap.id, productGapData);
        toast({
          title: "Success",
          description: "Product gap updated successfully",
        });
      } else {
        await productGapsService.createProductGap(productGapData);
        toast({
          title: "Success",
          description: "Product gap created successfully",
        });
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['product-gaps'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-product-gaps'] });
      queryClient.invalidateQueries({ queryKey: ['project-product-gaps'] });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error saving product gap:', error);
      toast({
        title: "Error",
        description: "Failed to save product gap",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const sheetContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter product gap title"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the product gap"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ticket-link">Ticket Link</Label>
        <Input
          id="ticket-link"
          value={ticketLink}
          onChange={(e) => setTicketLink(e.target.value)}
          placeholder="Link to related ticket"
        />
      </div>

      {!projectId && featureRequest && (
        <div className="space-y-2">
          <Label htmlFor="project">Project *</Label>
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="feature-request">Feature Request</Label>
        <Select value={selectedFeatureRequestId} onValueChange={setSelectedFeatureRequestId}>
          <SelectTrigger>
            <SelectValue placeholder="Select feature request (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {featureRequests.map((request) => (
              <SelectItem key={request.id} value={request.id}>
                {request.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="assigned-to">Assigned To</Label>
        <Select value={assignedTo} onValueChange={setAssignedTo}>
          <SelectTrigger>
            <SelectValue placeholder="Select assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {profiles.map((profile) => (
              <SelectItem key={profile.user_id} value={profile.user_id}>
                {profile.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="estimated-date">Estimated Completion Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !estimatedCompleteDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {estimatedCompleteDate ? format(estimatedCompleteDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={estimatedCompleteDate}
              onSelect={setEstimatedCompleteDate}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={status} onValueChange={(value: 'Live' | 'Closed') => setStatus(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Live">Live</SelectItem>
            <SelectItem value="Closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {status === 'Closed' && (
        <div className="space-y-2">
          <Label htmlFor="resolution-notes">Resolution Notes *</Label>
          <Textarea
            id="resolution-notes"
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            placeholder="Describe how this product gap was resolved"
            rows={3}
            required={status === 'Closed'}
          />
        </div>
      )}

      <div className="flex items-center space-x-2">
        <Checkbox
          id="critical"
          checked={isCritical}
          onCheckedChange={(checked) => setIsCritical(checked as boolean)}
        />
        <Label htmlFor="critical">Critical</Label>
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !title.trim()}
          className="flex-1"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {productGap ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );

  if (trigger) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          {trigger}
        </SheetTrigger>
        <SheetContent className="w-[600px] max-w-[90vw] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {productGap ? "Edit Product Gap" : "Create Product Gap"}
            </SheetTitle>
            <SheetDescription>
              {productGap ? "Update the product gap details" : "Create a new product gap for this project"}
            </SheetDescription>
          </SheetHeader>
          {sheetContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] max-w-[90vw] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {productGap ? "Edit Product Gap" : "Create Product Gap"}
          </SheetTitle>
          <SheetDescription>
            {productGap ? "Update the product gap details" : "Create a new product gap for this project"}
          </SheetDescription>
        </SheetHeader>
        {sheetContent}
      </SheetContent>
    </Sheet>
  );
}