import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export type ExportFormat = 'csv' | 'excel' | 'pdf' | 'json';
export type ReportType = 'all_reports' | 'status_summary' | 'worker_performance' | 'citizen_engagement' | 'location_analysis' | 'time_series' | 'custom';

export interface ExportFilter {
  dateRange?: { start: Date; end: Date };
  status?: string[];
  priority?: string[];
  category?: string[];
  assignedWorker?: string[];
  location?: string;
  citizenId?: string;
}

export interface CustomReportField {
  field: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  aggregate?: 'count' | 'sum' | 'avg' | 'min' | 'max';
}

export interface CustomReportConfig {
  title: string;
  description?: string;
  fields: CustomReportField[];
  filters: ExportFilter;
  groupBy?: string[];
  sortBy?: { field: string; direction: 'asc' | 'desc' }[];
}

export interface ExportResult {
  success: boolean;
  data?: any;
  url?: string;
  filename: string;
  error?: string;
}

export class DataExportService {
  /**
   * Export reports data in various formats
   */
  static async exportReports(
    reportType: ReportType,
    format: ExportFormat,
    filters: ExportFilter = {},
    customConfig?: CustomReportConfig
  ): Promise<ExportResult> {
    try {
      let data;
      let filename;

      switch (reportType) {
        case 'all_reports':
          data = await this.getAllReports(filters);
          filename = `all-reports-${this.getDateString()}`;
          break;
        case 'status_summary':
          data = await this.getStatusSummary(filters);
          filename = `status-summary-${this.getDateString()}`;
          break;
        case 'worker_performance':
          data = await this.getWorkerPerformance(filters);
          filename = `worker-performance-${this.getDateString()}`;
          break;
        case 'citizen_engagement':
          data = await this.getCitizenEngagement(filters);
          filename = `citizen-engagement-${this.getDateString()}`;
          break;
        case 'location_analysis':
          data = await this.getLocationAnalysis(filters);
          filename = `location-analysis-${this.getDateString()}`;
          break;
        case 'time_series':
          data = await this.getTimeSeries(filters);
          filename = `time-series-${this.getDateString()}`;
          break;
        case 'custom':
          if (!customConfig) {
            throw new Error('Custom report configuration required');
          }
          data = await this.getCustomReport(customConfig);
          filename = customConfig.title.toLowerCase().replace(/\s+/g, '-') + '-' + this.getDateString();
          break;
        default:
          throw new Error('Invalid report type');
      }

      return await this.formatAndDownload(data, format, filename, customConfig?.title || reportType);
    } catch (error: any) {
      return {
        success: false,
        filename: '',
        error: error.message || 'Export failed'
      };
    }
  }

  /**
   * Get all reports with filters
   */
  private static async getAllReports(filters: ExportFilter) {
    let query = supabase
      .from('reports')
      .select(`
        *,
        assigned_worker:profiles!assigned_worker_id(full_name, email),
        citizen:profiles!citizen_id(full_name, email)
      `);

    query = this.applyFilters(query, filters);
    
    const { data, error } = await query;
    if (error) throw error;

    return data?.map(report => ({
      'Report ID': report.id,
      'Report Number': report.report_number,
      'Title': report.title,
      'Description': report.description,
      'Category': report.category,
      'Status': report.status,
      'Priority': report.priority,
      'Location': report.location,
      'Latitude': report.latitude,
      'Longitude': report.longitude,
      'Created Date': new Date(report.created_at).toLocaleDateString(),
      'Updated Date': new Date(report.updated_at).toLocaleDateString(),
      'Resolved Date': report.resolved_at ? new Date(report.resolved_at).toLocaleDateString() : '',
      'Citizen Name': report.citizen?.full_name || 'Unknown',
      'Citizen Email': report.citizen?.email || '',
      'Assigned Worker': report.assigned_worker?.full_name || 'Unassigned',
      'Worker Email': report.assigned_worker?.email || '',
      'Upvotes': report.upvotes_count || 0,
      'Comments': report.comments_count || 0,
      'Images': report.image_urls?.length || 0
    })) || [];
  }

