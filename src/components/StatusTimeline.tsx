import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  History, 
  Clock, 
  User, 
  MessageSquare, 
  CheckCircle, 
  PlayCircle, 
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Calendar
} from 'lucide-react';
import { getStatusHistory, type ReportStatus } from '@/lib/status-management';
import { formatDistanceToNow, format } from 'date-fns';

interface StatusHistoryEntry {
  id: string;
  report_id: string;
  old_status: ReportStatus | null;
  new_status: ReportStatus;
  notes: string | null;
  changed_by: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
  } | null;
}

interface StatusTimelineProps {
  reportId: string;
  reportCreatedAt: string;
  reportResolvedAt?: string | null;
  className?: string;
  showAllByDefault?: boolean;
  maxVisibleEntries?: number;
}

const StatusTimeline: React.FC<StatusTimelineProps> = ({
  reportId,
  reportCreatedAt,
  reportResolvedAt,
  className = '',
  showAllByDefault = false,
  maxVisibleEntries = 5,
}) => {
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(showAllByDefault);

  useEffect(() => {
    loadStatusHistory();
  }, [reportId]);

  const loadStatusHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const historyData = await getStatusHistory(reportId);
      setHistory(historyData);
    } catch (err: any) {
      console.error('Error loading status history:', err);
      setError(err.message || 'Failed to load status history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: ReportStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'acknowledged':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'in_progress':
        return <PlayCircle className="h-4 w-4 text-orange-600" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'closed':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'acknowledged':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: ReportStatus) => {
    const labels: Record<ReportStatus, string> = {
      pending: 'Pending',
      acknowledged: 'Acknowledged',
      in_progress: 'In Progress',
      resolved: 'Resolved',
      closed: 'Closed',
    };
    return labels[status] || status;
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  const formatFullDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPP p');
    } catch {
      return 'Invalid date';
    }
  };

  // Create timeline entries including creation and resolution
  const createTimelineEntries = () => {
    const entries = [];

    // Add creation entry
    entries.push({
      id: 'creation',
      type: 'creation' as const,
      timestamp: reportCreatedAt,
      title: 'Report Created',
      description: 'Report was submitted by citizen',
      icon: <CheckCircle className="h-4 w-4 text-blue-600" />,
      color: 'bg-blue-100 border-blue-200',
    });

    // Add status history entries
    history.forEach((entry) => {
      entries.push({
        id: entry.id,
        type: 'status_change' as const,
        timestamp: entry.created_at,
        title: `Status changed to ${getStatusLabel(entry.new_status)}`,
        description: entry.profiles?.full_name || 'System',
        notes: entry.notes,
        oldStatus: entry.old_status,
        newStatus: entry.new_status,
        icon: getStatusIcon(entry.new_status),
        color: getStatusColor(entry.new_status),
      });
    });

    // Add resolution entry if resolved
    if (reportResolvedAt) {
      entries.push({
        id: 'resolution',
        type: 'resolution' as const,
        timestamp: reportResolvedAt,
        title: 'Report Resolved',
        description: 'Issue has been successfully resolved',
        icon: <CheckCircle className="h-4 w-4 text-green-600" />,
        color: 'bg-green-100 border-green-200',
      });
    }

    // Sort by timestamp (newest first)
    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const timelineEntries = createTimelineEntries();
  const visibleEntries = showAll ? timelineEntries : timelineEntries.slice(0, maxVisibleEntries);
  const hasMoreEntries = timelineEntries.length > maxVisibleEntries;

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="w-8 h-8 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load timeline: {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Timeline
        </CardTitle>
        <CardDescription>
          Track the progress and history of this report
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {visibleEntries.map((entry, index) => (
            <div key={entry.id} className="flex items-start gap-3">
              {/* Timeline connector */}
              <div className="relative flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${entry.color}`}>
                  {entry.icon}
                </div>
                {index < visibleEntries.length - 1 && (
                  <div className="w-0.5 h-6 bg-border mt-2"></div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-sm">{entry.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span title={formatFullDate(entry.timestamp)}>
                      {formatTimeAgo(entry.timestamp)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <User className="h-3 w-3" />
                  <span>{entry.description}</span>
                </div>

                {/* Status change details */}
                {entry.type === 'status_change' && entry.oldStatus && (
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getStatusColor(entry.oldStatus)}>
                      {getStatusLabel(entry.oldStatus)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">→</span>
                    <Badge className={getStatusColor(entry.newStatus)}>
                      {getStatusLabel(entry.newStatus)}
                    </Badge>
                  </div>
                )}

                {/* Notes */}
                {entry.notes && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 mt-0.5 text-amber-600" />
                      <div>
                        <h5 className="text-sm font-medium text-amber-800 mb-1">Staff Note:</h5>
                        <p className="text-sm text-amber-900">{entry.notes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Show more/less button */}
          {hasMoreEntries && (
            <div className="flex justify-center pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAll(!showAll)}
                className="flex items-center gap-2"
              >
                {showAll ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Show All ({timelineEntries.length - maxVisibleEntries} more)
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Empty state */}
          {timelineEntries.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No timeline entries available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatusTimeline;