import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  CheckSquare,
  Square,
  Users,
  ArrowUpDown,
  FileCheck,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle,
  X,
  User
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  BulkOperationsService,
  type BulkOperationResult,
  type ReportStatus,
  type PriorityLevel
} from '@/lib/bulkOperations';

interface BulkOperationsToolbarProps {
  selectedReports: string[];
  allReports: any[];
  onSelectionChange: (reportIds: string[]) => void;
  onOperationComplete: () => void;
  userRole: 'admin' | 'worker';
  className?: string;
}

interface BulkOperationProgress {
  operation: string;
  progress: number;
  total: number;
  processed: number;
  failed: number;
  isRunning: boolean;
  errors: Array<{ reportId: string; error: string }>;
}

const BulkOperationsToolbar: React.FC<BulkOperationsToolbarProps> = ({
  selectedReports,
  allReports,
  onSelectionChange,
  onOperationComplete,
  userRole,
  className = ''
}) => {
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [availableWorkers, setAvailableWorkers] = useState<Array<{
    id: string;
    full_name: string;
    specialty: string;
    current_workload: number;
    max_workload: number;
    performance_rating: number;
  }>>([]);
  const [operationProgress, setOperationProgress] = useState<BulkOperationProgress | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userId, setUserId] = useState<string>('');

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  // Update selection state
  useEffect(() => {
    const totalReports = allReports.length;
    setIsAllSelected(selectedReports.length === totalReports && totalReports > 0);
  }, [selectedReports, allReports]);

  // Load available workers
  useEffect(() => {
    if (userRole === 'admin') {
      loadWorkers();
    }
  }, [userRole]);

  const loadWorkers = async () => {
    try {
      const workers = await BulkOperationsService.getAvailableWorkers();
      setAvailableWorkers(workers);
    } catch (error) {
      console.error('Failed to load workers:', error);
    }
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(allReports.map(report => report.id));
    }
  };

  const handleClearSelection = () => {
    onSelectionChange([]);
  };

  const showOperationProgress = (operation: string, total: number) => {
    setOperationProgress({
      operation,
      progress: 0,
      total,
      processed: 0,
      failed: 0,
      isRunning: true,
      errors: []
    });
  };

  const updateOperationProgress = (result: BulkOperationResult) => {
    setOperationProgress(prev => {
      if (!prev) return null;
      return {
        ...prev,
        processed: result.processedCount,
        failed: result.failedCount,
        progress: Math.round(((result.processedCount + result.failedCount) / prev.total) * 100),
        isRunning: false,
        errors: result.errors
      };
    });

    // Show completion toast
    setTimeout(() => {
      if (result.success && result.processedCount > 0) {
        toast({
          title: `Bulk operation completed`,
          description: `Successfully processed ${result.processedCount} report${result.processedCount === 1 ? '' : 's'}${result.failedCount > 0 ? ` (${result.failedCount} failed)` : ''}`,
        });
      } else if (!result.success || result.processedCount === 0) {
        toast({
          title: `Bulk operation failed`,
          description: result.errors[0]?.error || 'Operation failed to process any reports',
          variant: 'destructive',
        });
      }

      setOperationProgress(null);
      onOperationComplete();
    }, 2000);
  };

  const handleBulkStatusUpdate = async (newStatus: ReportStatus, notes: string = '') => {
    if (selectedReports.length === 0) return;

    showOperationProgress('Status Update', selectedReports.length);
    
    try {
      const result = await BulkOperationsService.updateStatus(
        selectedReports,
        { newStatus, notes },
        userId
      );
      updateOperationProgress(result);
      handleClearSelection();
      setStatusDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Operation failed',
        description: error.message || 'Failed to update report statuses',
        variant: 'destructive',
      });
      setOperationProgress(null);
    }
  };

  const handleBulkAssignment = async (workerId: string) => {
    if (selectedReports.length === 0) return;

    const worker = availableWorkers.find(w => w.id === workerId);
    showOperationProgress('Worker Assignment', selectedReports.length);

    try {
      const result = await BulkOperationsService.assignWorker(
        selectedReports,
        { workerId, workerName: worker?.full_name },
        userId
      );
      updateOperationProgress(result);
      handleClearSelection();
      setAssignmentDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Assignment failed',
        description: error.message || 'Failed to assign worker to reports',
        variant: 'destructive',
      });
      setOperationProgress(null);
    }
  };

  const handleBulkPriorityUpdate = async (priority: PriorityLevel) => {
    if (selectedReports.length === 0) return;

    showOperationProgress('Priority Update', selectedReports.length);

    try {
      const result = await BulkOperationsService.updatePriority(
        selectedReports,
        { priority },
        userId
      );
      updateOperationProgress(result);
      handleClearSelection();
      setPriorityDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Priority update failed',
        description: error.message || 'Failed to update report priorities',
        variant: 'destructive',
      });
      setOperationProgress(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedReports.length === 0 || userRole !== 'admin') return;

    showOperationProgress('Delete Reports', selectedReports.length);

    try {
      const result = await BulkOperationsService.deleteReports(selectedReports, userId);
      updateOperationProgress(result);
      handleClearSelection();
      setDeleteDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Delete operation failed',
        description: error.message || 'Failed to delete reports',
        variant: 'destructive',
      });
      setOperationProgress(null);
    }
  };

  if (selectedReports.length === 0) {
    return null;
  }

  return (
    <>
      <Card className={`sticky top-4 z-10 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            {/* Selection Info */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="flex items-center gap-2"
              >
                {isAllSelected ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                {isAllSelected ? 'Deselect All' : 'Select All'}
              </Button>
              <Badge variant="secondary" className="font-medium">
                {selectedReports.length} selected
              </Badge>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Status Update */}
              <StatusUpdateDialog
                open={statusDialogOpen}
                onOpenChange={setStatusDialogOpen}
                onConfirm={handleBulkStatusUpdate}
                selectedCount={selectedReports.length}
              />

              {/* Worker Assignment (Admin only) */}
              {userRole === 'admin' && (
                <WorkerAssignmentDialog
                  open={assignmentDialogOpen}
                  onOpenChange={setAssignmentDialogOpen}
                  onConfirm={handleBulkAssignment}
                  workers={availableWorkers}
                  selectedCount={selectedReports.length}
                />
              )}

              {/* Priority Update */}
              <PriorityUpdateDialog
                open={priorityDialogOpen}
                onOpenChange={setPriorityDialogOpen}
                onConfirm={handleBulkPriorityUpdate}
                selectedCount={selectedReports.length}
              />

              {/* Delete (Admin only) */}
              {userRole === 'admin' && (
                <DeleteConfirmationDialog
                  open={deleteDialogOpen}
                  onOpenChange={setDeleteDialogOpen}
                  onConfirm={handleBulkDelete}
                  selectedCount={selectedReports.length}
                />
              )}

              {/* Clear Selection */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSelection}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Indicator */}
      {operationProgress && (
        <Card className="fixed bottom-4 right-4 w-96 z-50">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {operationProgress.isRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : operationProgress.failed === 0 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                  <span className="font-medium">{operationProgress.operation}</span>
                </div>
                {!operationProgress.isRunning && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOperationProgress(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <Progress value={operationProgress.progress} className="h-2" />
              
              <div className="text-sm text-muted-foreground">
                {operationProgress.processed} processed, {operationProgress.failed} failed
                {operationProgress.isRunning && (
                  <span> • {operationProgress.total - operationProgress.processed - operationProgress.failed} remaining</span>
                )}
              </div>

              {operationProgress.errors.length > 0 && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {operationProgress.errors.length} error{operationProgress.errors.length === 1 ? '' : 's'} occurred. 
                    Check console for details.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

// Status Update Dialog Component
const StatusUpdateDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (status: ReportStatus, notes: string) => void;
  selectedCount: number;
}> = ({ open, onOpenChange, onConfirm, selectedCount }) => {
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | ''>('');
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    if (selectedStatus) {
      onConfirm(selectedStatus, notes);
      setSelectedStatus('');
      setNotes('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileCheck className="h-4 w-4 mr-1" />
          Status
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Status</DialogTitle>
          <DialogDescription>
            Update status for {selectedCount} selected report{selectedCount === 1 ? '' : 's'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="status">New Status</Label>
            <Select value={selectedStatus} onValueChange={(value: ReportStatus) => setSelectedStatus(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about the status change..."
              className="min-h-[80px]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedStatus}>
            Update Status
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Worker Assignment Dialog Component
const WorkerAssignmentDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (workerId: string) => void;
  workers: Array<{ id: string; full_name: string; specialty: string; current_workload: number; max_workload: number; performance_rating: number }>;
  selectedCount: number;
}> = ({ open, onOpenChange, onConfirm, workers, selectedCount }) => {
  const [selectedWorkerId, setSelectedWorkerId] = useState('');

  const handleConfirm = () => {
    if (selectedWorkerId) {
      onConfirm(selectedWorkerId);
      setSelectedWorkerId('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="h-4 w-4 mr-1" />
          Assign
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Worker</DialogTitle>
          <DialogDescription>
            Assign worker to {selectedCount} selected report{selectedCount === 1 ? '' : 's'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Available Workers</Label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {workers.map((worker) => (
                <div
                  key={worker.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedWorkerId === worker.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedWorkerId(worker.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{worker.full_name}</div>
                      <div className="text-sm text-muted-foreground">{worker.specialty}</div>
                    </div>
                    <div className="text-sm">
                      <div>Workload: {worker.current_workload}/{worker.max_workload}</div>
                      <div>Rating: {worker.performance_rating.toFixed(1)}/5.0</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedWorkerId}>
            Assign Worker
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Priority Update Dialog Component
const PriorityUpdateDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (priority: PriorityLevel) => void;
  selectedCount: number;
}> = ({ open, onOpenChange, onConfirm, selectedCount }) => {
  const [selectedPriority, setSelectedPriority] = useState<PriorityLevel | ''>('');

  const handleConfirm = () => {
    if (selectedPriority) {
      onConfirm(selectedPriority);
      setSelectedPriority('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ArrowUpDown className="h-4 w-4 mr-1" />
          Priority
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Priority</DialogTitle>
          <DialogDescription>
            Update priority for {selectedCount} selected report{selectedCount === 1 ? '' : 's'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>New Priority</Label>
            <Select value={selectedPriority} onValueChange={(value: PriorityLevel) => setSelectedPriority(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedPriority}>
            Update Priority
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Delete Confirmation Dialog Component
const DeleteConfirmationDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  selectedCount: number;
}> = ({ open, onOpenChange, onConfirm, selectedCount }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Reports</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {selectedCount} selected report{selectedCount === 1 ? '' : 's'}? 
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Deleting reports will permanently remove them from the system. 
            Citizens will be notified of the deletion.
          </AlertDescription>
        </Alert>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete Reports
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkOperationsToolbar;