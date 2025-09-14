import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin, User, Phone, Mail, Save } from "lucide-react";
import ImageGallery from "@/components/ImageGallery";
import WorkerAssignment from "@/components/WorkerAssignment";
import StatusUpdate from "@/components/StatusUpdate";
import StatusTimeline from "@/components/StatusTimeline";
import { updateStatusWithNotification } from "@/lib/notifications";
import type { ReportStatus } from "@/lib/status-management";
import { useReportSubscription, useStatusHistorySubscription } from "@/hooks/useRealtimeSubscription";

interface Report {
  id: string;
  report_number: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  location_address: string;
  latitude: number;
  longitude: number;
  images: string[];
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  profiles: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  workers: {
    id: string;
    full_name: string | null;
  } | null;
}

interface StatusHistoryEntry {
  id: string;
  old_status: string | null;
  new_status: string;
  notes: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
  } | null;
}

interface Worker {
  id: string;
  full_name: string;
  specialty: string;
  is_available: boolean;
}

const ReportDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  // Form state
  const [newStatus, setNewStatus] = useState("");
  const [newPriority, setNewPriority] = useState("");
  const [assignedWorkerId, setAssignedWorkerId] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    if (id) {
      loadReportDetail();
      loadStatusHistory();
      loadWorkers();
      loadUserRole();
    }
  }, [id]);

  // Set up realtime subscriptions for report updates
  useReportSubscription(
    id,
    (updatedReport) => {
      setReport(prev => prev ? { ...prev, ...updatedReport } : null);
      toast({
        title: "Report Updated",
        description: "This report has been updated in real-time",
      });
    },
    !!id
  );

  // Set up realtime subscriptions for status history updates
  useStatusHistorySubscription(
    id,
    (newStatusEntry) => {
      setStatusHistory(prev => [newStatusEntry, ...prev]);
      toast({
        title: "Status Updated",
        description: `Report status changed to ${newStatusEntry.new_status.replace('_', ' ')}`,
      });
    },
    !!id
  );

  const loadUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        
        setUserRole(profile?.role || "citizen");
      }
    } catch (error) {
      console.error("Error loading user role:", error);
    }
  };

  const loadReportDetail = async () => {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Report not found");

      // Fetch profile separately
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, phone")
        .eq("user_id", data.citizen_id)
        .single();

      // Fetch worker if assigned
      let worker = null;
      if (data.assigned_worker_id) {
        const { data: workerData } = await supabase
          .from("workers")
          .select("id, full_name")
          .eq("id", data.assigned_worker_id)
          .single();
        worker = workerData;
      }

      const reportWithRelations = {
        ...data,
        profiles: profile || { full_name: null, email: null, phone: null },
        workers: worker
      };

      setReport(reportWithRelations);
      setNewStatus(data.status);
      setNewPriority(data.priority);
      setAssignedWorkerId(data.assigned_worker_id || "");
    } catch (error: unknown) {
      console.error("Error loading report:", error);
      toast({
        title: "Error loading report",
        description: (error as Error)?.message || "Failed to load report",
        variant: "destructive",
      });
      navigate("/reports");
    } finally {
      setLoading(false);
    }
  };

  const loadStatusHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("report_status_history")
        .select("*")
        .eq("report_id", id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Status history error:", error);
        setStatusHistory([]);
        return;
      }

      // Fetch profiles for each history entry
      const historyWithProfiles = await Promise.all(
        (data || []).map(async (entry) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", entry.changed_by)
            .single();

          return {
            ...entry,
            profiles: profile || { full_name: null }
          };
        })
      );

      setStatusHistory(historyWithProfiles);
    } catch (error: unknown) {
      console.error("Error loading status history:", error);
    }
  };

  const loadWorkers = async () => {
    try {
      const { data, error } = await supabase
        .from("workers")
        .select("*")
        .eq("is_available", true);

      if (error) throw error;

      setWorkers(data || []);
    } catch (error: unknown) {
      console.error("Error loading workers:", error);
    }
  };

  const handleUpdate = async () => {
    if (!report) return;

    setUpdating(true);
    try {
      const updates: any = {};
      const shouldUpdateStatus = newStatus !== report.status;
      const shouldUpdatePriority = newPriority !== report.priority;
      const shouldUpdateWorker = assignedWorkerId !== (report.workers?.id || "");

      if (shouldUpdateStatus) {
        updates.status = newStatus;
        if (newStatus === 'resolved' || newStatus === 'closed') {
          updates.resolved_at = new Date().toISOString();
        }
      }

      if (shouldUpdatePriority) {
        updates.priority = newPriority;
      }

      if (shouldUpdateWorker) {
        updates.assigned_worker_id = assignedWorkerId || null;
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from("reports")
          .update(updates)
          .eq("id", report.id);

        if (updateError) throw updateError;
      }

      // Add status history entry if status changed
      if (shouldUpdateStatus) {
        const { data: userData } = await supabase.auth.getUser();
        const { error: historyError } = await supabase
          .from("report_status_history")
          .insert([{
            report_id: report.id,
            old_status: report.status as any,
            new_status: newStatus as any,
            notes: statusNotes || null,
            changed_by: userData.user?.id || "",
          }]);

        if (historyError) throw historyError;
      }

      toast({
        title: "Report updated successfully",
        description: "Changes have been saved.",
      });

      // Reload data
      loadReportDetail();
      loadStatusHistory();
      setStatusNotes("");
    } catch (error: unknown) {
      console.error("Error updating report:", error);
      toast({
        title: "Error updating report",
        description: (error as Error)?.message || "Failed to update report",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleWorkerAssignment = async (workerId: string | null, workerName: string) => {
    if (!report) return;

    try {
      const { error } = await supabase
        .from("reports")
        .update({ 
          assigned_worker_id: workerId,
          status: workerId ? 'acknowledged' : report.status // Auto-acknowledge when assigning
        })
        .eq("id", report.id);

      if (error) throw error;

      // Add status history entry for assignment
      const { data: userData } = await supabase.auth.getUser();
      const { error: historyError } = await supabase
        .from("report_status_history")
        .insert([{
          report_id: report.id,
          old_status: report.status as 'pending' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed',
          new_status: workerId ? 'acknowledged' as 'pending' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed' : report.status as 'pending' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed',
          notes: workerId 
            ? `Assigned to ${workerName}` 
            : `Unassigned from ${report.workers?.full_name || 'worker'}`,
          changed_by: userData.user?.id || "",
        }]);

      if (historyError) {
        console.error("Error adding status history:", historyError);
      }

      // Reload data to reflect changes
      await loadReportDetail();
      await loadStatusHistory();
      
    } catch (error: unknown) {
      console.error("Error assigning worker:", error);
      throw error;
    }
  };

  const handleStatusUpdate = async (newStatus: ReportStatus, notes: string) => {
    if (!report) return;

    try {
      await updateStatusWithNotification(report.id, newStatus, notes, userRole);
      
      // Reload data to reflect changes
      await loadReportDetail();
      await loadStatusHistory();
      
    } catch (error: unknown) {
      console.error("Error updating status:", error);
      throw error;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'acknowledged': return 'outline';
      case 'in_progress': return 'default';
      case 'resolved': return 'default';
      case 'closed': return 'secondary';
      default: return 'secondary';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-64"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-muted rounded"></div>
              <div className="h-32 bg-muted rounded"></div>
            </div>
            <div className="space-y-6">
              <div className="h-48 bg-muted rounded"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Report not found</h1>
          <p className="text-muted-foreground mt-2">The requested report could not be found.</p>
          <Button onClick={() => navigate("/reports")} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Reports
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate("/reports")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Reports
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Report #{report.report_number}</h1>
          <p className="text-muted-foreground">{report.title}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Details */}
          <Card>
            <CardHeader>
              <CardTitle>Report Details</CardTitle>
              <CardDescription>Information submitted by the citizen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-sm">{report.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm">Category</h4>
                  <Badge variant="outline" className="mt-1">
                    {report.category.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Current Status</h4>
                  <Badge variant={getStatusBadgeVariant(report.status)} className="mt-1">
                    {report.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </h4>
                <p className="text-sm mt-1">{report.location_address}</p>
                {report.latitude && report.longitude && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Coordinates: {report.latitude}, {report.longitude}
                  </p>
                )}
              </div>

              {report.images && report.images.length > 0 && (
                <div>
                  <ImageGallery
                    images={report.images}
                    title="Report Images"
                    showDownload={true}
                    showShare={true}
                    className="mt-4"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Citizen Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Citizen Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium text-sm">Name</h4>
                  <p className="text-sm">{report.profiles?.full_name || 'Anonymous'}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </h4>
                  <p className="text-sm">{report.profiles?.email || 'Not provided'}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Phone
                  </h4>
                  <p className="text-sm">{report.profiles?.phone || 'Not provided'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          {/* Worker Assignment - Only for Admins */}
          {userRole === 'admin' && (
            <WorkerAssignment
              reportId={report.id}
              reportCategory={report.category}
              currentAssignee={report.workers}
              onAssign={handleWorkerAssignment}
              disabled={updating}
            />
          )}

          {/* Status Update - Only for Admins and Workers */}
          {(userRole === 'admin' || userRole === 'worker') && (
            <StatusUpdate
              reportId={report.id}
              currentStatus={report.status as ReportStatus}
              userRole={userRole as 'admin' | 'worker'}
              onStatusUpdate={handleStatusUpdate}
              disabled={updating}
            />
          )}

          {/* Legacy Update Actions - Keep for priority changes */}
          {userRole === 'admin' && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Settings</CardTitle>
                <CardDescription>Update priority and other settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(newPriority !== report.priority) && (
                <Button 
                  onClick={handleUpdate} 
                  disabled={updating}
                  className="w-full"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updating ? "Updating..." : "Update Priority"}
                </Button>
              )}
            </CardContent>
          </Card>
          )}

          {/* Status Timeline */}
          <StatusTimeline
            reportId={report.id}
            reportCreatedAt={report.created_at}
            reportResolvedAt={report.resolved_at}
            showAllByDefault={false}
            maxVisibleEntries={5}
          />

          {/* Report Info */}
          <Card>
            <CardHeader>
              <CardTitle>Report Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Priority:</span>
                <Badge variant={getPriorityBadgeVariant(report.priority)}>
                  {report.priority}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Assigned to:</span>
                <span>{report.workers?.full_name || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Created:</span>
                <span>{formatDate(report.created_at)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last updated:</span>
                <span>{formatDate(report.updated_at)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReportDetail;