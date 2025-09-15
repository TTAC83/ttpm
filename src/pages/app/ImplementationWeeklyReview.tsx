import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ensureWeeks, listWeeks, listImplCompanies, loadOverdueTasks, loadOpenActions, loadEventsAroundWeek, loadReview, saveReview } from "@/lib/implementationWeekly";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

type Company = { company_id: string; company_name: string };
type Week = { week_start: string; week_end: string; available_at: string };

function formatWeekLabel(w: Week) {
  return new Date(w.week_start + "T00:00:00").toLocaleDateString('en-GB', { 
    weekday: "short", 
    day: "2-digit", 
    month: "short",
    timeZone: 'Europe/London'
  });
}

export default function ImplementationWeeklyReviewPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // Ensure weeks exist (current + next)
  useEffect(() => { 
    ensureWeeks().catch((error) => {
      console.error("Failed to ensure weeks:", error);
    }); 
  }, []);

  const weeksQ = useQuery({
    queryKey: ["impl-weeks"],
    queryFn: listWeeks,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const companiesQ = useQuery({
    queryKey: ["impl-companies"],
    queryFn: listImplCompanies,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (!selectedWeek && weeksQ.data && weeksQ.data.length > 0) {
      setSelectedWeek(weeksQ.data[0].week_start); // latest first
    }
  }, [weeksQ.data, selectedWeek]);

  useEffect(() => {
    if (!selectedCompanyId && companiesQ.data && companiesQ.data.length > 0) {
      setSelectedCompanyId(companiesQ.data[0].company_id);
    }
  }, [companiesQ.data, selectedCompanyId]);

  const filteredCompanies = useMemo(() => {
    const list = companiesQ.data ?? [];
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(c => c.company_name.toLowerCase().includes(q));
  }, [companiesQ.data, search]);

  // Debug logging
  console.log("weeksQ:", { data: weeksQ.data, isLoading: weeksQ.isLoading, error: weeksQ.error });
  console.log("companiesQ:", { data: companiesQ.data, isLoading: companiesQ.isLoading, error: companiesQ.error });

  return (
    <div className="p-4 space-y-4">
      {/* Debug Information */}
      {(weeksQ.isLoading || companiesQ.isLoading) && (
        <Card className="p-3 bg-blue-50">
          <div>Loading data...</div>
        </Card>
      )}
      
      {(weeksQ.error || companiesQ.error) && (
        <Card className="p-3 bg-red-50">
          <div>Error loading data:</div>
          {weeksQ.error && <div>Weeks: {(weeksQ.error as Error).message}</div>}
          {companiesQ.error && <div>Companies: {(companiesQ.error as Error).message}</div>}
        </Card>
      )}

      {/* Header */}
      <Card className="p-3 sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex gap-3 items-center flex-wrap">
          <h1 className="text-lg font-semibold">Implementation — Weekly Review</h1>
          <div className="ml-auto flex gap-2 items-center">
            {/* Week selector */}
            <select
              className="border rounded px-2 py-1"
              value={selectedWeek ?? ""}
              onChange={(e) => setSelectedWeek(e.target.value || null)}
            >
              <option value="">Select a week...</option>
              {(weeksQ.data ?? []).map(w => (
                <option key={w.week_start} value={w.week_start}>
                  {formatWeekLabel(w)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-12 gap-4">
        {/* LEFT: Companies */}
        <div className="col-span-12 md:col-span-3">
          <Card className="p-3 space-y-3">
            <Input placeholder="Search customers…" value={search} onChange={(e)=>setSearch(e.target.value)} />
            <div className="max-h-[70vh] overflow-auto space-y-1">
              {(filteredCompanies ?? []).map((c: Company) => (
                <button
                  key={c.company_id}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md hover:opacity-90",
                    selectedCompanyId === c.company_id ? "ring-1" : "opacity-80"
                  )}
                  onClick={()=>setSelectedCompanyId(c.company_id)}
                >
                  <div className="font-medium">{c.company_name}</div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* RIGHT: Panels */}
        <div className="col-span-12 md:col-span-9 space-y-4">
          {selectedCompanyId && selectedWeek ? (
            <CompanyWeeklyPanel companyId={selectedCompanyId} weekStart={selectedWeek} />
          ) : (
            <Card className="p-6">Select a week and a customer to begin.</Card>
          )}
        </div>
      </div>
    </div>
  );
}

function CompanyWeeklyPanel({ companyId, weekStart }: { companyId: string; weekStart: string }) {
  const qc = useQueryClient();

  const overdueQ = useQuery({
    queryKey: ["impl-overdue", companyId],
    queryFn: () => loadOverdueTasks(companyId),
  });

  const actionsQ = useQuery({
    queryKey: ["impl-actions", companyId],
    queryFn: () => loadOpenActions(companyId),
  });

  const eventsQ = useQuery({
    queryKey: ["impl-events", companyId, weekStart],
    queryFn: () => loadEventsAroundWeek(companyId, weekStart),
  });

  const reviewQ = useQuery({
    queryKey: ["impl-review", companyId, weekStart],
    queryFn: () => loadReview(companyId, weekStart),
  });

  const [projectStatus, setProjectStatus] = useState<"on_track"|"off_track"|null>(null);
  const [customerHealth, setCustomerHealth] = useState<"green"|"red"|null>(null);
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (reviewQ.data) {
      setProjectStatus(reviewQ.data.project_status ?? null);
      setCustomerHealth(reviewQ.data.customer_health ?? null);
      setNotes(reviewQ.data.notes ?? "");
    } else {
      setProjectStatus(null);
      setCustomerHealth(null);
      setNotes("");
    }
  }, [reviewQ.data, companyId, weekStart]);

  const mut = useMutation({
    mutationFn: () => saveReview({
      companyId,
      weekStartISO: weekStart,
      projectStatus,
      customerHealth,
      notes,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["impl-review", companyId, weekStart] });
      toast.success("Weekly review saved");
    },
    onError: (e:any) => toast.error(e.message ?? "Failed to save review"),
  });

  return (
    <div className="space-y-6">
      {/* Overdue Tasks */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Overdue Tasks</h2>
          <span className="text-sm opacity-75">{overdueQ.data?.length ?? 0} items</span>
        </div>
        <Separator className="my-3" />
        {overdueQ.isLoading ? (
          <div>Loading…</div>
        ) : (overdueQ.data?.length ?? 0) === 0 ? (
          <div>No overdue tasks 🎉</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="py-2 pr-3">Task</th>
                  <th className="py-2 pr-3">Step</th>
                  <th className="py-2 pr-3">Assignee</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Planned End</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {overdueQ.data!.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="py-2 pr-3">{t.task_title ?? "-"}</td>
                    <td className="py-2 pr-3">{t.step_name ?? "-"}</td>
                    <td className="py-2 pr-3">{t.assignee ?? "-"}</td>
                    <td className="py-2 pr-3">{t.status ?? "-"}</td>
                    <td className="py-2 pr-3">{t.planned_end ?? "-"}</td>
                    <td className="py-2 pr-3">
                      {/* Hook up to your existing Edit Task flow; replace with your component/navigation */}
                      <Button variant="outline" onClick={()=>{
                        // Example: navigate(`/app/projects/task/${t.id}?from=impl-weekly`)
                        // Or open your existing modal:
                        // openEditTaskModal(t.id, { onClose: ()=> overdueQ.refetch() })
                        toast.message("Open your existing Edit Task UI for task " + t.id);
                      }}>Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Action Review */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Actions (Open / In Progress)</h2>
          <span className="text-sm opacity-75">{actionsQ.data?.length ?? 0} items</span>
        </div>
        <Separator className="my-3" />
        {actionsQ.isLoading ? (
          <div>Loading…</div>
        ) : (actionsQ.data?.length ?? 0) === 0 ? (
          <div>No open actions</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="py-2 pr-3">Title</th>
                  <th className="py-2 pr-3">Assignee</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Planned Date</th>
                  <th className="py-2 pr-3">Critical</th>
                </tr>
              </thead>
              <tbody>
                {actionsQ.data!.map(a => (
                  <tr key={a.id} className="border-t">
                    <td className="py-2 pr-3">{a.title ?? "-"}</td>
                    <td className="py-2 pr-3">{a.assignee ?? "-"}</td>
                    <td className="py-2 pr-3">{a.status ?? "-"}</td>
                    <td className="py-2 pr-3">{a.planned_date ?? "-"}</td>
                    <td className="py-2 pr-3">{a.is_critical ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Events Window */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Events (±7 days)</h2>
          <span className="text-sm opacity-75">{eventsQ.data?.length ?? 0} items</span>
        </div>
        <Separator className="my-3" />
        {eventsQ.isLoading ? (
          <div>Loading…</div>
        ) : (eventsQ.data?.length ?? 0) === 0 ? (
          <div>No events in window</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="py-2 pr-3">Title</th>
                  <th className="py-2 pr-3">Start</th>
                  <th className="py-2 pr-3">End</th>
                  <th className="py-2 pr-3">Critical</th>
                  <th className="py-2 pr-3">Created By</th>
                </tr>
              </thead>
              <tbody>
                {eventsQ.data!.map(e => (
                  <tr key={e.id} className="border-t">
                    <td className="py-2 pr-3">{e.title ?? "-"}</td>
                    <td className="py-2 pr-3">{e.start_date ?? "-"}</td>
                    <td className="py-2 pr-3">{e.end_date ?? "-"}</td>
                    <td className="py-2 pr-3">{e.is_critical ? "Yes" : "No"}</td>
                    <td className="py-2 pr-3">{e.created_by ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Weekly Review Controls */}
      <Card className="p-4 space-y-4">
        <h2 className="font-semibold">Weekly Review</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div className="text-sm mb-1">Project Status</div>
            <div className="flex gap-2">
              <Button variant={projectStatus === "on_track" ? "default":"outline"} onClick={()=>setProjectStatus("on_track")}>On track</Button>
              <Button variant={projectStatus === "off_track" ? "default":"outline"} onClick={()=>setProjectStatus("off_track")}>Off track</Button>
            </div>
          </div>
          <div>
            <div className="text-sm mb-1">Customer Health</div>
            <div className="flex gap-2">
              <Button variant={customerHealth === "green" ? "default":"outline"} onClick={()=>setCustomerHealth("green")}>Green</Button>
              <Button variant={customerHealth === "red" ? "default":"outline"} onClick={()=>setCustomerHealth("red")}>Red</Button>
            </div>
          </div>
          <div className="md:col-span-3">
            <div className="text-sm mb-1">Notes / Escalation (optional)</div>
            <textarea className="w-full border rounded px-2 py-1 min-h-[90px]" value={notes} onChange={(e)=>setNotes(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={()=>mut.mutate()} disabled={mut.isPending || !projectStatus || !customerHealth}>Save</Button>
          <Button
            variant="outline"
            onClick={async ()=>{
              await mut.mutateAsync();
              // Advance to next company in outer list by dispatching a custom event;
              // The outer list can listen and move selection. If not implemented, keep simple toast:
              toast.message("Saved. Select the next customer from the list.");
            }}
            disabled={mut.isPending || !projectStatus || !customerHealth}
          >
            Save & Next
          </Button>
        </div>
      </Card>
    </div>
  );
}
