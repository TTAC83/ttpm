import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FileText, FileSpreadsheet, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getBauBoardSummary, BoardSummaryRow } from '@/lib/bauWeeklyService';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

type SortColumn = 'customer_name' | 'health' | 'churn_risk' | 'status';
type SortDirection = 'asc' | 'desc';

export const BoardSummary = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('customer_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const { data: summaryData, isLoading } = useQuery({
    queryKey: ['bau-board-summary'],
    queryFn: getBauBoardSummary,
  });

  // Filter data based on search
  const filteredData = summaryData?.filter(row =>
    row.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    let aVal = a[sortColumn];
    let bVal = b[sortColumn];

    // Handle null values
    if (aVal === null) return 1;
    if (bVal === null) return -1;

    // Convert to string for comparison
    aVal = String(aVal).toLowerCase();
    bVal = String(bVal).toLowerCase();

    if (sortDirection === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    } else {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    }
  });

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleRowClick = (customerId: string) => {
    navigate(`/app/bau/${customerId}`);
  };

  const getHealthBadge = (health: string | null) => {
    if (!health) return <Badge variant="outline">Not Set</Badge>;
    
    if (health === 'green') {
      return <Badge className="bg-green-500 text-white">Green</Badge>;
    }
    return <Badge variant="destructive">Red</Badge>;
  };

  const getChurnRiskBadge = (risk: string | null) => {
    if (!risk) return <Badge variant="outline">Not Set</Badge>;
    
    const colors = {
      'Low': 'bg-green-500 text-white',
      'Medium': 'bg-yellow-500 text-white',
      'High': 'bg-orange-500 text-white',
      'Certain': 'bg-red-500 text-white'
    };
    
    return <Badge className={colors[risk as keyof typeof colors] || ''}>{risk}</Badge>;
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('BAU Board Summary', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22);

    const tableData = sortedData.map(row => [
      row.customer_name,
      row.health || 'Not Set',
      row.churn_risk || 'Not Set',
      row.status || 'Not Set'
    ]);

    (doc as any).autoTable({
      startY: 28,
      head: [['Customer', 'Health', 'Churn Risk', 'Status']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save('bau-board-summary.pdf');
  };

  const exportToExcel = () => {
    const worksheetData = sortedData.map(row => ({
      'Customer': row.customer_name,
      'Health': row.health || 'Not Set',
      'Churn Risk': row.churn_risk || 'Not Set',
      'Status': row.status || 'Not Set'
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BAU Board Summary');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 30 }, // Customer
      { wch: 15 }, // Health
      { wch: 15 }, // Churn Risk
      { wch: 20 }  // Status
    ];

    XLSX.writeFile(workbook, 'bau-board-summary.xlsx');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading board summary...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>BAU Board Summary</CardTitle>
          <p className="text-sm text-muted-foreground">
            Overview of all BAU customers for the most recent week
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportToPDF}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Export PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToExcel}
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export Excel
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('customer_name')}
                      className="flex items-center gap-1"
                    >
                      Customer
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('health')}
                      className="flex items-center gap-1"
                    >
                      Health
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('churn_risk')}
                      className="flex items-center gap-1"
                    >
                      Churn Risk
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('status')}
                      className="flex items-center gap-1"
                    >
                      Status
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedData.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(row.id)}
                    >
                      <TableCell className="font-medium">{row.customer_name}</TableCell>
                      <TableCell>{getHealthBadge(row.health)}</TableCell>
                      <TableCell>{getChurnRiskBadge(row.churn_risk)}</TableCell>
                      <TableCell>{row.status || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