  /**
   * Get status summary report
   */
  private static async getStatusSummary(filters: ExportFilter) {
    let query = supabase
      .from('reports')
      .select('status, priority, category, created_at');

    query = this.applyFilters(query, filters);
    
    const { data, error } = await query;
    if (error) throw error;

    const summary = data?.reduce((acc: any, report) => {
      const status = report.status;
      const priority = report.priority;
      const category = report.category;
      
      if (!acc[status]) acc[status] = { total: 0, high: 0, medium: 0, low: 0, categories: {} };
      
      acc[status].total++;
      acc[status][priority]++;
      
      if (!acc[status].categories[category]) acc[status].categories[category] = 0;
      acc[status].categories[category]++;
      
      return acc;
    }, {});

    // Convert to flat array for export
    const result = [];
    for (const [status, stats] of Object.entries(summary || {})) {
      const s = stats as any;
      result.push({
        'Status': status,
        'Total Reports': s.total,
        'High Priority': s.high,
        'Medium Priority': s.medium,
        'Low Priority': s.low,
        'Categories': Object.keys(s.categories).join(', ')
      });
    }

    return result;
  }

  /**
   * Get worker performance report
   */
  private static async getWorkerPerformance(filters: ExportFilter) {
    let query = supabase
      .from('reports')
      .select(`
        assigned_worker_id,
        status,
        priority,
        created_at,
        resolved_at,
        assigned_worker:profiles!assigned_worker_id(full_name, email, specialty)
      `)
      .not('assigned_worker_id', 'is', null);

    query = this.applyFilters(query, filters);
    
    const { data, error } = await query;
    if (error) throw error;

    const performance = data?.reduce((acc: any, report) => {
      const workerId = report.assigned_worker_id;
      const worker = report.assigned_worker;
      
      if (!acc[workerId]) {
        acc[workerId] = {
          name: worker?.full_name || 'Unknown',
          email: worker?.email || '',
          specialty: worker?.specialty || '',
          total: 0,
          resolved: 0,
          pending: 0,
          in_progress: 0,
          high_priority: 0,
          avg_resolution_time: 0,
          resolution_times: []
        };
      }
      
      acc[workerId].total++;
      
      if (report.status === 'resolved' || report.status === 'closed') {
        acc[workerId].resolved++;
        if (report.resolved_at && report.created_at) {
          const resolutionTime = new Date(report.resolved_at).getTime() - new Date(report.created_at).getTime();
          acc[workerId].resolution_times.push(resolutionTime);
        }
      } else if (report.status === 'pending') {
        acc[workerId].pending++;
      } else if (report.status === 'in_progress') {
        acc[workerId].in_progress++;
      }
      
      if (report.priority === 'high') {
        acc[workerId].high_priority++;
      }
      
      return acc;
    }, {});

    // Calculate averages and convert to array
    const result = Object.values(performance || {}).map((worker: any) => {
      const avgResolutionTime = worker.resolution_times.length > 0
        ? worker.resolution_times.reduce((sum: number, time: number) => sum + time, 0) / worker.resolution_times.length
        : 0;

      return {
        'Worker Name': worker.name,
        'Email': worker.email,
        'Specialty': worker.specialty,
        'Total Assigned': worker.total,
        'Resolved': worker.resolved,
        'In Progress': worker.in_progress,
        'Pending': worker.pending,
        'High Priority Handled': worker.high_priority,
        'Resolution Rate': worker.total > 0 ? ((worker.resolved / worker.total) * 100).toFixed(1) + '%' : '0%',
        'Avg Resolution Time (hours)': (avgResolutionTime / (1000 * 60 * 60)).toFixed(1)
      };
    });

    return result;
  }

  /**
   * Get citizen engagement report
   */
  private static async getCitizenEngagement(filters: ExportFilter) {
    let query = supabase
      .from('reports')
      .select(`
        citizen_id,
        upvotes_count,
        comments_count,
        created_at,
        status,
        citizen:profiles!citizen_id(full_name, email)
      `);

    query = this.applyFilters(query, filters);
    
    const { data, error } = await query;
    if (error) throw error;

    const engagement = data?.reduce((acc: any, report) => {
      const citizenId = report.citizen_id;
      const citizen = report.citizen;
      
      if (!acc[citizenId]) {
        acc[citizenId] = {
          name: citizen?.full_name || 'Unknown',
          email: citizen?.email || '',
          reports: 0,
          total_upvotes: 0,
          total_comments: 0,
          resolved_reports: 0,
          first_report: report.created_at,
          last_report: report.created_at
        };
      }
      
      acc[citizenId].reports++;
      acc[citizenId].total_upvotes += report.upvotes_count || 0;
      acc[citizenId].total_comments += report.comments_count || 0;
      
      if (report.status === 'resolved' || report.status === 'closed') {
        acc[citizenId].resolved_reports++;
      }
      
      if (new Date(report.created_at) < new Date(acc[citizenId].first_report)) {
        acc[citizenId].first_report = report.created_at;
      }
      
      if (new Date(report.created_at) > new Date(acc[citizenId].last_report)) {
        acc[citizenId].last_report = report.created_at;
      }
      
      return acc;
    }, {});

    const result = Object.values(engagement || {}).map((citizen: any) => ({
      'Citizen Name': citizen.name,
      'Email': citizen.email,
      'Total Reports': citizen.reports,
      'Resolved Reports': citizen.resolved_reports,
      'Total Upvotes Received': citizen.total_upvotes,
      'Total Comments Received': citizen.total_comments,
      'Avg Upvotes per Report': citizen.reports > 0 ? (citizen.total_upvotes / citizen.reports).toFixed(1) : '0',
      'First Report Date': new Date(citizen.first_report).toLocaleDateString(),
      'Last Report Date': new Date(citizen.last_report).toLocaleDateString(),
      'Success Rate': citizen.reports > 0 ? ((citizen.resolved_reports / citizen.reports) * 100).toFixed(1) + '%' : '0%'
    }));

    return result;
  }

