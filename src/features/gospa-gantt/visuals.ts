import type { GospaGanttRow, GospaGanttStatus } from "./types";

// Colour map -> HSL using semantic tokens via Tailwind classes is preferred,
// but SVG <rect fill> needs raw colour. We use tailwind palette-aligned HSL strings.
export const STATUS_COLOURS: Record<GospaGanttStatus, { fill: string; text: string; label: string }> = {
  not_started: { fill: "hsl(220 9% 70%)", text: "hsl(0 0% 100%)", label: "Not started" },
  in_progress: { fill: "hsl(217 91% 60%)", text: "hsl(0 0% 100%)", label: "In progress" },
  done:        { fill: "hsl(142 71% 38%)", text: "hsl(0 0% 100%)", label: "Done" },
  blocked:     { fill: "hsl(0 84% 55%)",   text: "hsl(0 0% 100%)", label: "Blocked" },
  overdue:     { fill: "hsl(25 95% 53%)",  text: "hsl(0 0% 100%)", label: "Overdue" },
};

export const KIND_LABEL: Record<GospaGanttRow["kind"], string> = {
  goal: "Goal",
  objective: "Objective",
  strategy: "Strategy",
  plan: "Plan",
  action: "Action",
};

export const KIND_BADGE_BG: Record<GospaGanttRow["kind"], string> = {
  goal:      "bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200",
  objective: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  strategy:  "bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200",
  plan:      "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  action:    "bg-muted text-muted-foreground",
};
