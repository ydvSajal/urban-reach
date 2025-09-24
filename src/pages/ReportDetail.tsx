import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin, User, Phone, Mail, Save, MessageSquare, Mic } from "lucide-react";
import ImageGallery from "@/components/ImageGallery";
import AudioPlayer from "@/components/AudioPlayer";
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
  audio_message: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  assigned_worker_id: string | null;
  profiles: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  workers: {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    specialty: string | null;
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
        console.log("Attempting to fetch worker with ID:", data.assigned_worker_id);
        const { data: workerData, error: workerError } = await supabase
          .from("workers")
          .select("id, full_name, email, phone, specialty")
          .eq("id", data.assigned_worker_id)
          .single();
        
        if (workerError) {
          console.error("Worker fetch error:", workerError);
          console.error("Error details:", {
            message: workerError.message,
            code: workerError.code,
            details: workerError.details,
            hint: workerError.hint
          });
          
          // Try alternative fetch method for citizens
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("role")
              .eq("user_id", user.id)
              .single();
            
            if (profile?.role === 'citizen') {
              console.log("Attempting alternative worker fetch for citizen...");
              // Try fetching through the reports join
              const { data: reportWithWorker, error: joinError } = await supabase
                .from("reports")
                .select(`
                  *,
                  workers:assigned_worker_id (
                    id,
                    full_name,
                    email,
                    phone,
                    specialty
                  )
                `)
                .eq("id", data.id)
                .eq("citizen_id", user.id)
                .single();
              
              if (joinError) {
                console.error("Alternative worker fetch failed:", joinError);
              } else {
                worker = reportWithWorker?.workers || null;
                console.log("Alternative worker fetch result:", worker);
              }
            }
          }
        } else {
          worker = workerData;
          console.log("Worker fetch successful:", worker);
        }
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
      const updateData: any = {
        assigned_worker_id: workerId
      };
      
      if (workerId) {
        updateData.status = 'acknowledged';
      }

      const { error } = await supabase
        .from("reports")
        .update(updateData)
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
      const { data: authUser } = await supabase.auth.getUser();
      const changerId = authUser?.user?.id || '';
      await updateStatusWithNotification(report.id, newStatus, changerId, notes);
      
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
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate(userRole === 'citizen' ? '/my-reports' : '/reports')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {userRole === 'citizen' ? 'My Reports' : 'Reports'}
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

              {report.audio_message && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Audio Message</h4>
                  <AudioPlayer
                    audioUrl={report.audio_message}
                    title="Citizen Audio Message"
                    className="mt-2"
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

          {/* Assigned Worker Information - For Citizens */}
          {userRole === 'citizen' && report.workers && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Assigned Worker
                </CardTitle>
                <CardDescription>
                  Your dedicated municipal worker handling this report
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm">Name</h4>
                      <p className="text-sm font-semibold">{report.workers.full_name || 'Not assigned'}</p>
                    </div>
                    {report.workers.specialty && (
                      <div>
                        <h4 className="font-medium text-sm">Specialty</h4>
                        <p className="text-sm capitalize">{report.workers.specialty.replace('_', ' ')}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Contact Information */}
                  <div className="pt-2 border-t">
                    <h4 className="font-medium text-sm mb-3">Contact Information</h4>
                    <div className="space-y-2">
                      {report.workers.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a 
                            href={`mailto:${report.workers.email}`}
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {report.workers.email}
                          </a>
                        </div>
                      )}
                      {report.workers.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a 
                            href={`tel:${report.workers.phone}`}
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {report.workers.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Worker Status Indicator */}
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm mb-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-muted-foreground">Worker assigned and active</span>
                    </div>
                    
                    {/* Communication Tip for Citizens */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-blue-900 mb-1">Need to communicate?</p>
                          <p className="text-blue-700">
                            Feel free to contact your assigned worker directly using the contact information above. 
                            They can provide updates and answer questions about your report.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Worker Assigned - For Citizens */}
          {userRole === 'citizen' && (!report.assigned_worker_id || !report.workers) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Assignment Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span>Awaiting worker assignment</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your report is in queue and will be assigned to a worker soon.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
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

          {/* Status Timeline - Enhanced for Citizens */}
          <StatusTimeline
            reportId={report.id}
            reportCreatedAt={report.created_at}
            reportResolvedAt={report.resolved_at}
            showAllByDefault={userRole === 'citizen'} // Show all entries for citizens
            maxVisibleEntries={userRole === 'citizen' ? 10 : 5} // More entries for citizens
            highlightComments={userRole === 'citizen'} // Highlight staff comments for citizens
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
              
              {/* Show assignment info only for admin/worker, citizens see it in dedicated section */}
              {userRole !== 'citizen' && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Assigned to:</span>
                  <span>{report.workers?.full_name || 'Unassigned'}</span>
                </div>
              )}
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Created:</span>
                <span>{formatDate(report.created_at)}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last updated:</span>
                <span>{formatDate(report.updated_at)}</span>
              </div>
              
              {/* Additional info for citizens */}
              {userRole === 'citizen' && report.resolved_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Resolved:</span>
                  <span>{formatDate(report.resolved_at)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReportDetail;