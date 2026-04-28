export type GospaGanttKind = "goal" | "objective" | "strategy" | "plan" | "action";

export type GospaGanttStatus = "not_started" | "in_progress" | "done" | "blocked" | "overdue";

export interface GospaGanttRow {
  key: string;                 // `${kind}:${id}`
  id: string;
  kind: GospaGanttKind;
  title: string;
  parentKey: string | null;    // parent row key
  depth: number;               // 0..4
  start: Date | null;
  end: Date | null;
  status: GospaGanttStatus;
  ownerLabel?: string | null;
  childKeys: string[];
  // raw refs for drawer
  raw?: any;
}

export interface GospaGanttTree {
  rows: Map<string, GospaGanttRow>;
  rootKeys: string[];
}
