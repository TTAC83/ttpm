import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchExecutiveSummaryData } from "@/lib/executiveSummaryService";
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
import { TableHeaderFilter, SortDirection, FilterOption } from "@/components/ui/table-header-filter";
import { FileDown, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { useState, useMemo } from "react";
import { format, differenceInMonths, differenceInWeeks, differenceInDays, addMonths, addWeeks } from "date-fns";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

type ColumnKey =
  | 'domain'
  | 'customer_name'
  | 'project_name'
  | 'live_status'
  | 'project_age'
  | 'planned_go_live_date'
  | 'implementation_lead_name'
  | 'tech_lead_name'
  | 'tech_sponsor_name';

const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'domain', label: 'Domain' },
  { key: 'customer_name', label: 'Customer Name' },
  { key: 'project_name', label: 'Project / Site' },
  { key: 'live_status', label: 'Live Status' },
  { key: 'project_age', label: 'Project Age' },
  { key: 'planned_go_live_date', label: 'Planned Go Live' },
  { key: 'implementation_lead_name', label: 'Implementation Lead' },
  { key: 'tech_lead_name', label: 'Dev/Tech Lead' },
  { key: 'tech_sponsor_name', label: 'Dev/Tech Sponsor' },
];

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
  const [sortColumn, setSortColumn] = useState<ColumnKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<Record<ColumnKey, string[]>>({
    domain: [],
    customer_name: [],
    project_name: [],
    live_status: [],
    project_age: [],
    planned_go_live_date: [],
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
    const v = (row as any)[key];
    if (v === null || v === undefined || v === '') return '—';
    if (key === 'planned_go_live_date') {
      return format(new Date(v), 'dd MMM yyyy');
    }
    if (key === 'project_age') {
      return formatProjectAge(row.contract_signed_date);
    }
    if (key === 'live_status') {
      if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
      return String(v);
    }
    return String(v);
  };

  // Build filter options per column from the full dataset
  const filterOptions = useMemo(() => {
    const map: Record<ColumnKey, FilterOption[]> = {} as any;
    COLUMNS.forEach(({ key }) => {
      const set = new Set<string>();
      summaryData.forEach(row => set.add(cellValue(row, key)));
      map[key] = Array.from(set)
        .sort((a, b) => a.localeCompare(b))
        .map(v => ({ value: v, label: v }));
    });
    return map;
  }, [summaryData]);

  const filteredData = useMemo(() => {
    return summaryData.filter(row =>
      COLUMNS.every(({ key }) => {
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
  }, [summaryData, filters]);

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
      customer_name: [],
      project_name: [],
      live_status: [],
      project_age: [],
      planned_go_live_date: [],
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

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(16);
    doc.text('Board Summary', 14, 15);
    doc.setFontSize(10);
    doc.text(`Exported: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, 22);

    const headers = COLUMNS.map(c => c.label);
    const data = sortedData.map(row => COLUMNS.map(c => cellValue(row, c.key)));

    let y = 30;
    const lineHeight = 7;
    const colWidths = [20, 38, 38, 22, 24, 24, 32, 32, 32];

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

    doc.save(`board-summary-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportToExcel = () => {
    const data = sortedData.map(row => {
      const obj: Record<string, string> = {};
      COLUMNS.forEach(c => { obj[c.label] = cellValue(row, c.key); });
      return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Board Summary');
    worksheet['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 28 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 22 }, { wch: 22 }];
    XLSX.writeFile(workbook, `board-summary-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Loading board summary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Board Summary</h1>
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

      <div className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground min-w-[90px]">Domain:</span>
          {domainChips.length === 0 ? (
            <span className="text-sm text-muted-foreground">No domains</span>
          ) : (
            domainChips.map(d => {
              const active = filters.domain.includes(d);
              return (
                <Badge
                  key={d}
                  variant={active ? 'default' : 'outline'}
                  className="cursor-pointer select-none"
                  onClick={() => toggleChip('domain', d)}
                >
                  {d}
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
              return (
                <Badge
                  key={s}
                  variant={active ? 'default' : 'outline'}
                  className="cursor-pointer select-none"
                  onClick={() => toggleChip('live_status', s)}
                >
                  {s}
                </Badge>
              );
            })
          )}
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {sortedData.length} of {summaryData.length}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map(({ key, label }) => (
                <TableHead key={key}>
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
                  <TableCell className="font-medium">{row.customer_name}</TableCell>
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
  );
}
