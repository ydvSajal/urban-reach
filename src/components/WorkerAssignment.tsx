import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  UserCheck, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  User,
  Briefcase,
  Star
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logError } from '@/lib/error-handling';

interface Worker {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  specialty: string;
  is_available: boolean;
  current_workload: number;
  max_workload: number;
  created_at: string;
  updated_at: string;
  council_id: string;
}

interface WorkerAssignmentProps {
  reportId: string;
  reportCategory: string;
  currentAssignee?: {
    id: string;
    full_name: string;
  } | null;
  onAssign: (workerId: string | null, workerName: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

const WorkerAssignment: React.FC<WorkerAssignmentProps> = ({
  reportId,
  reportCategory,
  currentAssignee,
  onAssign,
  disabled = false,
  className = '',
}) => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [filteredWorkers, setFilteredWorkers] = useState<Worker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(currentAssignee?.id || '');
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [filterBy, setFilterBy] = useState<'all' | 'available' | 'specialty'>('specialty');

  useEffect(() => {
    loadWorkers();
  }, []);

  useEffect(() => {
    filterWorkers();
  }, [workers, filterBy, reportCategory]);

  const loadWorkers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .order('full_name');

      if (error) {
        logError(error, 'loadWorkers', { reportId });
        throw error;
      }

      // Map data to add missing fields with defaults
      const mappedData = (data || []).map(worker => ({
        ...worker,
        current_workload: 0, // Default value since column doesn't exist
        max_workload: 10,   // Default value since column doesn't exist
        phone: worker.phone ?? null,
        specialty: worker.specialty ?? 'General'
      }));

      setWorkers(mappedData);
    } catch (error: unknown) {
      console.error('Error loading workers:', error);
      toast({
        title: "Error loading workers",
        description: (error as Error)?.message || "Failed to load available workers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterWorkers = () => {
    let filtered = workers;

    switch (filterBy) {
      case 'available':
        filtered = workers.filter(worker => worker.is_available);
        break;
      case 'specialty': {
        // Match specialty with report category
        const categorySpecialtyMap: Record<string, string[]> = {
          'roads': ['roads', 'infrastructure', 'maintenance'],
          'water_supply': ['water', 'plumbing', 'utilities'],
          'sanitation': ['sanitation', 'waste', 'cleaning'],
          'electricity': ['electrical', 'power', 'utilities'],
          'public_safety': ['safety', 'security', 'emergency'],
          'parks': ['parks', 'landscaping', 'maintenance'],
          'drainage': ['drainage', 'water', 'infrastructure'],
          'waste_management': ['waste', 'sanitation', 'cleaning'],
          'street_lights': ['electrical', 'lighting', 'maintenance'],
          'other': [], // No specific filtering for 'other'
        };

        const relevantSpecialties = categorySpecialtyMap[reportCategory] || [];
        
        if (relevantSpecialties.length > 0) {
          filtered = workers.filter(worker => 
            worker.is_available && 
            relevantSpecialties.some(specialty => 
              worker.specialty.toLowerCase().includes(specialty.toLowerCase())
            )
          );
        } else {
          filtered = workers.filter(worker => worker.is_available);
        }
        break;
      }
      case 'all':
      default:
        filtered = workers;
        break;
    }

    // Sort by availability and workload
    filtered.sort((a, b) => {
      // Available workers first
      if (a.is_available && !b.is_available) return -1;
      if (!a.is_available && b.is_available) return 1;
      
      // Then by workload (lower is better)
      const aWorkloadRatio = a.current_workload / (a.max_workload || 10);
      const bWorkloadRatio = b.current_workload / (b.max_workload || 10);
      
      return aWorkloadRatio - bWorkloadRatio;
    });

    setFilteredWorkers(filtered);
  };

  const handleAssign = async () => {
    if (!selectedWorkerId) {
      // Unassign
      setAssigning(true);
      try {
        await onAssign(null, 'Unassigned');
        toast({
          title: "Worker unassigned",
          description: "Report has been unassigned from worker",
        });
      } catch (error: unknown) {
        toast({
          title: "Assignment failed",
          description: (error as Error)?.message || "Failed to unassign worker",
          variant: "destructive",
        });
      } finally {
        setAssigning(false);
      }
      return;
    }

    const selectedWorker = workers.find(w => w.id === selectedWorkerId);
    if (!selectedWorker) return;

    setAssigning(true);
    try {
      await onAssign(selectedWorkerId, selectedWorker.full_name);
      
      toast({
        title: "Worker assigned successfully",
        description: `${selectedWorker.full_name} has been assigned to this report`,
      });
    } catch (error: unknown) {
      toast({
        title: "Assignment failed",
        description: (error as Error)?.message || "Failed to assign worker",
        variant: "destructive",
      });
    } finally {
      setAssigning(false);
    }
  };

  const getWorkloadColor = (current: number, max: number) => {
    const ratio = current / max;
    if (ratio >= 0.9) return 'text-red-500';
    if (ratio >= 0.7) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getAvailabilityBadge = (worker: Worker) => {
    if (!worker.is_available) {
      return <Badge variant="destructive">Unavailable</Badge>;
    }
    
    const workloadRatio = worker.current_workload / (worker.max_workload || 10);
    if (workloadRatio >= 0.9) {
      return <Badge variant="destructive">Overloaded</Badge>;
    }
    if (workloadRatio >= 0.7) {
      return <Badge variant="secondary">Busy</Badge>;
    }
    return <Badge variant="default">Available</Badge>;
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Worker Assignment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Worker Assignment
        </CardTitle>
        <CardDescription>
          Assign a qualified worker to handle this {reportCategory.replace('_', ' ')} issue
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Assignment */}
        {currentAssignee && (
          <Alert>
            <UserCheck className="h-4 w-4" />
            <AlertDescription>
              Currently assigned to <strong>{currentAssignee.full_name}</strong>
            </AlertDescription>
          </Alert>
        )}

        {/* Filter Options */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Filter Workers</label>
          <Select value={filterBy} onValueChange={(value: 'all' | 'available' | 'specialty') => setFilterBy(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="specialty">Recommended (by specialty)</SelectItem>
              <SelectItem value="available">Available only</SelectItem>
              <SelectItem value="all">All workers</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Worker Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Worker</label>
          <Select 
            value={selectedWorkerId} 
            onValueChange={setSelectedWorkerId}
            disabled={disabled || assigning}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a worker or leave unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Unassigned</SelectItem>
              {filteredWorkers.map((worker) => (
                <SelectItem key={worker.id} value={worker.id}>
                  <div className="flex items-center gap-2">
                    <span>{worker.full_name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({worker.specialty})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Worker Details */}
        {selectedWorkerId && (
          <div className="space-y-3">
            {(() => {
              const selectedWorker = workers.find(w => w.id === selectedWorkerId);
              if (!selectedWorker) return null;

              return (
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {selectedWorker.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{selectedWorker.full_name}</h4>
                          {getAvailabilityBadge(selectedWorker)}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            <span className="text-muted-foreground">Specialty:</span>
                            <span>{selectedWorker.specialty}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span className="text-muted-foreground">Workload:</span>
                            <span className={getWorkloadColor(selectedWorker.current_workload, selectedWorker.max_workload || 10)}>
                              {selectedWorker.current_workload}/{selectedWorker.max_workload || 10}
                            </span>
                          </div>
                        </div>

                        {selectedWorker.phone && (
                          <div className="text-xs text-muted-foreground">
                            📞 {selectedWorker.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        )}

        {/* Assignment Button */}
        <Button 
          onClick={handleAssign}
          disabled={disabled || assigning || selectedWorkerId === (currentAssignee?.id || '')}
          className="w-full"
        >
          {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {selectedWorkerId 
            ? (selectedWorkerId === (currentAssignee?.id || '') ? 'Already Assigned' : 'Assign Worker')
            : 'Unassign Worker'
          }
        </Button>

        {/* Worker Statistics */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="font-medium text-green-600">
                {workers.filter(w => w.is_available).length}
              </div>
              <div className="text-muted-foreground">Available</div>
            </div>
            <div>
              <div className="font-medium text-yellow-600">
                {workers.filter(w => w.is_available && w.current_workload / (w.max_workload || 10) >= 0.7).length}
              </div>
              <div className="text-muted-foreground">Busy</div>
            </div>
            <div>
              <div className="font-medium text-red-600">
                {workers.filter(w => !w.is_available).length}
              </div>
              <div className="text-muted-foreground">Unavailable</div>
            </div>
          </div>
        </div>

        {/* No Workers Available */}
        {filteredWorkers.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No workers available for this category. Try changing the filter or check back later.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkerAssignment;