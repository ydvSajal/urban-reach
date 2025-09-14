import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

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

  private static async getAllReports(filters: ExportFilter) {
    let query = supabase
      .from('reports')
      .select(`
        *,
        assigned_worker:workers!assigned_worker_id(full_name, email),
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
      'Location': report.location_address || 'Unknown',
      'Latitude': report.latitude,
      'Longitude': report.longitude,
      'Created Date': new Date(report.created_at).toLocaleDateString(),
      'Updated Date': new Date(report.updated_at).toLocaleDateString(),
      'Resolved Date': report.resolved_at ? new Date(report.resolved_at).toLocaleDateString() : '',
      'Citizen Name': (report.citizen as any)?.full_name || 'Unknown',
      'Citizen Email': (report.citizen as any)?.email || '',
      'Assigned Worker': (report.assigned_worker as any)?.full_name || 'Unassigned',
      'Worker Email': (report.assigned_worker as any)?.email || '',
      'Images': report.images?.length || 0
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

  private static async getWorkerPerformance(filters: ExportFilter) {
    let query = supabase
      .from('reports')
      .select(`
        assigned_worker_id,
        status,
        priority,
        created_at,
        resolved_at,
        assigned_worker:workers!assigned_worker_id(full_name, email)
      `)
      .not('assigned_worker_id', 'is', null);

    query = this.applyFilters(query, filters);
    
    const { data, error } = await query;
    if (error) throw error;

    const performance = data?.reduce((acc: any, report) => {
      const workerId = report.assigned_worker_id;
      const worker = report.assigned_worker as any;
      
      if (!acc[workerId]) {
        acc[workerId] = {
          name: worker?.full_name || 'Unknown',
          email: worker?.email || '',
          specialty: 'General',
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
        created_at,
        status,
        citizen:profiles!citizen_id(full_name, email)
      `);

    query = this.applyFilters(query, filters);
    
    const { data, error } = await query;
    if (error) throw error;

    const engagement = data?.reduce((acc: any, report) => {
      const citizenId = report.citizen_id;
      const citizen = report.citizen as any;
      
      if (!acc[citizenId]) {
        acc[citizenId] = {
          name: citizen?.full_name || 'Unknown',
          email: citizen?.email || '',
          reports: 0,
          resolved_reports: 0,
          first_report: report.created_at,
          last_report: report.created_at
        };
      }
      
      acc[citizenId].reports++;
      
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
      .select('location_address, category, status, priority, latitude, longitude, created_at');

    query = this.applyFilters(query, filters);
    
    const { data, error } = await query;
    if (error) throw error;

    const locationStats = data?.reduce((acc: any, report) => {
      const location = report.location_address || 'Unknown Location';
      
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
    const baseData = await this.getAllReports(config.filters);
    
    // Apply field selection and transforms
    const selectedData = baseData.map(row => {
      const newRow: any = {};
      config.fields.forEach(field => {
        newRow[field.label] = row[field.field] || '';
      });
      return newRow;
    });

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
      query = query.ilike('location_address', `%${filters.location}%`);
    }

    if (filters.citizenId) {
      query = query.eq('citizen_id', filters.citizenId);
    }

    return query;
  }

  /**
   * Format data and create download
   */
  private static async formatAndDownload(
    data: any[], 
    format: ExportFormat, 
    filename: string,
    title?: string
  ): Promise<ExportResult> {
    try {
      let blob: Blob;
      let mimeType: string;
      let extension: string;

      switch (format) {
        case 'csv':
          const csvContent = this.convertToCSV(data);
          blob = new Blob([csvContent], { type: 'text/csv' });
          mimeType = 'text/csv';
          extension = 'csv';
          break;

        case 'excel':
          const workbook = XLSX.utils.book_new();
          const worksheet = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Reports');
          const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
          blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          extension = 'xlsx';
          break;

        case 'pdf':
          const pdfBlob = await this.convertToPDF(data, title || 'Report');
          blob = pdfBlob;
          mimeType = 'application/pdf';
          extension = 'pdf';
          break;

        case 'json':
          const jsonContent = JSON.stringify(data, null, 2);
          blob = new Blob([jsonContent], { type: 'application/json' });
          mimeType = 'application/json';
          extension = 'json';
          break;

        default:
          throw new Error('Unsupported format');
      }

      // Create download URL
      const url = URL.createObjectURL(blob);
      const fullFilename = `${filename}.${extension}`;

      // Auto-download
      const link = document.createElement('a');
      link.href = url;
      link.download = fullFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up URL object
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      return {
        success: true,
        data,
        url,
        filename: fullFilename
      };
    } catch (error: any) {
      return {
        success: false,
        filename: '',
        error: error.message || 'Format conversion failed'
      };
    }
  }

  /**
   * Convert data to CSV format
   */
  private static convertToCSV(data: any[]): string {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [];

    // Add headers
    csvRows.push(headers.map(header => `"${header}"`).join(','));

    // Add data rows
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        return `"${String(value || '').replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Convert data to PDF format
   */
  private static async convertToPDF(data: any[], title: string): Promise<Blob> {
    const pdf = new jsPDF();
    
    // Add title
    pdf.setFontSize(16);
    pdf.text(title, 14, 22);
    
    // Add generation date
    pdf.setFontSize(10);
    pdf.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    
    if (data && data.length > 0) {
      const headers = Object.keys(data[0]);
      const rows = data.map(row => headers.map(header => String(row[header] || '')));
      
      // Add table (requires jspdf-autotable plugin)
      (pdf as any).autoTable({
        head: [headers],
        body: rows,
        startY: 35,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] }
      });
    } else {
      pdf.text('No data available', 14, 40);
    }
    
    return new Blob([pdf.output('blob')], { type: 'application/pdf' });
  }

  /**
   * Get current date string for filename
   */
  private static getDateString(): string {
    return new Date().toISOString().split('T')[0];
  }
}