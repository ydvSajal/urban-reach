import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Save, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  PlayCircle, 
  XCircle,
  Loader2,
  MessageSquare
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type ReportStatus = 'pending' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';

interface StatusUpdateProps {
  reportId: string;
  currentStatus: ReportStatus;
  userRole: 'admin' | 'worker';
  onStatusUpdate: (status: ReportStatus, notes: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

interface StatusOption {
  value: ReportStatus;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  requiresNotes?: boolean;
  allowedFrom?: ReportStatus[];
}

const statusOptions: StatusOption[] = [
  {
    value: 'pending',
    label: 'Pending',
    description: 'Awaiting review and assignment',
    icon: Clock,
    color: 'text-yellow-600',
    allowedFrom: ['acknowledged', 'in_progress'],
  },
  {
    value: 'acknowledged',
    label: 'Acknowledged',
    description: 'Report has been reviewed and acknowledged',
    icon: CheckCircle,
    color: 'text-blue-600',
    allowedFrom: ['pending'],
  },
  {
    value: 'in_progress',
    label: 'In Progress',
    description: 'Work is currently being performed',
    icon: PlayCircle,
    color: 'text-orange-600',
    allowedFrom: ['acknowledged', 'pending'],
  },
  {
    value: 'resolved',
    label: 'Resolved',
    description: 'Issue has been fixed and completed',
    icon: CheckCircle,
    color: 'text-green-600',
    requiresNotes: true,
    allowedFrom: ['in_progress', 'acknowledged'],
  },
  {
    value: 'closed',
    label: 'Closed',
    description: 'Report is closed and archived',
    icon: XCircle,
    color: 'text-gray-600',
    requiresNotes: true,
    allowedFrom: ['resolved'],
  },
];

const StatusUpdate: React.FC<StatusUpdateProps> = ({
  reportId,
  currentStatus,
  userRole,
  onStatusUpdate,
  disabled = false,
  className = '',
}) => {
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus>(currentStatus);
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  // Get available status options based on current status and user role
  const getAvailableStatuses = (): StatusOption[] => {
    return statusOptions.filter(option => {
      // Admin can change to any status (with some restrictions)
      if (userRole === 'admin') {
        // Don't allow going backwards unnecessarily
        if (option.allowedFrom && !option.allowedFrom.includes(currentStatus)) {
          return false;
        }
        return true;
      }
      
      // Worker restrictions
      if (userRole === 'worker') {
        // Workers can only progress through the workflow
        switch (currentStatus) {
          case 'pending':
            return false; // Workers shouldn't see pending reports
          case 'acknowledged':
            return ['acknowledged', 'in_progress'].includes(option.value);
          case 'in_progress':
            return ['in_progress', 'resolved'].includes(option.value);
          case 'resolved':
            return ['resolved'].includes(option.value); // Can't change resolved
          case 'closed':
            return false; // Can't change closed
          default:
            return false;
        }
      }
      
      return false;
    });
  };

  const availableStatuses = getAvailableStatuses();
  const selectedStatusOption = statusOptions.find(s => s.value === selectedStatus);
  const currentStatusOption = statusOptions.find(s => s.value === currentStatus);
  const isStatusChanged = selectedStatus !== currentStatus;
  const requiresNotes = selectedStatusOption?.requiresNotes || false;
  const canUpdate = isStatusChanged && (!requiresNotes || notes.trim().length > 0);

  const handleUpdate = async () => {
    if (!canUpdate || updating) return;

    setUpdating(true);
    try {
      await onStatusUpdate(selectedStatus, notes.trim());
      
      toast({
        title: "Status updated successfully",
        description: `Report status changed to ${selectedStatusOption?.label}`,
      });
      
      // Reset form
      setNotes('');
    } catch (error: unknown) {
      console.error('Status update error:', error);
      toast({
        title: "Failed to update status",
        description: (error as Error)?.message || "An error occurred while updating the status",
        variant: "destructive",
      });
      
      // Reset to current status on error
      setSelectedStatus(currentStatus);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadgeColor = (status: ReportStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'acknowledged': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusTransitionMessage = () => {
    if (!isStatusChanged) return null;
    
    const from = currentStatusOption?.label;
    const to = selectedStatusOption?.label;
    
    return `Changing status from "${from}" to "${to}"`;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Update Status
        </CardTitle>
        <CardDescription>
          Change the report status and add progress notes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status Display */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Current Status:</span>
            {currentStatusOption && (
              <>
                <currentStatusOption.icon className={`h-4 w-4 ${currentStatusOption.color}`} />
                <Badge className={getStatusBadgeColor(currentStatus)}>
                  {currentStatusOption.label}
                </Badge>
              </>
            )}
          </div>
        </div>

        {/* Status Selection */}
        <div className="space-y-2">
          <Label htmlFor="status">New Status</Label>
          <Select 
            value={selectedStatus} 
            onValueChange={(value: ReportStatus) => setSelectedStatus(value)}
            disabled={disabled || updating}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableStatuses.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  <div className="flex items-center gap-2">
                    <status.icon className={`h-4 w-4 ${status.color}`} />
                    <div>
                      <div className="font-medium">{status.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {status.description}
                      </div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Change Preview */}
        {isStatusChanged && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {getStatusTransitionMessage()}
            </AlertDescription>
          </Alert>
        )}

        {/* Notes Section */}
        <div className="space-y-2">
          <Label htmlFor="notes" className="flex items-center gap-2">
            Notes
            {requiresNotes && (
              <Badge variant="destructive" className="text-xs">
                Required
              </Badge>
            )}
          </Label>
          <Textarea
            id="notes"
            placeholder={
              requiresNotes 
                ? "Please provide details about the status change..."
                : "Optional notes about this status change..."
            }
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={disabled || updating}
            rows={3}
            className={requiresNotes && notes.trim().length === 0 ? 'border-destructive' : ''}
          />
          {requiresNotes && notes.trim().length === 0 && (
            <p className="text-sm text-destructive">
              Notes are required when changing to "{selectedStatusOption?.label}"
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleUpdate}
            disabled={!canUpdate || disabled || updating}
            className="flex-1"
          >
            {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Update Status
          </Button>
          
          {isStatusChanged && (
            <Button
              variant="outline"
              onClick={() => {
                setSelectedStatus(currentStatus);
                setNotes('');
              }}
              disabled={disabled || updating}
            >
              Cancel
            </Button>
          )}
        </div>

        {/* Status Workflow Guide */}
        {userRole === 'worker' && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Status Workflow:</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-blue-600" />
                <span>Acknowledged → Ready to start work</span>
              </div>
              <div className="flex items-center gap-2">
                <PlayCircle className="h-3 w-3 text-orange-600" />
                <span>In Progress → Currently working on issue</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>Resolved → Work completed successfully</span>
              </div>
            </div>
          </div>
        )}

        {/* No Available Actions */}
        {availableStatuses.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No status changes available for your role at this time.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default StatusUpdate;