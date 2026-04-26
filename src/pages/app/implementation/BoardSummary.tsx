import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchExecutiveSummaryData, type ExecutiveSummaryRow } from "@/lib/executiveSummaryService";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TableHeaderFilter, SortDirection, FilterOption } from "@/components/ui/table-header-filter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDown, FileSpreadsheet, CheckCircle2, XCircle, Circle } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { format, differenceInMonths, differenceInWeeks, differenceInDays, addMonths, addWeeks } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

type ColumnKey =
  | 'domain'
  | 'project_classification'
  | 'customer_name'
  | 'customer_health'
  | 'project_on_track'
  | 'project_name'
  | 'live_status'
  | 'weekly_summary'
  | 'project_age'
  | 'contract_start_date'
  | 'planned_go_live_date'
  | 'time_to_first_value_weeks'
  | 'time_to_meaningful_adoption_weeks'
  | 'implementation_lead_name'
  | 'tech_lead_name'
  | 'tech_sponsor_name';

const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'domain', label: 'Domain' },
  { key: 'project_classification', label: 'Project / Product' },
  { key: 'customer_name', label: 'Customer Name' },
  { key: 'weekly_summary', label: 'Weekly Summary' },
  { key: 'customer_health', label: 'Health' },
  { key: 'project_on_track', label: 'On Track' },
  { key: 'project_name', label: 'Project / Site' },
  { key: 'live_status', label: 'Live Status' },
  { key: 'project_age', label: 'Project Age' },
  { key: 'contract_start_date', label: 'Contract Start' },
  { key: 'planned_go_live_date', label: 'Planned Go Live' },
  { key: 'time_to_first_value_weeks', label: 'Time to First Value (wks)' },
  { key: 'time_to_meaningful_adoption_weeks', label: 'Time to Meaningful Adoption (wks)' },
  { key: 'implementation_lead_name', label: 'Implementation Lead' },
  { key: 'tech_lead_name', label: 'Dev/Tech Lead' },
  { key: 'tech_sponsor_name', label: 'Dev/Tech Sponsor' },
];

const healthLabel = (row: { customer_health: string | null }): string =>
  row.customer_health === 'red' ? 'Red' : 'Green';

const isLiveRow = (row: { live_status: any }): boolean => {
  const v = row.live_status;
  if (Array.isArray(v)) return v.some(s => String(s).toLowerCase().includes('live'));
  if (typeof v === 'string') return v.toLowerCase().includes('live');
  return false;
};

const onTrackLabel = (row: { project_on_track: string | null; row_type: string; live_status: any }): string => {
  if (row.row_type === 'bau') return '—';
  if (isLiveRow(row)) return '—';
  return row.project_on_track === 'off_track' ? 'Off Track' : 'On Track';
};

const formatProjectAge = (signedDate: string | null | undefined): string => {
  if (!signedDate) return '—';
  const start = new Date(signedDate);
  const now = new Date();
  if (isNaN(start.getTime()) || start > now) return '—';
  const months = differenceInMonths(now, start);
  const afterMonths = addMonths(start, months);
  const weeks = differenceInWeeks(now, afterMonths);
  const afterWeeks = addWeeks(afterMonths, weeks);
  const days = differenceInDays(now, afterWeeks);
  const parts: string[] = [];
  if (months > 0) parts.push(`${months}m`);
  if (months > 0 || weeks > 0) parts.push(`${weeks}w`);
  parts.push(`${days}d`);
  return parts.join(' ');
};

