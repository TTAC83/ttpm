import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ExecutiveSummaryRow } from './executiveSummaryService';
import { ImplementationBlocker } from './blockersService';
import { ProductGap } from './productGapsService';
import { formatDateUK } from './dateUtils';

interface ExportData {
  summaryData: ExecutiveSummaryRow[];
  escalations: ImplementationBlocker[];
  productGaps: ProductGap[];
  actions: any[];
  events?: any[];
  featureRequests?: any[];
}

export function exportExecutiveSummaryToPDF(data: ExportData): void {
  const { summaryData, escalations, productGaps, actions, events = [], featureRequests = [] } = data;
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', 14, 15);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, 22);
  
  // Stats summary
  const total = summaryData.length;
  const greenHealth = summaryData.filter(r => r.customer_health === 'green').length;
  const redHealth = summaryData.filter(r => r.customer_health === 'red').length;
  const onTrack = summaryData.filter(r => r.project_on_track === 'on_track').length;
  const offTrack = summaryData.filter(r => r.project_on_track === 'off_track').length;
  const installation = summaryData.filter(r => r.phase_installation).length;
  const onboarding = summaryData.filter(r => r.phase_onboarding).length;
  const live = summaryData.filter(r => r.phase_live).length;
  
  doc.setFontSize(9);
  const statsText = `Projects: ${total} | Health: ${greenHealth}G/${redHealth}R | Track: ${onTrack}On/${offTrack}Off | Phases: ${installation}Install/${onboarding}Onboard/${live}Live | Escalations: ${escalations.length} | Product Gaps: ${productGaps.length}`;
  doc.text(statsText, 14, 28);
  
  // Main summary table
  const summaryHeaders = [
    'Customer',
    'Project', 
    'Go Live',
    'Escalation',
    'Esc. Reason',
    'Health',
    'On Track',
    'Reason',
    'Install',
    'Onboard',
    'Live',
    'Gaps'
  ];
  
  const getEscalationPriority = (status: 'none' | 'active' | 'critical') => {
    if (status === 'critical') return 0;
    if (status === 'active') return 1;
    return 2;
  };
  
  // Sort data same as on screen
  const sortedData = [...summaryData].sort((a, b) => {
    const escPriorityA = getEscalationPriority(a.escalation_status);
    const escPriorityB = getEscalationPriority(b.escalation_status);
    if (escPriorityA !== escPriorityB) return escPriorityA - escPriorityB;
    const dateA = a.planned_go_live_date ? new Date(a.planned_go_live_date).getTime() : Infinity;
    const dateB = b.planned_go_live_date ? new Date(b.planned_go_live_date).getTime() : Infinity;
    return dateA - dateB;
  });
  
  // Build project order map for sub-tables
  const projectOrderMap = new Map<string, number>();
  sortedData.forEach((row, index) => {
    projectOrderMap.set(row.project_id, index);
  });
  
  // Find escalation reasons for each project
  const escalationReasonMap = new Map<string, string>();
  escalations.forEach(e => {
    if (e.project_id && e.reason_code) {
      const existing = escalationReasonMap.get(e.project_id);
      escalationReasonMap.set(e.project_id, existing ? `${existing}, ${e.reason_code}` : e.reason_code);
    }
  });
  
  const summaryRows = sortedData.map(row => [
    row.customer_name,
    row.project_name,
    row.planned_go_live_date ? format(new Date(row.planned_go_live_date), 'dd MMM yy') : '',
    row.escalation_status === 'critical' ? 'CRITICAL' : row.escalation_status === 'active' ? 'Active' : '',
    escalationReasonMap.get(row.project_id) || '',
    row.customer_health === 'green' ? 'Green' : row.customer_health === 'red' ? 'Red' : '',
    row.project_on_track === 'on_track' ? 'Yes' : row.project_on_track === 'off_track' ? 'No' : '',
    row.reason_code || '',
    row.phase_installation ? 'Y' : '',
    row.phase_onboarding ? 'Y' : '',
    row.phase_live ? 'Y' : '',
    row.product_gaps_status === 'critical' ? 'CRITICAL' : row.product_gaps_status === 'non_critical' ? 'Yes' : ''
  ]);

  autoTable(doc, {
    head: [summaryHeaders],
    body: summaryRows,
    startY: 32,
    theme: 'grid',
    styles: { 
      fontSize: 7,
      cellPadding: 1.5,
      overflow: 'linebreak'
    },
    headStyles: { 
      fillColor: [59, 130, 246],
      fontSize: 7,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 28 }, // Customer
      1: { cellWidth: 28 }, // Project
      2: { cellWidth: 18 }, // Go Live
      3: { cellWidth: 18 }, // Escalation
      4: { cellWidth: 30 }, // Esc. Reason
      5: { cellWidth: 12 }, // Health
      6: { cellWidth: 14 }, // On Track
      7: { cellWidth: 35 }, // Reason
      8: { cellWidth: 12 }, // Install
      9: { cellWidth: 12 }, // Onboard
      10: { cellWidth: 10 }, // Live
      11: { cellWidth: 14 }  // Gaps
    },
    didParseCell: function(data) {
      // Highlight critical escalations
      if (data.column.index === 3 && data.cell.raw === 'CRITICAL') {
        data.cell.styles.fillColor = [254, 202, 202];
        data.cell.styles.textColor = [153, 27, 27];
        data.cell.styles.fontStyle = 'bold';
      }
      // Highlight red health
      if (data.column.index === 5 && data.cell.raw === 'Red') {
        data.cell.styles.fillColor = [254, 202, 202];
        data.cell.styles.textColor = [153, 27, 27];
      }
      // Highlight green health
      if (data.column.index === 5 && data.cell.raw === 'Green') {
        data.cell.styles.fillColor = [187, 247, 208];
        data.cell.styles.textColor = [22, 101, 52];
      }
      // Highlight off track
      if (data.column.index === 6 && data.cell.raw === 'No') {
        data.cell.styles.fillColor = [254, 202, 202];
        data.cell.styles.textColor = [153, 27, 27];
      }
      // Highlight on track
      if (data.column.index === 6 && data.cell.raw === 'Yes') {
        data.cell.styles.fillColor = [187, 247, 208];
        data.cell.styles.textColor = [22, 101, 52];
      }
      // Highlight critical gaps
      if (data.column.index === 11 && data.cell.raw === 'CRITICAL') {
        data.cell.styles.fillColor = [254, 202, 202];
        data.cell.styles.textColor = [153, 27, 27];
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  // Escalations table
  if (escalations.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Escalations (${escalations.length})`, 14, 15);
    
    const escHeaders = ['Customer', 'Project', 'Title', 'Reason Code', 'Owner', 'Raised', 'Est. Complete', 'Age', 'Critical'];
    
    const sortedEscalations = [...escalations].sort((a, b) => {
      const orderA = projectOrderMap.get(a.project_id || '') ?? Infinity;
      const orderB = projectOrderMap.get(b.project_id || '') ?? Infinity;
      return orderA - orderB;
    });
    
    const escRows = sortedEscalations.map(esc => [
      esc.customer_name || '',
      esc.project_name || '',
      esc.title,
      esc.reason_code || '-',
      esc.owner_name || '',
      formatDateUK(esc.raised_at),
      esc.estimated_complete_date ? formatDateUK(esc.estimated_complete_date) : '-',
      String(esc.age_days),
      esc.is_critical ? 'YES' : ''
    ]);

    autoTable(doc, {
      head: [escHeaders],
      body: escRows,
      startY: 20,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [239, 68, 68], fontSize: 8, fontStyle: 'bold' },
      didParseCell: function(data) {
        if (data.column.index === 8 && data.cell.raw === 'YES') {
          data.cell.styles.fillColor = [254, 202, 202];
          data.cell.styles.textColor = [153, 27, 27];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });
  }

  // Actions table
  if (actions.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Actions - Critical & Overdue (${actions.length})`, 14, 15);
    
    const actionHeaders = ['Customer', 'Project', 'Title', 'Assignee', 'Planned Date', 'Status', 'Critical'];
    
    const sortedActions = [...actions].sort((a, b) => {
      const orderA = projectOrderMap.get(a.project_id || '') ?? Infinity;
      const orderB = projectOrderMap.get(b.project_id || '') ?? Infinity;
      return orderA - orderB;
    });
    
    const actionRows = sortedActions.map(action => [
      action.projects?.companies?.name || '-',
      action.projects?.name || '-',
      action.title,
      action.profiles?.name || '-',
      action.planned_date ? formatDateUK(action.planned_date) : '-',
      action.status?.replace(/_/g, ' ') || '',
      action.is_critical ? 'YES' : ''
    ]);

    autoTable(doc, {
      head: [actionHeaders],
      body: actionRows,
      startY: 20,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [249, 115, 22], fontSize: 8, fontStyle: 'bold' },
      didParseCell: function(data) {
        if (data.column.index === 6 && data.cell.raw === 'YES') {
          data.cell.styles.fillColor = [254, 202, 202];
          data.cell.styles.textColor = [153, 27, 27];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });
  }

  // Product Gaps table
  if (productGaps.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Product Gaps (${productGaps.length})`, 14, 15);
    
    const gapHeaders = ['Customer', 'Project', 'Product Gap', 'Assigned To', 'Est. Complete', 'Critical'];
    
    const sortedGaps = [...productGaps].sort((a, b) => {
      const orderA = projectOrderMap.get(a.project_id || '') ?? Infinity;
      const orderB = projectOrderMap.get(b.project_id || '') ?? Infinity;
      return orderA - orderB;
    });
    
    const gapRows = sortedGaps.map(gap => [
      gap.company_name || '',
      gap.project_name || '',
      gap.title,
      gap.assigned_to_name || '-',
      gap.estimated_complete_date ? formatDateUK(gap.estimated_complete_date) : '-',
      gap.is_critical ? 'YES' : ''
    ]);

    autoTable(doc, {
      head: [gapHeaders],
      body: gapRows,
      startY: 20,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [34, 197, 94], fontSize: 8, fontStyle: 'bold' },
      didParseCell: function(data) {
        if (data.column.index === 5 && data.cell.raw === 'YES') {
          data.cell.styles.fillColor = [254, 202, 202];
          data.cell.styles.textColor = [153, 27, 27];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });
  }

  // Upcoming Events table
  if (events.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Upcoming Events (${events.length})`, 14, 15);
    
    const eventHeaders = ['Customer', 'Project', 'Event', 'Type', 'Start Date', 'End Date'];
    
    const sortedEvents = [...events].sort((a, b) => {
      const orderA = projectOrderMap.get(a.project_id || '') ?? Infinity;
      const orderB = projectOrderMap.get(b.project_id || '') ?? Infinity;
      return orderA - orderB;
    });
    
    const eventRows = sortedEvents.map(event => [
      event.company_name || '',
      event.project_name || '',
      event.title || '',
      event.event_type || '-',
      event.start_date ? formatDateUK(event.start_date) : '-',
      event.end_date ? formatDateUK(event.end_date) : '-'
    ]);

    autoTable(doc, {
      head: [eventHeaders],
      body: eventRows,
      startY: 20,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], fontSize: 8, fontStyle: 'bold' }
    });
  }

  // Open Features table
  if (featureRequests.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Open Features (${featureRequests.length})`, 14, 15);
    
    const featureHeaders = ['Title', 'Problem Statement', 'Status', 'Required Date', 'Product Gaps', 'Creator'];
    
    const featureRows = featureRequests.map(fr => [
      fr.title || '',
      fr.problem_statement ? (fr.problem_statement.length > 60 ? fr.problem_statement.substring(0, 60) + '...' : fr.problem_statement) : '-',
      fr.status || '-',
      fr.required_date ? formatDateUK(fr.required_date) : '-',
      fr.product_gaps_count ? String(fr.product_gaps_count) : '0',
      fr.profiles?.name || '-'
    ]);

    autoTable(doc, {
      head: [featureHeaders],
      body: featureRows,
      startY: 20,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [234, 179, 8], fontSize: 8, fontStyle: 'bold' },
      didParseCell: function(data) {
        // Highlight critical product gaps count
        if (data.column.index === 4) {
          const count = parseInt(data.cell.raw as string, 10);
          if (count > 0) {
            data.cell.styles.fillColor = [254, 243, 199];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });
  }

  // Add page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - 25,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  // Download
  const filename = `Executive_Summary_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`;
  doc.save(filename);
}
