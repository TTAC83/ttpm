import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Upload, Download, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Combobox } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import { formatDateUK } from "@/lib/dateUtils";
import { blockersService, ImplementationBlocker, BlockerUpdate, BlockerAttachment } from "@/lib/blockersService";
import { toast } from "sonner";

const blockerSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  owner: z.string().min(1, "Owner is required"),
  estimated_complete_date: z.date().optional(),
});

type BlockerFormData = z.infer<typeof blockerSchema>;

interface BlockerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  blocker?: ImplementationBlocker;
  onSuccess: () => void;
}

export function BlockerDrawer({
  open,
  onOpenChange,
  projectId,
  blocker,
  onSuccess,
}: BlockerDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [updates, setUpdates] = useState<BlockerUpdate[]>([]);
  const [attachments, setAttachments] = useState<BlockerAttachment[]>([]);
  const [newNote, setNewNote] = useState("");
  const [internalUsers, setInternalUsers] = useState<{ user_id: string; name: string }[]>([]);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const form = useForm<BlockerFormData>({
    resolver: zodResolver(blockerSchema),
    defaultValues: {
      title: "",
      description: "",
      owner: "",
      estimated_complete_date: undefined,
    },
  });

  useEffect(() => {
    if (open) {
      loadInternalUsers();
      if (blocker) {
        form.reset({
          title: blocker.title,
          description: blocker.description || "",
          owner: blocker.owner,
          estimated_complete_date: blocker.estimated_complete_date 
            ? new Date(blocker.estimated_complete_date) 
            : undefined,
        });
        loadBlockerDetails();
      } else {
        form.reset({
          title: "",
          description: "",
          owner: "",
          estimated_complete_date: undefined,
        });
        setUpdates([]);
        setAttachments([]);
      }
    }
  }, [open, blocker]);

  const loadInternalUsers = async () => {
    try {
      const users = await blockersService.getInternalUsers();
      setInternalUsers(users);
    } catch (error) {
      console.error("Failed to load internal users:", error);
    }
  };

  const loadBlockerDetails = async () => {
    if (!blocker) return;
    try {
      const [updatesData, attachmentsData] = await Promise.all([
        blockersService.getBlockerUpdates(blocker.id),
        blockersService.getBlockerAttachments(blocker.id),
      ]);
      setUpdates(updatesData);
      setAttachments(attachmentsData);
    } catch (error) {
      console.error("Failed to load blocker details:", error);
    }
  };

  const onSubmit = async (data: BlockerFormData) => {
    setLoading(true);
    try {
      if (blocker) {
        await blockersService.updateBlocker(blocker.id, {
          title: data.title,
          description: data.description,
          owner: data.owner,
          estimated_complete_date: data.estimated_complete_date?.toISOString().split('T')[0],
        });
        toast.success("Blocker updated successfully");
      } else {
        await blockersService.createBlocker({
          project_id: projectId,
          title: data.title,
          description: data.description,
          owner: data.owner,
          estimated_complete_date: data.estimated_complete_date?.toISOString().split('T')[0],
        });
        toast.success("Blocker created successfully");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save blocker:", error);
      toast.error("Failed to save blocker");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseBlocker = async () => {
    if (!blocker || !resolutionNotes.trim()) return;
    setLoading(true);
    try {
      await blockersService.closeBlocker(blocker.id, resolutionNotes);
      toast.success("Blocker closed successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to close blocker:", error);
      toast.error("Failed to close blocker");
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!blocker || !newNote.trim()) return;
    try {
      await blockersService.addBlockerUpdate(blocker.id, newNote);
      setNewNote("");
      loadBlockerDetails();
      toast.success("Note added successfully");
    } catch (error) {
      console.error("Failed to add note:", error);
      toast.error("Failed to add note");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !blocker) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    try {
      await blockersService.uploadAttachment(blocker.id, file);
      loadBlockerDetails();
      toast.success("File uploaded successfully");
    } catch (error) {
      console.error("Failed to upload file:", error);
      toast.error("Failed to upload file");
    }
  };

  const handleDownload = async (attachment: BlockerAttachment) => {
    try {
      const data = await blockersService.downloadAttachment(attachment.file_path);
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download file:", error);
      toast.error("Failed to download file");
    }
  };

  const handleDeleteAttachment = async (attachment: BlockerAttachment) => {
    try {
      await blockersService.deleteAttachment(attachment.id, attachment.file_path);
      loadBlockerDetails();
      toast.success("File deleted successfully");
    } catch (error) {
      console.error("Failed to delete file:", error);
      toast.error("Failed to delete file");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] max-w-[90vw] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {blocker ? "Edit Implementation Blocker" : "Add Implementation Blocker"}
          </SheetTitle>
          <SheetDescription>
            {blocker ? `Raised ${formatDateUK(blocker.raised_at)}` : "Create a new implementation blocker"}
          </SheetDescription>
          {blocker && (
            <Badge variant={blocker.status === 'Live' ? 'destructive' : 'secondary'}>
              {blocker.status}
            </Badge>
          )}
        </SheetHeader>

        <div className="space-y-6 py-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter blocker title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Enter blocker description" rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="owner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner *</FormLabel>
                    <FormControl>
                      <Combobox
                        options={internalUsers.map(user => ({
                          value: user.user_id,
                          label: user.name
                        }))}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Select owner"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimated_complete_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Estimated Completion Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : blocker ? "Update Blocker" : "Create Blocker"}
                </Button>

                {blocker && blocker.status === 'Live' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline">Close Blocker</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Close Blocker</AlertDialogTitle>
                        <AlertDialogDescription>
                          Please provide resolution notes to close this blocker.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="my-4">
                        <Label htmlFor="resolution">Resolution Notes *</Label>
                        <Textarea
                          id="resolution"
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          placeholder="Describe how this blocker was resolved"
                          rows={3}
                          className="mt-2"
                        />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleCloseBlocker}
                          disabled={!resolutionNotes.trim() || loading}
                        >
                          Close Blocker
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </form>
          </Form>

          {blocker && (
            <>
              <Separator />

              {/* Update Notes Timeline */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Update Notes</h3>
                
                <div className="space-y-2 mb-4">
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add an update note..."
                    rows={2}
                  />
                  <Button
                    onClick={handleAddNote}
                    disabled={!newNote.trim()}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {updates.map((update) => (
                    <div key={update.id} className="border-l-2 border-muted pl-4 pb-3">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-sm">{update.author_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateUK(update.created_at)}
                        </span>
                      </div>
                      <p className="text-sm">{update.note}</p>
                    </div>
                  ))}
                  {updates.length === 0 && (
                    <p className="text-sm text-muted-foreground">No update notes yet.</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Attachments */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Attachments</h3>
                
                <div className="mb-4">
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:bg-muted/50 transition-colors">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload files (JPG, PNG, PDF • Max 10MB)
                      </p>
                    </div>
                    <Input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleFileUpload}
                    />
                  </Label>
                </div>

                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{attachment.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {attachment.size_bytes ? `${(attachment.size_bytes / 1024).toFixed(1)} KB` : ''} • 
                          {formatDateUK(attachment.uploaded_at)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownload(attachment)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteAttachment(attachment)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {attachments.length === 0 && (
                    <p className="text-sm text-muted-foreground">No attachments yet.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}