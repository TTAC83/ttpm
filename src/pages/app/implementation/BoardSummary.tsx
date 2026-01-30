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
import { Package, FileDown, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

export default function BoardSummary() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: summaryData = [], isLoading } = useQuery({
    queryKey: ['executive-summary'],
    queryFn: fetchExecutiveSummaryData,
  });

  // Filter data based on search
  const filteredData = summaryData.filter(row => 
    row.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    row.project_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort data
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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

    // Handle null values
    if (aVal === null) return 1;
    if (bVal === null) return -1;

    // String comparison
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleRowClick = (projectId: string) => {
    navigate(`/app/projects/${projectId}`);
  };

  const renderProductGapsIcon = (status: 'none' | 'non_critical' | 'critical') => {
    if (status === 'none') return null;
    if (status === 'critical') {
      return <Package className="h-6 w-6 text-red-600" />;
    }
    return <Package className="h-6 w-6 text-green-600" />;
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); // landscape orientation
    
    // Add title
    doc.setFontSize(16);
    doc.text('Board Summary', 14, 15);
    
    // Add export date
    doc.setFontSize(10);
    doc.text(`Exported: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, 22);
    
    // Prepare table data
    const headers = [
      'Customer Name',
      'Project',
      'Product Gaps',
      'Planned Go Live'
    ];
    
    const data = sortedData.map(row => [
      row.customer_name,
      row.project_name,
      row.product_gaps_status === 'critical' ? 'Critical' : 
        row.product_gaps_status === 'non_critical' ? 'Non-Critical' : 'None',
      row.planned_go_live_date ? format(new Date(row.planned_go_live_date), 'dd MMM yyyy') : ''
    ]);
    
    // Add table using autoTable (requires jspdf-autotable plugin, so we'll do it manually)
    let y = 30;
    const lineHeight = 7;
    const colWidths = [50, 50, 30, 35];
    
    // Draw headers
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    let x = 14;
    headers.forEach((header, i) => {
      doc.text(header, x, y);
      x += colWidths[i];
    });
    
    y += lineHeight;
    doc.setFont(undefined, 'normal');
    
    // Draw data rows
    data.forEach((row) => {
      x = 14;
      row.forEach((cell, i) => {
        const text = String(cell || '');
        doc.text(text.substring(0, 35), x, y); // Truncate long text
        x += colWidths[i];
      });
      y += lineHeight;
      
      // Add new page if needed
      if (y > 190) {
        doc.addPage();
        y = 15;
      }
    });
    
    doc.save(`board-summary-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportToExcel = () => {
    const data = sortedData.map(row => ({
      'Customer Name': row.customer_name,
      'Project': row.project_name,
      'Product Gaps': row.product_gaps_status === 'critical' ? 'Critical' : 
        row.product_gaps_status === 'non_critical' ? 'Non-Critical' : 'None',
      'Planned Go Live': row.planned_go_live_date ? format(new Date(row.planned_go_live_date), 'dd MMM yyyy') : ''
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Board Summary');
    
    // Set column widths
    const colWidths = [
      { wch: 30 }, // Customer Name
      { wch: 30 }, // Project
      { wch: 15 }, // Product Gaps
      { wch: 20 }  // Planned Go Live
    ];
    worksheet['!cols'] = colWidths;
    
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

      <div className="flex gap-4 items-center">
        <Input
          placeholder="Search by customer or project..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('customer_name')}
              >
                Customer Name {sortColumn === 'customer_name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('project_name')}
              >
                Project {sortColumn === 'project_name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead 
                className="text-center cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('product_gaps_status')}
              >
                Product Gaps {sortColumn === 'product_gaps_status' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('planned_go_live_date')}
              >
                Planned Go Live {sortColumn === 'planned_go_live_date' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No implementation projects found.
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((row) => (
                <TableRow
                  key={row.project_id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(row.project_id)}
                >
                  <TableCell className="font-medium">{row.customer_name}</TableCell>
                  <TableCell>{row.project_name}</TableCell>
                  <TableCell className="text-center">
                    {renderProductGapsIcon(row.product_gaps_status)}
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