  /**
   * Get location analysis report
   */
  private static async getLocationAnalysis(filters: ExportFilter) {
    let query = supabase
      .from('reports')
      .select('location, category, status, priority, latitude, longitude, created_at');

    query = this.applyFilters(query, filters);
    
    const { data, error } = await query;
    if (error) throw error;

    const locationStats = data?.reduce((acc: any, report) => {
      const location = report.location || 'Unknown Location';
      
      if (!acc[location]) {
        acc[location] = {
          total: 0,
          resolved: 0,
          high_priority: 0,
          categories: {},
          coordinates: report.latitude && report.longitude ? { lat: report.latitude, lng: report.longitude } : null
        };
      }
      
      acc[location].total++;
      
      if (report.status === 'resolved' || report.status === 'closed') {
        acc[location].resolved++;
      }
      
      if (report.priority === 'high') {
        acc[location].high_priority++;
      }
      
      if (!acc[location].categories[report.category]) {
        acc[location].categories[report.category] = 0;
      }
      acc[location].categories[report.category]++;
      
      return acc;
    }, {});

    const result = Object.entries(locationStats || {}).map(([location, stats]: [string, any]) => ({
      'Location': location,
      'Total Reports': stats.total,
      'Resolved Reports': stats.resolved,
      'High Priority Reports': stats.high_priority,
      'Resolution Rate': stats.total > 0 ? ((stats.resolved / stats.total) * 100).toFixed(1) + '%' : '0%',
      'Most Common Category': Object.keys(stats.categories).reduce((a, b) => stats.categories[a] > stats.categories[b] ? a : b, ''),
      'Latitude': stats.coordinates?.lat || '',
      'Longitude': stats.coordinates?.lng || ''
    }));

    return result;
  }

  /**
   * Get time series data
   */
  private static async getTimeSeries(filters: ExportFilter) {
    let query = supabase
      .from('reports')
      .select('created_at, resolved_at, status, priority, category');

    query = this.applyFilters(query, filters);
    
    const { data, error } = await query;
    if (error) throw error;

    // Group by month
    const timeSeries = data?.reduce((acc: any, report) => {
      const month = new Date(report.created_at).toISOString().slice(0, 7); // YYYY-MM format
      
      if (!acc[month]) {
        acc[month] = {
          created: 0,
          resolved: 0,
          high_priority: 0,
          categories: {}
        };
      }
      
      acc[month].created++;
      
      if (report.resolved_at && new Date(report.resolved_at).toISOString().slice(0, 7) === month) {
        acc[month].resolved++;
      }
      
      if (report.priority === 'high') {
        acc[month].high_priority++;
      }
      
      if (!acc[month].categories[report.category]) {
        acc[month].categories[report.category] = 0;
      }
      acc[month].categories[report.category]++;
      
      return acc;
    }, {});

    const result = Object.entries(timeSeries || {}).map(([month, stats]: [string, any]) => ({
      'Month': month,
      'Reports Created': stats.created,
      'Reports Resolved': stats.resolved,
      'High Priority Reports': stats.high_priority,
      'Resolution Rate': stats.created > 0 ? ((stats.resolved / stats.created) * 100).toFixed(1) + '%' : '0%',
      'Top Category': Object.keys(stats.categories).reduce((a, b) => stats.categories[a] > stats.categories[b] ? a : b, '')
    })).sort((a, b) => a.Month.localeCompare(b.Month));

    return result;
  }

