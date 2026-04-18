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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, FileDown, FileSpreadsheet } from "lucide-react";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

type TypeFilter = 'all' | 'implementation' | 'bau';

export default function BoardSummary() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const { data: summaryData = [], isLoading } = useQuery({
    queryKey: ['executive-summary'],
    queryFn: fetchExecutiveSummaryData,
  });

  const filteredData = useMemo(() => {
    return summaryData.filter(row => {
      const matchesSearch =
        row.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.project_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || row.row_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [summaryData, searchQuery, typeFilter]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) return 0;
    let aVal: any = a[sortColumn as keyof typeof a];
    let bVal: any = b[sortColumn as keyof typeof b];
    if (aVal === null) return 1;
    if (bVal === null) return -1;
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleRowClick = (row: typeof sortedData[number]) => {
    if (row.row_type === 'bau') {
      navigate(`/app/bau/${row.project_id}`);
    } else {
      navigate(`/app/projects/${row.project_id}`);
    }
  };

  const renderProductGapsIcon = (status: 'none' | 'non_critical' | 'critical') => {
    if (status === 'none') return null;
    if (status === 'critical') return <Package className="h-6 w-6 text-red-600" />;
    return <Package className="h-6 w-6 text-green-600" />;
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(16);
    doc.text('Board Summary', 14, 15);
    doc.setFontSize(10);
    doc.text(`Exported: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, 22);

    const headers = ['Type', 'Domain', 'Customer Name', 'Project / Site', 'Contract Signed', 'Product Gaps', 'Churn Risk', 'Planned Go Live'];
    const data = sortedData.map(row => [
      row.row_type === 'bau' ? 'BAU' : 'Implementation',
      row.domain || '—',
      row.customer_name,
      row.project_name,
      row.contract_signed_date ? format(new Date(row.contract_signed_date), 'dd MMM yyyy') : '',
      row.row_type === 'bau' ? '—' :
        (row.product_gaps_status === 'critical' ? 'Critical' :
         row.product_gaps_status === 'non_critical' ? 'Non-Critical' : 'None'),
      row.churn_risk || '—',
      row.planned_go_live_date ? format(new Date(row.planned_go_live_date), 'dd MMM yyyy') : '',
    ]);

    let y = 30;
    const lineHeight = 7;
    const colWidths = [24, 22, 40, 40, 28, 24, 22, 28];

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
        const text = String(cell || '');
        doc.text(text.substring(0, 30), x, y);
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
    const data = sortedData.map(row => ({
      'Type': row.row_type === 'bau' ? 'BAU' : 'Implementation',
      'Customer Name': row.customer_name,
      'Project / Site': row.project_name,
      'Contract Signed': row.contract_signed_date ? format(new Date(row.contract_signed_date), 'dd MMM yyyy') : '',
      'Product Gaps': row.row_type === 'bau' ? '—' :
        (row.product_gaps_status === 'critical' ? 'Critical' :
         row.product_gaps_status === 'non_critical' ? 'Non-Critical' : 'None'),
      'Churn Risk': row.churn_risk || '—',
      'Planned Go Live': row.planned_go_live_date ? format(new Date(row.planned_go_live_date), 'dd MMM yyyy') : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Board Summary');
    worksheet['!cols'] = [{ wch: 16 }, { wch: 30 }, { wch: 30 }, { wch: 18 }, { wch: 15 }, { wch: 14 }, { wch: 18 }];
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

  const implCount = summaryData.filter(r => r.row_type === 'implementation').length;
  const bauCount = summaryData.filter(r => r.row_type === 'bau').length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Board Summary</h1>
        <div className="flex gap-2">
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

      <div className="flex gap-4 items-center flex-wrap">
        <Input
          placeholder="Search by customer or project..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({summaryData.length})</SelectItem>
            <SelectItem value="implementation">Implementation ({implCount})</SelectItem>
            <SelectItem value="bau">BAU ({bauCount})</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">Showing {sortedData.length}</span>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('row_type')}>
                Type {sortColumn === 'row_type' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('customer_name')}>
                Customer Name {sortColumn === 'customer_name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('project_name')}>
                Project / Site {sortColumn === 'project_name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('contract_signed_date')}>
                Contract Signed {sortColumn === 'contract_signed_date' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead className="text-center cursor-pointer hover:bg-muted/50" onClick={() => handleSort('product_gaps_status')}>
                Product Gaps {sortColumn === 'product_gaps_status' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('churn_risk')}>
                Churn Risk {sortColumn === 'churn_risk' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('planned_go_live_date')}>
                Planned Go Live {sortColumn === 'planned_go_live_date' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                    {row.row_type === 'bau' ? (
                      <Badge variant="secondary">BAU</Badge>
                    ) : (
                      <Badge variant="default">Implementation</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{row.customer_name}</TableCell>
                  <TableCell>{row.project_name}</TableCell>
                  <TableCell>
                    {row.contract_signed_date ? format(new Date(row.contract_signed_date), 'dd MMM yyyy') : ''}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.row_type === 'bau' ? <span className="text-muted-foreground">—</span> : renderProductGapsIcon(row.product_gaps_status)}
                  </TableCell>
                  <TableCell>
                    {row.churn_risk || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {row.planned_go_live_date ? format(new Date(row.planned_go_live_date), 'dd MMM yyyy') : ''}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
