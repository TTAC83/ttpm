/**
 * Service for exporting Gantt charts in various formats
 * Handles client-side export with font embedding
 */

import jsPDF from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import html2canvas from 'html2canvas';
import { GanttExportFormat, GanttItem, GanttEvent } from '../types/gantt.types';
import { format } from 'date-fns';
import { DATE_FORMATS } from '../utils/ganttConstants';

interface ExportOptions {
  projectName: string;
  customerName: string;
  items: GanttItem[];
  events?: GanttEvent[];
  format: GanttExportFormat;
  svgElement?: SVGSVGElement;
}

export class GanttExportService {
  /**
   * Export Gantt chart to specified format
   */
  async export(options: ExportOptions): Promise<void> {
    const { format } = options;

    switch (format) {
      case 'pdf':
        await this.exportToPDF(options);
        break;
      case 'png':
        await this.exportToPNG(options);
        break;
      case 'svg':
        await this.exportToSVG(options);
        break;
      case 'csv':
        await this.exportToCSV(options);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export to PDF using svg2pdf.js with font embedding
   */
  private async exportToPDF(options: ExportOptions): Promise<void> {
    const { projectName, customerName, svgElement } = options;

    if (!svgElement) {
      throw new Error('SVG element is required for PDF export');
    }

    try {
      // A3 landscape format (420mm x 297mm)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3',
      });

      // Add title
      pdf.setFontSize(16);
      pdf.text(`${customerName} - ${projectName}`, 10, 10);
      pdf.setFontSize(10);
      pdf.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 10, 17);

      // Clone SVG to avoid modifying the original
      const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
      
      // Calculate dimensions
      const svgWidth = parseFloat(svgClone.getAttribute('width') || '0');
      const svgHeight = parseFloat(svgClone.getAttribute('height') || '0');
      
      // PDF page dimensions (leaving margins)
      const pdfWidth = 400; // mm (A3 width - margins)
      const pdfHeight = 267; // mm (A3 height - margins - title space)
      
      // Calculate how many pages needed
      const scale = Math.min(pdfWidth / svgWidth, pdfHeight / svgHeight);
      const scaledHeight = svgHeight * scale;
      const pagesNeeded = Math.ceil(scaledHeight / pdfHeight);

      // Render SVG to PDF (multi-page if needed)
      await svg2pdf(svgClone, pdf, {
        x: 10,
        y: 25,
        width: pdfWidth,
        height: pdfHeight * pagesNeeded,
      });

      // Save the PDF
      const filename = this.generateFilename(customerName, projectName, 'pdf');
      pdf.save(filename);
    } catch (error) {
      console.error('PDF export failed:', error);
      throw new Error('Failed to export PDF. Please try again.');
    }
  }

  /**
   * Export to PNG using html2canvas
   */
  private async exportToPNG(options: ExportOptions): Promise<void> {
    const { projectName, customerName, svgElement } = options;

    if (!svgElement) {
      throw new Error('SVG element is required for PNG export');
    }

    try {
      const canvas = await html2canvas(svgElement as any, {
        scale: 2, // High DPI
        backgroundColor: '#ffffff',
        logging: false,
      });

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = this.generateFilename(customerName, projectName, 'png');
          link.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (error) {
      console.error('PNG export failed:', error);
      throw new Error('Failed to export PNG. Please try again.');
    }
  }

  /**
   * Export to SVG (raw vector format)
   */
  private async exportToSVG(options: ExportOptions): Promise<void> {
    const { projectName, customerName, svgElement } = options;

    if (!svgElement) {
      throw new Error('SVG element is required for SVG export');
    }

    try {
      // Serialize SVG to string
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgElement);

      // Create blob and download
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = this.generateFilename(customerName, projectName, 'svg');
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('SVG export failed:', error);
      throw new Error('Failed to export SVG. Please try again.');
    }
  }

  /**
   * Export to CSV (structured data)
   */
  private async exportToCSV(options: ExportOptions): Promise<void> {
    const { projectName, customerName, items } = options;

    try {
      // CSV headers
      const headers = [
        'Type',
        'Name',
        'Status',
        'Planned Start',
        'Planned End',
        'Actual Start',
        'Actual End',
        'Duration (days)',
        'Owner',
      ];

      // Convert items to CSV rows
      const rows = items.map((item) => [
        item.type,
        item.name,
        item.status,
        item.plannedStart ? format(item.plannedStart, DATE_FORMATS.export) : '',
        item.plannedEnd ? format(item.plannedEnd, DATE_FORMATS.export) : '',
        item.actualStart ? format(item.actualStart, DATE_FORMATS.export) : '',
        item.actualEnd ? format(item.actualEnd, DATE_FORMATS.export) : '',
        this.calculateDuration(item.plannedStart, item.plannedEnd),
        'owner' in item ? item.owner || '' : '',
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map(this.escapeCSV).join(',')),
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = this.generateFilename(customerName, projectName, 'csv');
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('CSV export failed:', error);
      throw new Error('Failed to export CSV. Please try again.');
    }
  }

  /**
   * Calculate duration between two dates in days
   */
  private calculateDuration(start: Date | null, end: Date | null): string {
    if (!start || !end) return '';
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff.toString();
  }

  /**
   * Escape CSV field (handle commas, quotes, newlines)
   */
  private escapeCSV(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  /**
   * Generate filename for export
   */
  private generateFilename(customerName: string, projectName: string, fileFormat: string): string {
    const sanitize = (str: string) =>
      str.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    return `${sanitize(customerName)}_${sanitize(projectName)}_gantt_${timestamp}.${fileFormat}`;
  }
}

// Export singleton instance
export const ganttExportService = new GanttExportService();
