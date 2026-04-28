import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DatePicker } from "@/components/ui/date-picker";
import { Combobox } from "@/components/ui/combobox";
import { MultiSelectCombobox } from "@/components/ui/multi-select-combobox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import {
  calendarEventsService,
  CalendarEvent,
  EventScope,
} from "@/lib/calendarEventsService";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill the start/end dates (e.g. clicked from a calendar cell) */
  defaultDate?: Date | null;
  /** Existing event for edit mode */
  editingEvent?: CalendarEvent | null;
  onSaved?: () => void;
}

export default function CreateGlobalEventDialog({
  open,
  onOpenChange,
  defaultDate,
  editingEvent,
  onSaved,
}: Props) {
  const { profile, user } = useAuth();
  const { toast } = useToast();

  const isInternal = !!profile?.is_internal;

  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isCritical, setIsCritical] = useState(false);
  const [scope, setScope] = useState<EventScope>("implementation");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [projectId, setProjectId] = useState<string>("");
  const [solutionsProjectId, setSolutionsProjectId] = useState<string>("");
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);

  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; company_id: string | null; company_name: string | null }[]>([]);
  const [solProjects, setSolProjects] = useState<{ id: string; name: string; company_id: string | null; company_name: string | null }[]>([]);
  const [internalUsers, setInternalUsers] = useState<{ user_id: string; name: string | null }[]>([]);

  // Reset form whenever the dialog opens
  useEffect(() => {
    if (!open) return;

    if (editingEvent) {
      setTitle(editingEvent.title);
      setDescription(editingEvent.description ?? "");
      setStartDate(editingEvent.start_date ? new Date(editingEvent.start_date) : null);
      setEndDate(editingEvent.end_date ? new Date(editingEvent.end_date) : null);
      setIsCritical(editingEvent.is_critical);
      setScope(editingEvent.scope);
      setCompanyFilter(editingEvent.company_id ?? "all");
      setProjectId(editingEvent.project_id ?? "");
      setSolutionsProjectId(editingEvent.solutions_project_id ?? "");
      setAttendeeIds(editingEvent.attendees.map((a) => a.user_id));
    } else {
      setTitle("");
      setDescription("");
      setStartDate(defaultDate ?? null);
      setEndDate(defaultDate ?? null);
      setIsCritical(false);
      setScope("implementation");
      setCompanyFilter("all");
      setProjectId("");
      setSolutionsProjectId("");
      setAttendeeIds([]);
    }
  }, [open, editingEvent, defaultDate]);

  // Load reference data once when opening
  useEffect(() => {
    if (!open) return;
    Promise.all([
      calendarEventsService.listCompanies(),
      calendarEventsService.listInternalUsers(),
    ]).then(([c, u]) => {
      setCompanies(c);
      setInternalUsers(u);
    });
  }, [open]);

  // Reload projects when scope or company filter changes
  useEffect(() => {
    if (!open) return;
    if (scope === "implementation") {
      calendarEventsService.listSelectableProjects(companyFilter).then(setProjects);
    } else if (scope === "solutions") {
      calendarEventsService.listSelectableSolutionsProjects(companyFilter).then(setSolProjects);
    }
  }, [open, scope, companyFilter]);

  // If selected project no longer matches the company filter, clear it
  useEffect(() => {
    if (scope === "implementation" && projectId) {
      const stillValid = projects.some((p) => p.id === projectId);
      if (!stillValid && projects.length) setProjectId("");
    }
    if (scope === "solutions" && solutionsProjectId) {
      const stillValid = solProjects.some((p) => p.id === solutionsProjectId);
      if (!stillValid && solProjects.length) setSolutionsProjectId("");
    }
  }, [projects, solProjects, scope, projectId, solutionsProjectId]);

  const selectedProjectCompany = useMemo(() => {
    if (scope === "implementation") return projects.find((p) => p.id === projectId)?.company_name ?? null;
    if (scope === "solutions") return solProjects.find((p) => p.id === solutionsProjectId)?.company_name ?? null;
    return null;
  }, [scope, projects, solProjects, projectId, solutionsProjectId]);

  const projectOptions = useMemo(
    () => projects.map((p) => ({ value: p.id, label: p.company_name ? `${p.company_name} — ${p.name}` : p.name })),
    [projects]
  );
  const solOptions = useMemo(
    () => solProjects.map((p) => ({ value: p.id, label: p.company_name ? `${p.company_name} — ${p.name}` : p.name })),
    [solProjects]
  );
  const attendeeOptions = useMemo(
    () => internalUsers.map((u) => ({ value: u.user_id, label: u.name ?? "Unknown user" })),
    [internalUsers]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!title || !startDate || !endDate) {
      toast({ title: "Missing required fields", description: "Title, start date and end date are required.", variant: "destructive" });
      return;
    }
    if (scope === "implementation" && !projectId) {
      toast({ title: "Pick a project", description: "Choose an Implementation project or change the scope.", variant: "destructive" });
      return;
    }
    if (scope === "solutions" && !solutionsProjectId) {
      toast({ title: "Pick a project", description: "Choose a Solutions project or change the scope.", variant: "destructive" });
      return;
    }
    if (scope === "standalone" && !isInternal) {
      toast({ title: "Not allowed", description: "Standalone events are internal-only.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (editingEvent) {
        await calendarEventsService.updateEvent(editingEvent.id, {
          title,
          description: description || null,
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: format(endDate, "yyyy-MM-dd"),
          is_critical: isCritical,
          scope,
          project_id: scope === "implementation" ? projectId : null,
          solutions_project_id: scope === "solutions" ? solutionsProjectId : null,
          attendee_user_ids: attendeeIds,
        });
        toast({ title: "Event updated" });
      } else {
        await calendarEventsService.createEvent({
          title,
          description: description || null,
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: format(endDate, "yyyy-MM-dd"),
          is_critical: isCritical,
          scope,
          project_id: scope === "implementation" ? projectId : null,
          solutions_project_id: scope === "solutions" ? solutionsProjectId : null,
          attendee_user_ids: attendeeIds,
          created_by: user.id,
        });
        toast({ title: "Event created" });
      }
      onOpenChange(false);
      onSaved?.();
    } catch (err: any) {
      toast({ title: "Save failed", description: err?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingEvent ? "Edit event" : "New calendar event"}</DialogTitle>
          <DialogDescription>
            Attach to an Implementation project, a Solutions project, or leave standalone for an internal-only event.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="flex items-end gap-2">
              <Checkbox id="critical" checked={isCritical} onCheckedChange={(c) => setIsCritical(!!c)} />
              <Label htmlFor="critical" className="mb-2">Critical event</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Start date *</Label>
              <DatePicker value={startDate} onChange={(d) => setStartDate(d)} placeholder="Select start date" required />
            </div>
            <div className="space-y-2">
              <Label>End date *</Label>
              <DatePicker value={endDate} onChange={(d) => setEndDate(d)} placeholder="Select end date" required />
            </div>
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <Label className="text-sm">Scope</Label>
            <RadioGroup value={scope} onValueChange={(v) => setScope(v as EventScope)} className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="implementation" id="scope-impl" />
                <Label htmlFor="scope-impl" className="font-normal">Implementation project</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="solutions" id="scope-sol" />
                <Label htmlFor="scope-sol" className="font-normal">Solutions project</Label>
              </div>
              {isInternal && (
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="standalone" id="scope-none" />
                  <Label htmlFor="scope-none" className="font-normal">Standalone (internal only)</Label>
                </div>
              )}
            </RadioGroup>

            {scope !== "standalone" && (
              <div className="grid gap-3 md:grid-cols-2 pt-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Filter by company</Label>
                  <Combobox
                    options={[{ value: "all", label: "All companies" }, ...companies.map((c) => ({ value: c.id, label: c.name }))]}
                    value={companyFilter}
                    onValueChange={(v) => setCompanyFilter(v || "all")}
                    placeholder="All companies"
                    searchPlaceholder="Search companies..."
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {scope === "implementation" ? "Implementation project *" : "Solutions project *"}
                  </Label>
                  <Combobox
                    options={scope === "implementation" ? projectOptions : solOptions}
                    value={scope === "implementation" ? projectId : solutionsProjectId}
                    onValueChange={(v) => (scope === "implementation" ? setProjectId(v) : setSolutionsProjectId(v))}
                    placeholder="Select project"
                    searchPlaceholder="Search projects..."
                  />
                  {selectedProjectCompany && (
                    <div className="text-xs text-muted-foreground pt-1">
                      Company: <Badge variant="outline">{selectedProjectCompany}</Badge>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Attendees</Label>
            <MultiSelectCombobox
              options={attendeeOptions}
              selected={attendeeIds}
              onSelectionChange={setAttendeeIds}
              placeholder="Select attendees..."
              searchPlaceholder="Search team..."
              emptyMessage="No users found."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : editingEvent ? "Save changes" : "Create event"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