export default function BoardSummary() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const tableContentRef = useRef<HTMLDivElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);

  // Sync top scrollbar <-> table scroll
  useEffect(() => {
    const top = topScrollRef.current;
    const tbl = tableScrollRef.current;
    const content = tableContentRef.current;
    if (!top || !tbl || !content) return;

    let lock = false;
    const onTop = () => {
      if (lock) return;
      lock = true;
      tbl.scrollLeft = top.scrollLeft;
      lock = false;
    };
    const onTbl = () => {
      if (lock) return;
      lock = true;
      top.scrollLeft = tbl.scrollLeft;
      lock = false;
    };

    top.addEventListener('scroll', onTop);
    tbl.addEventListener('scroll', onTbl);

    const update = () => {
      setTableScrollWidth(content.scrollWidth);
      top.scrollLeft = tbl.scrollLeft;
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(tbl);
    ro.observe(content);

    return () => {
      top.removeEventListener('scroll', onTop);
      tbl.removeEventListener('scroll', onTbl);
      ro.disconnect();
    };
  }, []);
  const [sortColumn, setSortColumn] = useState<ColumnKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<Record<ColumnKey, string[]>>({
    domain: [],
    project_classification: [],
    customer_name: [],
    customer_health: [],
    project_on_track: [],
    project_name: [],
    live_status: [],
    weekly_summary: [],
    project_age: [],
    contract_start_date: [],
    planned_go_live_date: [],
    time_to_first_value_weeks: [],
    time_to_meaningful_adoption_weeks: [],
    implementation_lead_name: [],
    tech_lead_name: [],
    tech_sponsor_name: [],
  });

  const { data: summaryData = [], isLoading } = useQuery({
    queryKey: ['executive-summary', 'board-summary'],
    queryFn: fetchExecutiveSummaryData,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const cellValue = (row: typeof summaryData[number], key: ColumnKey): string => {
    if (key === 'customer_health') return healthLabel(row);
    if (key === 'project_on_track') return onTrackLabel(row);
    if (key === 'project_age') return formatProjectAge(row.contract_signed_date);
    const v = (row as any)[key];
    if (v === null || v === undefined || v === '') return '—';
    if (key === 'planned_go_live_date' || key === 'contract_start_date') {
      return format(new Date(v), 'dd MMM yyyy');
    }
    if (key === 'time_to_first_value_weeks' || key === 'time_to_meaningful_adoption_weeks') {
      return String(v);
    }
    if (key === 'live_status') {
      if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
      return String(v);
    }
    return String(v);
  };

  // Helper: apply filters but optionally exclude one column (for facet counts)
  const applyFilters = (rows: typeof summaryData, excludeKey?: ColumnKey) => {
    return rows.filter(row =>
      COLUMNS.every(({ key }) => {
        if (key === excludeKey) return true;
        const sel = filters[key];
        if (!sel.length) return true;
        if (key === 'live_status') {
          const rowStatuses = Array.isArray(row.live_status)
            ? row.live_status
            : row.live_status ? [String(row.live_status)] : [];
          return sel.some(s => rowStatuses.includes(s as any));
        }
        if (key === 'domain') {
          return sel.includes(row.domain || '—');
        }
        return sel.includes(cellValue(row, key));
      })
    );
  };

  // Build filter options per column with facet counts (excluding the column's own filter)
  const filterOptions = useMemo(() => {
    const map: Record<ColumnKey, FilterOption[]> = {} as any;
    COLUMNS.forEach(({ key }) => {
      const facetRows = applyFilters(summaryData, key);
      const counts = new Map<string, number>();
      // Seed all values from full dataset so unselected options still appear
      summaryData.forEach(row => {
        if (key === 'live_status') {
          const arr = Array.isArray(row.live_status)
            ? row.live_status
            : row.live_status ? [String(row.live_status)] : [];
          if (arr.length === 0) counts.set('—', counts.get('—') ?? 0);
          arr.forEach(s => counts.set(String(s), counts.get(String(s)) ?? 0));
        } else {
          counts.set(cellValue(row, key), counts.get(cellValue(row, key)) ?? 0);
        }
      });
      // Count from facet-filtered rows
      facetRows.forEach(row => {
        if (key === 'live_status') {
          const arr = Array.isArray(row.live_status)
            ? row.live_status
            : row.live_status ? [String(row.live_status)] : [];
          if (arr.length === 0) counts.set('—', (counts.get('—') ?? 0) + 1);
          arr.forEach(s => counts.set(String(s), (counts.get(String(s)) ?? 0) + 1));
        } else {
          const v = cellValue(row, key);
          counts.set(v, (counts.get(v) ?? 0) + 1);
        }
      });
      map[key] = Array.from(counts.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([value, count]) => ({ value, label: value, count }));
    });
    return map;
  }, [summaryData, filters]);

  const filteredData = useMemo(() => applyFilters(summaryData), [summaryData, filters]);

  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredData;
    return [...filteredData].sort((a, b) => {
      let aVal: any;
      let bVal: any;
      if (sortColumn === 'project_age') {
        aVal = a.contract_signed_date ? new Date(a.contract_signed_date).getTime() : null;
        bVal = b.contract_signed_date ? new Date(b.contract_signed_date).getTime() : null;
      } else {
        aVal = a[sortColumn as keyof typeof a];
        bVal = b[sortColumn as keyof typeof b];
      }
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortColumn, sortDirection]);

  // KPIs computed from filtered dataset
  const kpis = useMemo(() => {
    const rows = filteredData;
    const hasLiveStatus = (r: typeof rows[number], status: string) => {
      if (Array.isArray(r.live_status)) return r.live_status.includes(status as any);
      return r.live_status === status;
    };
    return {
      total: rows.length,
      healthy: rows.filter(r => r.customer_health !== 'red').length,
      atRisk: rows.filter(r => r.customer_health === 'red').length,
      onTrack: rows.filter(r => r.row_type !== 'bau' && !isLiveRow(r) && r.project_on_track !== 'off_track').length,
      offTrack: rows.filter(r => r.row_type !== 'bau' && !isLiveRow(r) && r.project_on_track === 'off_track').length,
      live: rows.filter(r => hasLiveStatus(r, 'Live')).length,
      onboarding: rows.filter(r => hasLiveStatus(r, 'Onboarding')).length,
      installation: rows.filter(r => hasLiveStatus(r, 'Installation')).length,
      criticalEscalations: rows.filter(r => (r as any).escalation_status === 'critical').length,
      criticalProductGaps: rows.filter(r => (r as any).product_gaps_status === 'critical').length,
      project: rows.filter(r => r.project_classification === 'Project').length,
      product: rows.filter(r => r.project_classification === 'Product').length,
    };
  }, [filteredData]);

  const handleSortChange = (key: ColumnKey, direction: SortDirection) => {
    setSortColumn(direction ? key : null);
    setSortDirection(direction);
  };

  const handleFilterChange = (key: ColumnKey, values: string[]) => {
    setFilters(prev => ({ ...prev, [key]: values }));
  };

  const clearAllFilters = () => {
    setFilters({
      domain: [],
      project_classification: [],
      customer_name: [],
      customer_health: [],
      project_on_track: [],
      project_name: [],
      live_status: [],
      weekly_summary: [],
      project_age: [],
      contract_start_date: [],
      planned_go_live_date: [],
      time_to_first_value_weeks: [],
      time_to_meaningful_adoption_weeks: [],
      implementation_lead_name: [],
      tech_lead_name: [],
      tech_sponsor_name: [],
    });
  };

  const hasAnyFilter = Object.values(filters).some(v => v.length > 0);

  // Build chip slicer values (Domain & Live Status) from full dataset
  const domainChips = useMemo(() => {
    const set = new Set<string>();
    summaryData.forEach(r => { if (r.domain) set.add(r.domain); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [summaryData]);

  const liveStatusChips = useMemo(() => {
    const set = new Set<string>();
    summaryData.forEach(r => {
      if (Array.isArray(r.live_status)) r.live_status.forEach(s => set.add(s));
      else if (typeof r.live_status === 'string' && r.live_status) set.add(r.live_status);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [summaryData]);

  const toggleChip = (key: ColumnKey, value: string) => {
    setFilters(prev => {
      const current = prev[key];
      const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      return { ...prev, [key]: next };
    });
  };

  // For live_status (array column), keep filter logic working with cellValue join
  const isChipActive = (key: ColumnKey, value: string) => filters[key].some(v => v.split(', ').includes(value) || v === value);

  const handleRowClick = (row: typeof sortedData[number]) => {
    if (row.row_type === 'bau') {
      navigate(`/app/bau/${row.project_id}`);
    } else {
      navigate(`/app/projects/${row.project_id}`);
    }
  };

  const handleClassificationChange = async (row: ExecutiveSummaryRow, value: 'Project' | 'Product') => {
    const queryKey = ['executive-summary', 'board-summary'];
    const previous = queryClient.getQueryData<ExecutiveSummaryRow[]>(queryKey);
    // Optimistic update
    queryClient.setQueryData<ExecutiveSummaryRow[]>(queryKey, (old) =>
      (old || []).map(r =>
        r.row_type === row.row_type && r.project_id === row.project_id
          ? { ...r, project_classification: value }
          : r
      )
    );
    const table = row.row_type === 'bau' ? 'bau_customers' : 'projects';
    const { error } = await supabase
      .from(table)
      .update({ project_classification: value })
      .eq('id', row.project_id);
    if (error) {
      queryClient.setQueryData(queryKey, previous);
      toast.error('Failed to update classification');
    } else {
      toast.success('Classification updated');
    }
  };

  const handleWeeksChange = async (
    row: ExecutiveSummaryRow,
    field: 'time_to_first_value_weeks' | 'time_to_meaningful_adoption_weeks',
    rawValue: string
  ) => {
    if (row.row_type === 'bau') return;
    const trimmed = rawValue.trim();
    const parsed = trimmed === '' ? null : Number(trimmed);
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) {
      toast.error('Enter a non-negative number');
      return;
    }
    const queryKey = ['executive-summary', 'board-summary'];
    const previous = queryClient.getQueryData<ExecutiveSummaryRow[]>(queryKey);
    queryClient.setQueryData<ExecutiveSummaryRow[]>(queryKey, (old) =>
      (old || []).map(r =>
        r.row_type === row.row_type && r.project_id === row.project_id
          ? { ...r, [field]: parsed }
          : r
      )
    );
    const { error } = await supabase
      .from('projects')
      .update({ [field]: parsed })
      .eq('id', row.project_id);
    if (error) {
      queryClient.setQueryData(queryKey, previous);
      toast.error('Failed to update');
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(16);
    doc.text('Summary', 14, 15);
    doc.setFontSize(10);
    doc.text(`Exported: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, 22);

    const headers = COLUMNS.map(c => c.label);
    const data = sortedData.map(row => COLUMNS.map(c => cellValue(row, c.key)));

    let y = 30;
    const lineHeight = 7;
    const colWidths = [16, 22, 30, 14, 18, 30, 22, 40, 18, 18, 26, 26, 26];

    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    let x = 14;
    headers.forEach((header, i) => {
      doc.text(header, x, y);
      x += colWidths[i];
    });
    y += lineHeight;
    doc.setFont(undefined, 'normal');

    data.forEach((row) => {
      x = 14;
      row.forEach((cell, i) => {
        doc.text(String(cell || '').substring(0, 28), x, y);
        x += colWidths[i];
      });
      y += lineHeight;
      if (y > 190) {
        doc.addPage();
        y = 15;
      }
    });

    doc.save(`summary-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportToExcel = () => {
    const data = sortedData.map(row => {
      const obj: Record<string, string> = {};
      COLUMNS.forEach(c => { obj[c.label] = cellValue(row, c.key); });
      return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Summary');
    worksheet['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 28 }, { wch: 10 }, { wch: 12 }, { wch: 28 }, { wch: 14 }, { wch: 40 }, { wch: 14 }, { wch: 16 }, { wch: 22 }, { wch: 22 }, { wch: 22 }];
    XLSX.writeFile(workbook, `summary-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Loading summary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Summary</h1>
        <div className="flex gap-2">
          {hasAnyFilter && (
            <Button onClick={clearAllFilters} variant="ghost" size="sm">
              Clear filters
            </Button>
          )}
          <Button onClick={exportToPDF} variant="outline" size="sm">
            <FileDown className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button onClick={exportToExcel} variant="outline" size="sm">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {([
          { label: 'Total Customers', value: kpis.total, tone: 'default', filterKey: null, filterValues: [] },
          { label: 'Project', value: kpis.project, tone: 'default', filterKey: 'project_classification' as ColumnKey, filterValues: ['Project'] },
          { label: 'Product', value: kpis.product, tone: 'default', filterKey: 'project_classification' as ColumnKey, filterValues: ['Product'] },
          { label: 'Healthy', value: kpis.healthy, tone: 'success', filterKey: 'customer_health' as ColumnKey, filterValues: ['Green'] },
          { label: 'At Risk', value: kpis.atRisk, tone: 'destructive', filterKey: 'customer_health' as ColumnKey, filterValues: ['Red'] },
          { label: 'On Track', value: kpis.onTrack, tone: 'success', filterKey: 'project_on_track' as ColumnKey, filterValues: ['On Track'] },
          { label: 'Off Track', value: kpis.offTrack, tone: 'destructive', filterKey: 'project_on_track' as ColumnKey, filterValues: ['Off Track'] },
          { label: 'Live', value: kpis.live, tone: 'success', filterKey: 'live_status' as ColumnKey, filterValues: ['Live'] },
          { label: 'In Onboarding', value: kpis.onboarding, tone: 'default', filterKey: 'live_status' as ColumnKey, filterValues: ['Onboarding'] },
          { label: 'In Installation', value: kpis.installation, tone: 'default', filterKey: 'live_status' as ColumnKey, filterValues: ['Installation'] },
          { label: 'Critical Escalations', value: kpis.criticalEscalations, tone: 'destructive', filterKey: null, filterValues: [] },
          { label: 'Critical Product Gaps', value: kpis.criticalProductGaps, tone: 'destructive', filterKey: null, filterValues: [] },
        ] as const).map(kpi => {
          const isActive = kpi.filterKey
            ? kpi.filterValues.length > 0 && kpi.filterValues.every(v => filters[kpi.filterKey as ColumnKey].includes(v))
            : false;
          const clickable = !!kpi.filterKey;
          const handleClick = () => {
            if (!kpi.filterKey) return;
            const key = kpi.filterKey as ColumnKey;
            setFilters(prev => ({
              ...prev,
              [key]: isActive ? [] : [...kpi.filterValues],
            }));
          };
          return (
            <Card
              key={kpi.label}
              onClick={handleClick}
              className={
                (clickable ? 'cursor-pointer transition-colors hover:bg-muted/50 ' : '') +
                (isActive ? 'ring-2 ring-primary' : '')
              }
            >
              <CardContent className="py-3 px-4">
                <div className={
                  kpi.tone === 'success'
                    ? 'text-2xl font-bold text-success'
                    : kpi.tone === 'destructive'
                      ? 'text-2xl font-bold text-destructive'
                      : 'text-2xl font-bold text-foreground'
                }>
                  {kpi.value}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{kpi.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground min-w-[90px]">Domain:</span>
          {domainChips.length === 0 ? (
            <span className="text-sm text-muted-foreground">No domains</span>
          ) : (
            domainChips.map(d => {
              const active = filters.domain.includes(d);
              const count = filterOptions.domain?.find(o => o.value === d)?.count ?? 0;
              return (
                <Badge
                  key={d}
                  variant={active ? 'default' : 'outline'}
                  className="cursor-pointer select-none"
                  onClick={() => toggleChip('domain', d)}
                >
                  {d} <span className="ml-1 opacity-70">({count})</span>
                </Badge>
              );
            })
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground min-w-[90px]">Live Status:</span>
          {liveStatusChips.length === 0 ? (
            <span className="text-sm text-muted-foreground">No statuses</span>
          ) : (
            liveStatusChips.map(s => {
              const active = filters.live_status.includes(s);
              const count = filterOptions.live_status?.find(o => o.value === s)?.count ?? 0;
              return (
                <Badge
                  key={s}
                  variant={active ? 'default' : 'outline'}
                  className="cursor-pointer select-none"
                  onClick={() => toggleChip('live_status', s)}
                >
                  {s} <span className="ml-1 opacity-70">({count})</span>
                </Badge>
              );
            })
          )}
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {sortedData.length} of {summaryData.length}
      </div>

      <div className="sticky top-0 z-40 overflow-hidden rounded-lg border bg-background">
        <div ref={topScrollRef} className="overflow-x-auto overflow-y-hidden" style={{ height: 14 }}>
          <div style={{ width: tableScrollWidth, height: 1 }} />
        </div>
      </div>

      <div ref={tableScrollRef} className="border rounded-lg overflow-auto max-h-[calc(100vh-200px)]">
        <div ref={tableContentRef} className="[&>div]:w-max [&>div]:overflow-x-hidden [&>div]:overflow-y-visible">
          <Table className="w-max min-w-full">
            <TableHeader className="sticky top-0 z-20 bg-background shadow-[0_1px_0_0_hsl(var(--border))]">
              <TableRow>
                {COLUMNS.map(({ key, label }) => (
                  <TableHead key={key} className="bg-background">
                    <TableHeaderFilter
                      label={label}
                      sortable
                      filterable
                      sortDirection={sortColumn === key ? sortDirection : null}
                      onSortChange={(dir) => handleSortChange(key, dir)}
                      options={filterOptions[key]}
                      selectedValues={filters[key]}
                      onFilterChange={(values) => handleFilterChange(key, values)}
                    />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMNS.length} className="text-center py-8 text-muted-foreground">
                  No records found.
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((row) => (
                <TableRow
                  key={`${row.row_type}-${row.project_id}`}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(row)}
                >
                  <TableCell>
                    {row.domain ? <Badge variant="outline">{row.domain}</Badge> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={row.project_classification ?? undefined}
                      onValueChange={(v) => handleClassificationChange(row, v as 'Project' | 'Product')}
                    >
                      <SelectTrigger className="h-8 w-[130px]">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Project">Project</SelectItem>
                        <SelectItem value="Product">Product</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="font-medium">{row.customer_name}</TableCell>
                  <TableCell className="min-w-[320px] max-w-[420px] align-top">
                    {row.weekly_summary ? (
                      <div className="whitespace-pre-wrap break-words text-sm leading-snug">
                        {row.weekly_summary}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.customer_health === 'red' ? (
                      <Circle className="h-4 w-4 fill-destructive text-destructive" aria-label="Red" />
                    ) : (
                      <Circle className="h-4 w-4 fill-success text-success" aria-label="Green" />
                    )}
                  </TableCell>
                  <TableCell>
                    {row.row_type === 'bau' || isLiveRow(row) ? (
                      <span className="text-muted-foreground">—</span>
                    ) : row.project_on_track === 'off_track' ? (
                      <XCircle className="h-4 w-4 text-destructive" aria-label="Off Track" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-success" aria-label="On Track" />
                    )}
                  </TableCell>
                  <TableCell>{row.project_name}</TableCell>
                  <TableCell>
                    {Array.isArray(row.live_status) && row.live_status.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {row.live_status.map((status) => (
                          <Badge key={status} variant={status === 'Live' ? 'default' : 'outline'}>
                            {status}
                          </Badge>
                        ))}
                      </div>
                    ) : row.live_status && typeof row.live_status === 'string' ? (
                      <Badge variant={row.live_status === 'Live' ? 'default' : 'outline'}>
                        {row.live_status}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {Array.isArray(row.live_status) && row.live_status.length === 1 && row.live_status[0] === 'Live' ? (
                      <Badge className="bg-success hover:bg-success text-success-foreground gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Live
                      </Badge>
                    ) : (
                      formatProjectAge(row.contract_signed_date)
                    )}
                  </TableCell>
                  <TableCell>
                    {Array.isArray(row.live_status) && row.live_status.length === 1 && row.live_status[0] === 'Live' ? (
                      <Badge className="bg-success hover:bg-success text-success-foreground gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Live
                      </Badge>
                    ) : row.planned_go_live_date ? (
                      format(new Date(row.planned_go_live_date), 'dd MMM yyyy')
                    ) : (
                      ''
                    )}
                  </TableCell>
                  <TableCell>{row.implementation_lead_name || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>{row.tech_lead_name || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>{row.tech_sponsor_name || <span className="text-muted-foreground">—</span>}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </div>
    </div>
  );
}
