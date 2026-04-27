import { cn } from "@/lib/utils";
import type { GospaStatus } from "@/lib/gospaService";

const styles: Record<GospaStatus, string> = {
  not_started: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  blocked: "bg-destructive/15 text-destructive",
  done: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200",
};

const labels: Record<GospaStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
};

const isGospaStatus = (value: unknown): value is GospaStatus =>
  value === "not_started" || value === "in_progress" || value === "blocked" || value === "done";

export function StatusPill({ value, className }: { value: GospaStatus | null | undefined; className?: string }) {
  const v: GospaStatus = isGospaStatus(value) ? value : "not_started";
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", styles[v], className)}>
      {labels[v]}
    </span>
  );
}
