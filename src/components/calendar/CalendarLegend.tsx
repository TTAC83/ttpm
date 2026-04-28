const items = [
  { label: "Implementation", color: "#3b82f6" },
  { label: "Solutions", color: "#10b981" },
  { label: "Standalone", color: "#6b7280" },
  { label: "Critical", color: "#ef4444" },
];

export const CalendarLegend = () => (
  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
    {items.map((i) => (
      <div key={i.label} className="flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: i.color }} />
        <span>{i.label}</span>
      </div>
    ))}
  </div>
);

export default CalendarLegend;