  /**
   * Get custom report data
   */
  private static async getCustomReport(config: CustomReportConfig) {
    // This is a simplified implementation - in a real app, you'd build dynamic queries
    const baseData = await this.getAllReports(config.filters);
    
    // Apply field selection and transforms
    const selectedData = baseData.map(row => {
      const newRow: any = {};
      config.fields.forEach(field => {
        newRow[field.label] = row[field.field] || '';
      });
      return newRow;
    });

    // Apply grouping and sorting if specified
    if (config.groupBy && config.groupBy.length > 0) {
      // Implement grouping logic here
      // This is a placeholder for more complex grouping functionality
    }

    if (config.sortBy && config.sortBy.length > 0) {
      selectedData.sort((a, b) => {
        for (const sort of config.sortBy!) {
          const aVal = a[sort.field];
          const bVal = b[sort.field];
          const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
          if (comparison !== 0) {
            return sort.direction === 'desc' ? -comparison : comparison;
          }
        }
        return 0;
      });
    }

    return selectedData;
  }

  /**
   * Apply filters to a Supabase query
   */
  private static applyFilters(query: any, filters: ExportFilter) {
    if (filters.dateRange) {
      query = query
        .gte('created_at', filters.dateRange.start.toISOString())
        .lte('created_at', filters.dateRange.end.toISOString());
    }

    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    if (filters.priority && filters.priority.length > 0) {
      query = query.in('priority', filters.priority);
    }

    if (filters.category && filters.category.length > 0) {
      query = query.in('category', filters.category);
    }

    if (filters.assignedWorker && filters.assignedWorker.length > 0) {
      query = query.in('assigned_worker_id', filters.assignedWorker);
    }

    if (filters.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }

    if (filters.citizenId) {
      query = query.eq('citizen_id', filters.citizenId);
    }

    return query;
  }

