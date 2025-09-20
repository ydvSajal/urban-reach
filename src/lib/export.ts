import { supabase } from "@/integrations/supabase/client";

export interface ExportOptions {
  format: 'csv' | 'pdf' | 'excel';
  dateRange: {
    start: string;
    end: string;
  };
  filters?: {
    category?: string;
    status?: string;
    priority?: string;
    councilId?: string;
  };
  includeCharts?: boolean;
  includeSummary?: boolean;
}

export interface ExportData {
  reports: any[];
  analytics: {
    totalReports: number;
    resolvedReports: number;
    avgResolutionTime: number;
    reportsByCategory: Array<{ name: string; value: number; percentage: number }>;
    reportsByStatus: Array<{ name: string; value: number; percentage: number }>;
    reportsByPriority: Array<{ name: string; value: number; percentage: number }>;
  };
}

export class ExportService {
  static async exportData(options: ExportOptions): Promise<void> {
    try {
      console.log('Starting export with options:', options);
      
      // Fetch data based on options
      const data = await this.fetchExportData(options);
      console.log('Fetched export data:', { reportCount: data.reports.length, analytics: data.analytics });
      
      if (data.reports.length === 0) {
        throw new Error('No data found for the selected date range and filters');
      }
      
      switch (options.format) {
        case 'csv':
          await this.exportCSV(data, options);
          break;
        case 'pdf':
          await this.exportPDF(data, options);
          break;
        case 'excel':
          await this.exportExcel(data, options);
          break;
        default:
          throw new Error('Unsupported export format');
      }
      
      console.log('Export completed successfully');
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }

  private static async fetchExportData(options: ExportOptions): Promise<ExportData> {
    try {
      console.log('Fetching data from Supabase with date range:', options.dateRange);
      
      let query = supabase
        .from("reports")
        .select(`
          *,
          citizen:profiles!reports_citizen_id_fkey(full_name, email),
          assigned_worker:workers(full_name, email),
          council:councils(name)
        `)
        .gte("created_at", options.dateRange.start)
        .lte("created_at", options.dateRange.end);

      // Apply filters
      if (options.filters?.category) {
        console.log('Applying category filter:', options.filters.category);
        query = query.eq("category", options.filters.category as any);
      }
      if (options.filters?.status) {
        console.log('Applying status filter:', options.filters.status);
        query = query.eq("status", options.filters.status as any);
      }
      if (options.filters?.priority) {
        console.log('Applying priority filter:', options.filters.priority);
        query = query.eq("priority", options.filters.priority as any);
      }
      if (options.filters?.councilId) {
        console.log('Applying council filter:', options.filters.councilId);
        query = query.eq("council_id", options.filters.councilId);
      }

      const { data: reports, error } = await query.order("created_at", { ascending: false });

      if (error) {
        console.error('Supabase query error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log('Raw reports data:', reports?.length || 0, 'reports found');

      // Process analytics data
      const analytics = this.processAnalyticsData(reports || []);

      return {
        reports: reports || [],
        analytics
      };
    } catch (error) {
      console.error('Error fetching export data:', error);
      throw error;
    }
  }

  private static processAnalyticsData(reports: any[]) {
    const total = reports.length;
    const resolved = reports.filter(r => ['resolved', 'closed'].includes(r.status)).length;

    // Calculate average resolution time
    const resolvedReports = reports.filter(r => r.resolved_at);
    const avgResolutionTime = resolvedReports.length > 0 
      ? resolvedReports.reduce((acc, report) => {
          const created = new Date(report.created_at);
          const resolvedDate = new Date(report.resolved_at);
          return acc + (resolvedDate.getTime() - created.getTime());
        }, 0) / resolvedReports.length / (1000 * 60 * 60 * 24)
      : 0;

    // Reports by category
    const categoryCount = reports.reduce((acc, report) => {
      acc[report.category] = (acc[report.category] || 0) + 1;
      return acc;
    }, {});

    const reportsByCategory = Object.entries(categoryCount).map(([category, count]) => ({
      name: category.replace('_', ' ').toUpperCase(),
      value: count as number,
      percentage: total > 0 ? Math.round(((count as number) / total) * 100) : 0,
    }));

    // Reports by status
    const statusCount = reports.reduce((acc, report) => {
      acc[report.status] = (acc[report.status] || 0) + 1;
      return acc;
    }, {});

    const reportsByStatus = Object.entries(statusCount).map(([status, count]) => ({
      name: status.replace('_', ' ').toUpperCase(),
      value: count as number,
      percentage: total > 0 ? Math.round(((count as number) / total) * 100) : 0,
    }));

    // Reports by priority
    const priorityCount = reports.reduce((acc, report) => {
      acc[report.priority] = (acc[report.priority] || 0) + 1;
      return acc;
    }, {});

    const reportsByPriority = Object.entries(priorityCount).map(([priority, count]) => ({
      name: priority ? priority.toUpperCase() : 'NOT SET',
      value: count as number,
      percentage: total > 0 ? Math.round(((count as number) / total) * 100) : 0,
    }));

    return {
      totalReports: total,
      resolvedReports: resolved,
      avgResolutionTime,
      reportsByCategory,
      reportsByStatus,
      reportsByPriority
    };
  }

  private static async exportCSV(data: ExportData, options: ExportOptions): Promise<void> {
    try {
      console.log('Generating CSV export...');
      let csvContent = '';

      // Add summary if requested
      if (options.includeSummary) {
        csvContent += 'MUNICIPAL REPORTS ANALYTICS SUMMARY\n';
        csvContent += '=====================================\n';
        csvContent += `Export Date:,${new Date().toLocaleDateString()}\n`;
        csvContent += `Date Range:,${new Date(options.dateRange.start).toLocaleDateString()} - ${new Date(options.dateRange.end).toLocaleDateString()}\n`;
        csvContent += `Total Reports:,${data.analytics.totalReports}\n`;
        csvContent += `Resolved Reports:,${data.analytics.resolvedReports}\n`;
        csvContent += `Resolution Rate:,${data.analytics.totalReports > 0 ? Math.round((data.analytics.resolvedReports / data.analytics.totalReports) * 100) : 0}%\n`;
        csvContent += `Average Resolution Time:,${data.analytics.avgResolutionTime.toFixed(1)} days\n\n`;

        // Add category breakdown
        csvContent += 'REPORTS BY CATEGORY\n';
        csvContent += 'Category,Count,Percentage\n';
        data.analytics.reportsByCategory.forEach(item => {
          csvContent += `${item.name},${item.value},${item.percentage}%\n`;
        });
        csvContent += '\n';

        // Add status breakdown
        csvContent += 'REPORTS BY STATUS\n';
        csvContent += 'Status,Count,Percentage\n';
        data.analytics.reportsByStatus.forEach(item => {
          csvContent += `${item.name},${item.value},${item.percentage}%\n`;
        });
        csvContent += '\n';
      }

      // Add detailed reports data
      csvContent += 'DETAILED REPORTS DATA\n';
      csvContent += 'Report Number,Title,Category,Status,Priority,Citizen Name,Citizen Email,Assigned Worker,Council,Created Date,Resolved Date,Location Address\n';
      
      data.reports.forEach(report => {
        const row = [
          report.report_number || 'N/A',
          `"${(report.title || '').replace(/"/g, '""')}"`,
          (report.category || 'N/A').replace('_', ' ').toUpperCase(),
          (report.status || 'N/A').replace('_', ' ').toUpperCase(),
          report.priority ? report.priority.toUpperCase() : 'Not Set',
          report.citizen?.full_name || 'N/A',
          report.citizen?.email || 'N/A',
          report.assigned_worker?.full_name || 'Unassigned',
          report.council?.name || 'N/A',
          report.created_at ? new Date(report.created_at).toLocaleDateString() : 'N/A',
          report.resolved_at ? new Date(report.resolved_at).toLocaleDateString() : 'Not Resolved',
          `"${(report.location_address || '').replace(/"/g, '""')}"`
        ];
        csvContent += row.join(',') + '\n';
      });

      console.log('CSV content generated, size:', csvContent.length, 'characters');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `municipal_reports_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('CSV download initiated');
    } catch (error) {
      console.error('CSV export error:', error);
      throw new Error(`CSV export failed: ${error.message}`);
    }
  }

  private static async exportPDF(data: ExportData, options: ExportOptions): Promise<void> {
    // For PDF export, we'll create a structured HTML content and use browser's print functionality
    const htmlContent = this.generatePDFContent(data, options);
    
    // Create a new window with the content
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for content to load, then trigger print
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 1000);
    }
  }

  private static generatePDFContent(data: ExportData, options: ExportOptions): string {
    const resolutionRate = data.analytics.totalReports > 0 
      ? Math.round((data.analytics.resolvedReports / data.analytics.totalReports) * 100)
      : 0;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Municipal Reports Analytics</title>
        <style>
          @media print {
            body { margin: 0; }
            .page-break { page-break-before: always; }
          }
          body {
            font-family: Arial, sans-serif;
            line-height: 1.4;
            margin: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 10px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #2563eb;
            margin: 0;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 30px;
          }
          .summary-card {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
          }
          .summary-card h3 {
            margin: 0 0 5px 0;
            color: #2563eb;
            font-size: 24px;
          }
          .summary-card p {
            margin: 0;
            font-size: 14px;
            color: #6b7280;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            border: 1px solid #e5e7eb;
            padding: 8px 12px;
            text-align: left;
          }
          th {
            background-color: #f9fafb;
            font-weight: bold;
          }
          .chart-placeholder {
            height: 200px;
            border: 1px solid #e5e7eb;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 20px 0;
            background-color: #f9fafb;
            border-radius: 8px;
          }
          .date-range {
            text-align: center;
            font-style: italic;
            color: #6b7280;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Municipal Reports Analytics</h1>
          <div class="date-range">
            Report Period: ${new Date(options.dateRange.start).toLocaleDateString()} - ${new Date(options.dateRange.end).toLocaleDateString()}
          </div>
        </div>

        ${options.includeSummary ? `
        <div class="summary-grid">
          <div class="summary-card">
            <h3>${data.analytics.totalReports}</h3>
            <p>Total Reports</p>
          </div>
          <div class="summary-card">
            <h3>${data.analytics.resolvedReports}</h3>
            <p>Resolved Reports</p>
          </div>
          <div class="summary-card">
            <h3>${resolutionRate}%</h3>
            <p>Resolution Rate</p>
          </div>
          <div class="summary-card">
            <h3>${data.analytics.avgResolutionTime.toFixed(1)}</h3>
            <p>Avg Resolution (Days)</p>
          </div>
        </div>

        <h2>Reports by Category</h2>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Count</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            ${data.analytics.reportsByCategory.map(item => `
              <tr>
                <td>${item.name}</td>
                <td>${item.value}</td>
                <td>${item.percentage}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>Reports by Status</h2>
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Count</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            ${data.analytics.reportsByStatus.map(item => `
              <tr>
                <td>${item.name}</td>
                <td>${item.value}</td>
                <td>${item.percentage}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="page-break"></div>
        ` : ''}

        <h2>Detailed Reports</h2>
        <table>
          <thead>
            <tr>
              <th>Report #</th>
              <th>Title</th>
              <th>Category</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Citizen</th>
              <th>Assigned Worker</th>
              <th>Created Date</th>
              <th>Resolved Date</th>
            </tr>
          </thead>
          <tbody>
            ${data.reports.map(report => `
              <tr>
                <td>${report.report_number}</td>
                <td>${report.title}</td>
                <td>${report.category}</td>
                <td>${report.status}</td>
                <td>${report.priority || 'Not Set'}</td>
                <td>${report.citizen?.full_name || 'N/A'}</td>
                <td>${report.assigned_worker?.full_name || 'Unassigned'}</td>
                <td>${new Date(report.created_at).toLocaleDateString()}</td>
                <td>${report.resolved_at ? new Date(report.resolved_at).toLocaleDateString() : 'Not Resolved'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #6b7280;">
          Generated on ${new Date().toLocaleString()} | Municipal Complaint Management System
        </div>
      </body>
      </html>
    `;
  }

  private static async exportExcel(data: ExportData, options: ExportOptions): Promise<void> {
    // For Excel export, we'll create a structured CSV that opens well in Excel
    // with proper formatting and multiple sheets structure
    let excelContent = '';

    // Add BOM for proper UTF-8 encoding in Excel
    const BOM = '\uFEFF';
    
    if (options.includeSummary) {
      excelContent += 'SUMMARY SHEET\n';
      excelContent += '=============\n\n';
      excelContent += `Export Date,${new Date().toLocaleDateString()}\n`;
      excelContent += `Date Range,${new Date(options.dateRange.start).toLocaleDateString()} - ${new Date(options.dateRange.end).toLocaleDateString()}\n\n`;
      
      excelContent += 'KEY METRICS\n';
      excelContent += 'Metric,Value\n';
      excelContent += `Total Reports,${data.analytics.totalReports}\n`;
      excelContent += `Resolved Reports,${data.analytics.resolvedReports}\n`;
      excelContent += `Resolution Rate,${data.analytics.totalReports > 0 ? Math.round((data.analytics.resolvedReports / data.analytics.totalReports) * 100) : 0}%\n`;
      excelContent += `Average Resolution Time,${data.analytics.avgResolutionTime.toFixed(1)} days\n\n`;

      excelContent += 'CATEGORY BREAKDOWN\n';
      excelContent += 'Category,Count,Percentage\n';
      data.analytics.reportsByCategory.forEach(item => {
        excelContent += `${item.name},${item.value},${item.percentage}%\n`;
      });
      excelContent += '\n';

      excelContent += 'STATUS BREAKDOWN\n';
      excelContent += 'Status,Count,Percentage\n';
      data.analytics.reportsByStatus.forEach(item => {
        excelContent += `${item.name},${item.value},${item.percentage}%\n`;
      });
      excelContent += '\n';

      excelContent += 'PRIORITY BREAKDOWN\n';
      excelContent += 'Priority,Count,Percentage\n';
      data.analytics.reportsByPriority.forEach(item => {
        excelContent += `${item.name},${item.value},${item.percentage}%\n`;
      });
      excelContent += '\n\n';
    }

    // Add detailed data
    excelContent += 'DETAILED REPORTS DATA\n';
    excelContent += '====================\n\n';
    excelContent += 'Report Number,Title,Category,Status,Priority,Citizen Name,Citizen Email,Assigned Worker,Council,Created Date,Resolved Date,Resolution Days,Location Address,Description\n';
    
    data.reports.forEach(report => {
      const resolutionDays = report.resolved_at 
        ? Math.ceil((new Date(report.resolved_at).getTime() - new Date(report.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : '';

      const row = [
        report.report_number,
        `"${report.title.replace(/"/g, '""')}"`,
        report.category.replace('_', ' ').toUpperCase(),
        report.status.replace('_', ' ').toUpperCase(),
        report.priority ? report.priority.toUpperCase() : 'NOT SET',
        report.citizen?.full_name || 'N/A',
        report.citizen?.email || 'N/A',
        report.assigned_worker?.full_name || 'Unassigned',
        report.council?.name || 'N/A',
        new Date(report.created_at).toLocaleDateString(),
        report.resolved_at ? new Date(report.resolved_at).toLocaleDateString() : 'Not Resolved',
        resolutionDays,
        `"${report.location_address.replace(/"/g, '""')}"`,
        `"${report.description.replace(/"/g, '""')}"`
      ];
      excelContent += row.join(',') + '\n';
    });

    // Download as Excel-compatible CSV
    const blob = new Blob([BOM + excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `municipal_reports_detailed_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  static getDefaultExportOptions(): ExportOptions {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30); // Last 30 days

    return {
      format: 'csv',
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      includeCharts: false,
      includeSummary: true
    };
  }
}
