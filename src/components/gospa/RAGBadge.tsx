import { cn } from "@/lib/utils";
import type { GospaRag } from "@/lib/gospaService";

const styles: Record<GospaRag, string> = {
  red: "bg-destructive text-destructive-foreground",
  amber: "bg-yellow-500 text-white",
  green: "bg-green-600 text-white",
};

export function RAGBadge({ value, className }: { value: GospaRag; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", styles[value], className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-90" />
      {value.toUpperCase()}
    </span>
  );
}

export function RAGDot({ value, className }: { value: GospaRag; className?: string }) {
  const dot: Record<GospaRag, string> = {
    red: "bg-destructive",
    amber: "bg-yellow-500",
    green: "bg-green-600",
  };
  return <span className={cn("inline-block h-2.5 w-2.5 rounded-full", dot[value], className)} />;
}