  /**
   * Format data and create downloadable file
   * Uses the ExportService from export.ts for consistent export functionality
   */
  private static async formatAndDownload(
    data: any[],
    format: ExportFormat,
    filename: string,
    title: string
  ): Promise<ExportResult> {
    try {
      // Handle each format with appropriate method
      switch (format) {
        case 'json':
          return this.exportToJSON(data, filename);
        case 'csv':
          return this.exportToCSV(data, filename);
        case 'excel':
          return this.exportToExcel(data, filename, title);
        case 'pdf':
          return this.exportToPDF(data, filename, title);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error: any) {
      return {
        success: false,
        filename,
        error: error.message || 'Export formatting failed'
      };
    }
  }

  /**
   * Export to CSV format
   */
  private static exportToCSV(data: any[], filename: string): ExportResult {
    if (!data || data.length === 0) {
      return {
        success: false,
        filename,
        error: 'No data to export'
      };
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    return {
      success: true,
      data: csvContent,
      url,
      filename: `${filename}.csv`
    };
  }

  /**
   * Export to Excel format
   */
  private static exportToExcel(data: any[], filename: string, title: string): ExportResult {
    try {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data);
      
      // Add title and metadata
      XLSX.utils.sheet_add_aoa(worksheet, [
        [title],
        [`Generated on: ${new Date().toLocaleString()}`],
        [`Total Records: ${data.length}`],
        []
      ], { origin: 'A1' });

      // Adjust column widths
      const colWidths = Object.keys(data[0] || {}).map(() => ({ wch: 15 }));
      worksheet['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);

      return {
        success: true,
        data: excelBuffer,
        url,
        filename: `${filename}.xlsx`
      };
    } catch (error: any) {
      return {
        success: false,
        filename,
        error: error.message || 'Excel export failed'
      };
    }
  }

  /**
   * Export to PDF format
   */
  private static exportToPDF(data: any[], filename: string, title: string): ExportResult {
    try {
      const doc = new jsPDF();
      
      // Add title and metadata
      doc.setFontSize(16);
      doc.text(title, 14, 20);
      
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
      doc.text(`Total Records: ${data.length}`, 14, 36);

      if (data.length === 0) {
        doc.text('No data available', 14, 50);
      } else {
        // Create table
        const headers = Object.keys(data[0]);
        const rows = data.map(row => headers.map(header => String(row[header] || '')));

        (doc as any).autoTable({
          startY: 45,
          head: [headers],
          body: rows,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [41, 128, 185] }
        });
      }

      const pdfOutput = doc.output('blob');
      const url = URL.createObjectURL(pdfOutput);

      return {
        success: true,
        data: pdfOutput,
        url,
        filename: `${filename}.pdf`
      };
    } catch (error: any) {
      return {
        success: false,
        filename,
        error: error.message || 'PDF export failed'
      };
    }
  }

  /**
   * Export to JSON format
   */
  private static exportToJSON(data: any[], filename: string): ExportResult {
    try {
      const jsonContent = JSON.stringify({
        metadata: {
          title: 'Urban Reach Export',
          generated_at: new Date().toISOString(),
          total_records: data.length
        },
        data
      }, null, 2);

      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      return {
        success: true,
        data: jsonContent,
        url,
        filename: `${filename}.json`
      };
    } catch (error: any) {
      return {
        success: false,
        filename,
        error: error.message || 'JSON export failed'
      };
    }
  }

  /**
   * Get formatted date string for filenames
   */
  private static getDateString(): string {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  }

  /**
   * Schedule automated report generation
   */
  static async scheduleReport(
    reportConfig: {
      type: ReportType;
      format: ExportFormat;
      filters: ExportFilter;
      customConfig?: CustomReportConfig;
      schedule: 'daily' | 'weekly' | 'monthly';
      recipients: string[];
      title: string;
    }
  ): Promise<{ success: boolean; scheduleId?: string; error?: string }> {
    try {
      // Store scheduled report configuration in database
      const { data, error } = await supabase
        .from('scheduled_reports')
        .insert({
          type: reportConfig.type,
          format: reportConfig.format,
          filters: reportConfig.filters,
          custom_config: reportConfig.customConfig,
          schedule: reportConfig.schedule,
          recipients: reportConfig.recipients,
          title: reportConfig.title,
          is_active: true,
          created_at: new Date().toISOString(),
          next_run: this.calculateNextRun(reportConfig.schedule)
        })
        .select('id')
        .single();

      if (error) throw error;

      return {
        success: true,
        scheduleId: data.id
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to schedule report'
      };
    }
  }

  /**
   * Calculate next run time for scheduled reports
   */
  private static calculateNextRun(schedule: 'daily' | 'weekly' | 'monthly'): string {
    const now = new Date();
    
    switch (schedule) {
      case 'daily':
        now.setDate(now.getDate() + 1);
        break;
      case 'weekly':
        now.setDate(now.getDate() + 7);
        break;
      case 'monthly':
        now.setMonth(now.getMonth() + 1);
        break;
    }
    
    // Set to 9 AM
    now.setHours(9, 0, 0, 0);
    
    return now.toISOString();
  }

  /**
   * Download file with proper browser handling
   */
  static downloadFile(result: ExportResult) {
    if (!result.success || !result.url) {
      throw new Error(result.error || 'Download failed');
    }

    const link = document.createElement('a');
    link.href = result.url;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up blob URL after download
    setTimeout(() => URL.revokeObjectURL(result.url!), 100);
  }

  /**
   * Generate analytics data for ExportService integration
   */
  private static generateAnalytics(data: any[]) {
    const total = data.length;
    const resolved = data.filter(r => ['resolved', 'closed'].includes(r.status || '')).length;

    // Calculate average resolution time
    const resolvedReports = data.filter(r => r.resolved_at);
    const avgResolutionTime = resolvedReports.length > 0 
      ? resolvedReports.reduce((acc, report) => {
          const created = new Date(report.created_at);
          const resolvedDate = new Date(report.resolved_at);
          return acc + (resolvedDate.getTime() - created.getTime());
        }, 0) / resolvedReports.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0;

    // Reports by category
    const categoryCount = data.reduce((acc, report) => {
      const category = report.category || 'unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    const reportsByCategory = Object.entries(categoryCount).map(([category, count]) => ({
      name: category.replace('_', ' ').toUpperCase(),
      value: count as number,
      percentage: total > 0 ? Math.round(((count as number) / total) * 100) : 0,
    }));

    // Reports by status
    const statusCount = data.reduce((acc, report) => {
      const status = report.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const reportsByStatus = Object.entries(statusCount).map(([status, count]) => ({
      name: status.replace('_', ' ').toUpperCase(),
      value: count as number,
      percentage: total > 0 ? Math.round(((count as number) / total) * 100) : 0,
    }));

    // Reports by priority
    const priorityCount = data.reduce((acc, report) => {
      const priority = report.priority || 'unknown';
      acc[priority] = (acc[priority] || 0) + 1;
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
}