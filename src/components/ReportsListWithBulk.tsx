import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MapPin, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  MoreHorizontal,
  User,
  Calendar,
  Flag,
  Eye,
  MessageSquare,
  ImageIcon
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import BulkOperationsToolbar from './BulkOperationsToolbar';

interface Report {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  category: string;
  location: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
  citizen_id: string;
  assigned_worker_id?: string;
  image_urls?: string[];
  upvotes_count?: number;
  comments_count?: number;
  // Joined fields
  assigned_worker?: {
    id: string;
    full_name: string;
    specialty: string;
  };
  citizen?: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface ReportsListWithBulkProps {
  filters?: {
    status?: string;
    priority?: string;
    category?: string;
    assignedWorker?: string;
    dateRange?: { start: Date; end: Date };
  };
  userRole: 'admin' | 'worker';
  className?: string;
}

const ReportsListWithBulk: React.FC<ReportsListWithBulkProps> = ({
  filters,
  userRole,
  className = ''
}) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load reports
  useEffect(() => {
    loadReports();
  }, [filters]);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('reports')
        .select(`
          *,
          assigned_worker:profiles!assigned_worker_id(
            id,
            full_name,
            specialty
          ),
          citizen:profiles!citizen_id(
            id,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }
      
      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }
      
      if (filters?.assignedWorker && filters.assignedWorker !== 'all') {
        query = query.eq('assigned_worker_id', filters.assignedWorker);
      }
      
      if (filters?.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start.toISOString())
          .lte('created_at', filters.dateRange.end.toISOString());
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      setReports(data || []);
    } catch (error: any) {
      console.error('Failed to load reports:', error);
      setError(error.message || 'Failed to load reports');
      toast({
        title: 'Error loading reports',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectReport = (reportId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedReports(prev => [...prev, reportId]);
    } else {
      setSelectedReports(prev => prev.filter(id => id !== reportId));
    }
  };

  const handleSelectionChange = (reportIds: string[]) => {
    setSelectedReports(reportIds);
  };

  const handleOperationComplete = () => {
    // Reload reports after bulk operation
    loadReports();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'acknowledged': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <Flag className="h-3 w-3" />;
      case 'medium': return <Flag className="h-3 w-3" />;
      case 'low': return <Flag className="h-3 w-3" />;
      default: return <Flag className="h-3 w-3" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'acknowledged': return <Eye className="h-4 w-4" />;
      case 'in_progress': return <AlertTriangle className="h-4 w-4" />;
      case 'resolved': case 'closed': return <CheckCircle2 className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Reports</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={loadReports}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  if (reports.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Reports Found</h3>
          <p className="text-muted-foreground">
            No reports match your current filters. Try adjusting your search criteria.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Bulk Operations Toolbar */}
      <BulkOperationsToolbar
        selectedReports={selectedReports}
        allReports={reports}
        onSelectionChange={handleSelectionChange}
        onOperationComplete={handleOperationComplete}
        userRole={userRole}
      />

      {/* Reports List */}
      <div className="space-y-4">
        {reports.map((report) => (
          <Card 
            key={report.id} 
            className={`transition-all duration-200 hover:shadow-md ${
              selectedReports.includes(report.id) ? 'ring-2 ring-primary ring-offset-2' : ''
            }`}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {/* Selection Checkbox */}
                <div className="flex items-center pt-1">
                  <Checkbox
                    checked={selectedReports.includes(report.id)}
                    onCheckedChange={(checked) => 
                      handleSelectReport(report.id, checked as boolean)
                    }
                  />
                </div>

                {/* Report Content */}
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {report.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {report.description}
                      </p>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Edit Report</DropdownMenuItem>
                        {userRole === 'admin' && (
                          <DropdownMenuItem className="text-red-600">
                            Delete Report
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Status and Priority */}
                  <div className="flex items-center gap-3 mb-3">
                    <Badge 
                      variant="outline" 
                      className={`${getStatusColor(report.status)} flex items-center gap-1`}
                    >
                      {getStatusIcon(report.status)}
                      {report.status.charAt(0).toUpperCase() + report.status.slice(1).replace('_', ' ')}
                    </Badge>
                    
                    <div className={`flex items-center gap-1 ${getPriorityColor(report.priority)}`}>
                      {getPriorityIcon(report.priority)}
                      <span className="text-xs font-medium">
                        {report.priority.charAt(0).toUpperCase() + report.priority.slice(1)}
                      </span>
                    </div>

                    <Badge variant="secondary">{report.category}</Badge>
                  </div>

                  {/* Meta Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
                    {/* Location */}
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{report.location}</span>
                    </div>

                    {/* Reporter */}
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">
                        {report.citizen?.full_name || 'Unknown Citizen'}
                      </span>
                    </div>

                    {/* Assigned Worker */}
                    {report.assigned_worker && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          Assigned to {report.assigned_worker.full_name}
                        </span>
                      </div>
                    )}

                    {/* Created Date */}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span>
                        {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  {/* Engagement Stats */}
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    {report.upvotes_count !== undefined && report.upvotes_count > 0 && (
                      <div className="flex items-center gap-1">
                        <span>{report.upvotes_count} upvote{report.upvotes_count === 1 ? '' : 's'}</span>
                      </div>
                    )}
                    
                    {report.comments_count !== undefined && report.comments_count > 0 && (
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        <span>{report.comments_count} comment{report.comments_count === 1 ? '' : 's'}</span>
                      </div>
                    )}

                    {report.image_urls && report.image_urls.length > 0 && (
                      <div className="flex items-center gap-1">
                        <ImageIcon className="h-4 w-4" />
                        <span>{report.image_urls.length} image{report.image_urls.length === 1 ? '' : 's'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load More / Pagination could be added here */}
    </div>
  );
};

export default ReportsListWithBulk;