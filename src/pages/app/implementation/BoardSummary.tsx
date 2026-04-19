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
import { FileDown, FileSpreadsheet } from "lucide-react";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

type ColumnKey =
  | 'domain'
  | 'customer_name'
  | 'project_name'
  | 'contract_signed_date'
  | 'planned_go_live_date'
  | 'implementation_lead_name'
  | 'tech_lead_name'
  | 'tech_sponsor_name';

const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'domain', label: 'Domain' },
  { key: 'customer_name', label: 'Customer Name' },
  { key: 'project_name', label: 'Project / Site' },
  { key: 'contract_signed_date', label: 'Contract Signed' },
  { key: 'planned_go_live_date', label: 'Planned Go Live' },
  { key: 'implementation_lead_name', label: 'Implementation Lead' },
  { key: 'tech_lead_name', label: 'Dev/Tech Lead' },
  { key: 'tech_sponsor_name', label: 'Dev/Tech Sponsor' },
];

export default function BoardSummary() {
  const navigate = useNavigate();
  const [sortColumn, setSortColumn] = useState<ColumnKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<Record<ColumnKey, string[]>>({
    domain: [],
    customer_name: [],
    project_name: [],
    contract_signed_date: [],
    planned_go_live_date: [],
    implementation_lead_name: [],
    tech_lead_name: [],
    tech_sponsor_name: [],
  });

  const { data: summaryData = [], isLoading } = useQuery({
    queryKey: ['executive-summary'],
    queryFn: fetchExecutiveSummaryData,
  });

  const cellValue = (row: typeof summaryData[number], key: ColumnKey): string => {
    const v = (row as any)[key];
    if (v === null || v === undefined || v === '') return '—';
    if (key === 'contract_signed_date' || key === 'planned_go_live_date') {
      return format(new Date(v), 'dd MMM yyyy');
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
        return sel.includes(cellValue(row, key));
      })
    );
  }, [summaryData, filters]);

  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredData;
    return [...filteredData].sort((a, b) => {
      let aVal: any = a[sortColumn as keyof typeof a];
      let bVal: any = b[sortColumn as keyof typeof b];
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
      contract_signed_date: [],
      planned_go_live_date: [],
      implementation_lead_name: [],
      tech_lead_name: [],
      tech_sponsor_name: [],
    });
  };

  const hasAnyFilter = Object.values(filters).some(v => v.length > 0);

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
    const colWidths = [22, 40, 40, 26, 26, 35, 35, 35];

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
    worksheet['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 22 }];
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
                    {row.contract_signed_date ? format(new Date(row.contract_signed_date), 'dd MMM yyyy') : ''}
                  </TableCell>
                  <TableCell>
                    {row.planned_go_live_date ? format(new Date(row.planned_go_live_date), 'dd MMM yyyy') : ''}
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
