import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  MapPin,
  Calendar,
  Filter,
  Search,
  Eye,
  TrendingUp,
  FileText,
  Loader2
} from "lucide-react";

interface AssignedReport {
  id: string;
  report_number: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  location_address: string;
  created_at: string;
  updated_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
}

import { Tables } from "@/integrations/supabase/types";
import { useWorkerSubscription, useRealtimeConnectionStatus } from "@/hooks/useRealtimeSubscription";

type WorkerProfile = Tables<"workers">;

const WorkerDashboard = () => {
  const [reports, setReports] = useState<AssignedReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<AssignedReport[]>([]);
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Filters and sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
  });

  useEffect(() => {
    loadWorkerData();
  }, []);

  // Set up realtime subscription for worker assignments
  useWorkerSubscription(
    workerProfile?.id,
    (updatedReport) => {
      // Reload data when a new report is assigned or updated
      loadWorkerData();
      toast({
        title: "Assignment Update",
        description: `Report #${updatedReport.report_number} has been updated`,
      });
    },
    !!workerProfile?.id
  );

  // Get realtime connection status
  const { isOnline } = useRealtimeConnectionStatus();

  useEffect(() => {
    filterAndSortReports();
  }, [reports, searchTerm, statusFilter, priorityFilter, sortBy, sortOrder]);

  const loadWorkerData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      // Load worker profile
      const { data: worker, error: workerError } = await supabase
        .from("workers")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (workerError) {
        console.error("Worker profile error:", workerError);
        throw new Error("Worker profile not found");
      }

      setWorkerProfile(worker);

      // Load assigned reports
      const { data: reportsData, error: reportsError } = await supabase
        .from("reports")
        .select("*")
        .eq("assigned_worker_id", worker.id)
        .order("created_at", { ascending: false });

      if (reportsError) throw reportsError;

      // Fetch citizen profiles for each report
      const reportsWithProfiles = await Promise.all(
        (reportsData || []).map(async (report) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", report.citizen_id)
            .single();

          return {
            ...report,
            profiles: profile || { full_name: null, email: null }
          };
        })
      );

      setReports(reportsWithProfiles);

      // Calculate stats
      const total = reportsWithProfiles.length;
      const pending = reportsWithProfiles.filter(r => r.status === 'acknowledged').length;
      const inProgress = reportsWithProfiles.filter(r => r.status === 'in_progress').length;
      const resolved = reportsWithProfiles.filter(r => r.status === 'resolved' || r.status === 'closed').length;

      setStats({ total, pending, inProgress, resolved });

    } catch (error: any) {
      console.error("Error loading worker data:", error);
      toast({
        title: "Error loading dashboard",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortReports = () => {
    let filtered = reports;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (report) =>
          report.report_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          report.location_address.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((report) => report.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter((report) => report.priority === priorityFilter);
    }

    // Sort reports
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "created_at":
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case "updated_at":
          aValue = new Date(a.updated_at);
          bValue = new Date(b.updated_at);
          break;
        case "priority": {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          break;
        }
        case "status": {
          const statusOrder = { acknowledged: 1, in_progress: 2, resolved: 3, closed: 4 };
          aValue = statusOrder[a.status as keyof typeof statusOrder] || 0;
          bValue = statusOrder[b.status as keyof typeof statusOrder] || 0;
          break;
        }
        case "report_number":
          aValue = a.report_number;
          bValue = b.report_number;
          break;
        default:
          aValue = a.created_at;
          bValue = b.created_at;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredReports(filtered);
  };

  const updateAvailability = async (isAvailable: boolean) => {
    if (!workerProfile) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from("workers")
        .update({ is_available: isAvailable })
        .eq("id", workerProfile.id);

      if (error) throw error;

      setWorkerProfile({ ...workerProfile, is_available: isAvailable });

      toast({
        title: "Availability updated",
        description: `You are now ${isAvailable ? 'available' : 'unavailable'} for new assignments`,
      });
    } catch (error: any) {
      console.error("Error updating availability:", error);
      toast({
        title: "Error updating availability",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const quickStatusUpdate = async (reportId: string, newStatus: 'acknowledged' | 'in_progress' | 'resolved' | 'closed') => {
    try {
      const { error } = await supabase
        .from("reports")
        .update({ status: newStatus })
        .eq("id", reportId);

      if (error) throw error;

      // Add status history
      const { data: { user } } = await supabase.auth.getUser();
      const currentReport = reports.find(r => r.id === reportId);
      const { error: historyError } = await supabase
        .from("report_status_history")
        .insert({
          report_id: reportId,
          old_status: (currentReport?.status || 'pending') as 'pending' | 'resolved' | 'acknowledged' | 'in_progress' | 'closed',
          new_status: newStatus,
          notes: `Quick update by worker`,
          changed_by: user?.id || "",
        });

      if (historyError) {
        console.error("Error adding status history:", historyError);
      }

      toast({
        title: "Status updated",
        description: `Report status changed to ${newStatus.replace('_', ' ')}`,
      });

      // Reload data
      loadWorkerData();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'acknowledged': return 'secondary';
      case 'in_progress': return 'default';
      case 'resolved': return 'default';
      case 'closed': return 'outline';
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
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!workerProfile) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Worker profile not found. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Worker Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {workerProfile.full_name}
          </p>
        </div>

        {/* Availability Toggle */}
        <div className="flex gap-4">
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="availability"
                checked={workerProfile.is_available ?? false}
                onCheckedChange={updateAvailability}
                disabled={updating}
              />
              <Label htmlFor="availability" className="flex items-center gap-2">
                {updating && <Loader2 className="h-4 w-4 animate-spin" />}
                {(workerProfile.is_available ?? false) ? (
                  <Badge variant="default">Available</Badge>
                ) : (
                  <Badge variant="destructive">Unavailable</Badge>
                )}
              </Label>
            </div>
          </Card>

          {/* Connection Status Indicator */}
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-muted-foreground">
                {isOnline ? 'Live Updates' : 'Offline'}
              </span>
            </div>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900">Pending Actions</h3>
                <p className="text-2xl font-bold text-blue-700">{stats.pending}</p>
                <p className="text-xs text-blue-600">Reports awaiting your action</p>
                {stats.pending > 0 && (
                  <Button 
                    size="sm" 
                    className="mt-2 bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      setStatusFilter("acknowledged");
                      setSortBy("created_at");
                      setSortOrder("asc");
                    }}
                  >
                    View Pending
                  </Button>
                )}
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-orange-900">In Progress</h3>
                <p className="text-2xl font-bold text-orange-700">{stats.inProgress}</p>
                <p className="text-xs text-orange-600">Currently working on</p>
                {stats.inProgress > 0 && (
                  <Button 
                    size="sm" 
                    className="mt-2 bg-orange-600 hover:bg-orange-700"
                    onClick={() => {
                      setStatusFilter("in_progress");
                      setSortBy("updated_at");
                      setSortOrder("asc");
                    }}
                  >
                    Continue Work
                  </Button>
                )}
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-green-900">Completed Today</h3>
                <p className="text-2xl font-bold text-green-700">
                  {reports.filter(r =>
                    (r.status === 'resolved' || r.status === 'closed') &&
                    new Date(r.updated_at).toDateString() === new Date().toDateString()
                  ).length}
                </p>
                <p className="text-xs text-green-600">Reports resolved today</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assigned</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Currently working</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resolved}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Worker Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Your Profile & Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profile Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">PROFILE INFORMATION</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium text-sm">Specialty</h5>
                  <Badge variant="outline">{workerProfile.specialty || 'General'}</Badge>
                </div>
                <div>
                  <h5 className="font-medium text-sm">Status</h5>
                  <Badge variant={(workerProfile.is_available ?? false) ? "default" : "destructive"}>
                    {(workerProfile.is_available ?? false) ? "Available" : "Unavailable"}
                  </Badge>
                </div>
              </div>
              
              <div>
                <h5 className="font-medium text-sm mb-2">Current Workload</h5>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">
                    {workerProfile.current_workload || 0}/{workerProfile.max_workload || 10}
                  </span>
                  <div className="flex-1 bg-muted rounded-full h-3">
                    <div
                      className={`rounded-full h-3 transition-all ${((workerProfile.current_workload || 0) / (workerProfile.max_workload || 10)) > 0.8
                          ? 'bg-red-500'
                          : ((workerProfile.current_workload || 0) / (workerProfile.max_workload || 10)) > 0.6
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                      style={{
                        width: `${Math.min(((workerProfile.current_workload || 0) / (workerProfile.max_workload || 10)) * 100, 100)}%`
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(((workerProfile.current_workload || 0) / (workerProfile.max_workload || 10)) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">PERFORMANCE METRICS</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium text-sm">Total Completed</h5>
                  <p className="text-2xl font-bold text-green-600">
                    {workerProfile.total_completed || 0}
                  </p>
                </div>
                <div>
                  <h5 className="font-medium text-sm">Performance Rating</h5>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-lg font-semibold">
                      {workerProfile.performance_rating ? `${workerProfile.performance_rating.toFixed(1)}/5.0` : 'N/A'}
                    </span>
                  </div>
                </div>
                <div>
                  <h5 className="font-medium text-sm">Avg. Completion Time</h5>
                  <p className="text-lg font-semibold">
                    {workerProfile.avg_completion_time 
                      ? `${Math.round(workerProfile.avg_completion_time / 24)} days`
                      : 'N/A'
                    }
                  </p>
                </div>
                <div>
                  <h5 className="font-medium text-sm">This Week</h5>
                  <p className="text-lg font-semibold text-blue-600">
                    {reports.filter(r => 
                      (r.status === 'resolved' || r.status === 'closed') &&
                      new Date(r.updated_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    ).length} completed
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Productivity Insights */}
      {reports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Today's Productivity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {reports.filter(r => 
                    r.status === 'in_progress' &&
                    new Date(r.updated_at).toDateString() === new Date().toDateString()
                  ).length}
                </p>
                <p className="text-sm text-muted-foreground">Started Today</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {reports.filter(r => 
                    (r.status === 'resolved' || r.status === 'closed') &&
                    new Date(r.updated_at).toDateString() === new Date().toDateString()
                  ).length}
                </p>
                <p className="text-sm text-muted-foreground">Completed Today</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {reports.filter(r => 
                    r.status === 'acknowledged' &&
                    new Date(r.created_at) < new Date(Date.now() - 24 * 60 * 60 * 1000)
                  ).length}
                </p>
                <p className="text-sm text-muted-foreground">Overdue (&gt;24h)</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {reports.filter(r => r.priority === 'high' && r.status !== 'resolved' && r.status !== 'closed').length}
                </p>
                <p className="text-sm text-muted-foreground">High Priority</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Assigned Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Date Created</SelectItem>
                <SelectItem value="updated_at">Last Updated</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="report_number">Report Number</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={(value: "asc" | "desc") => setSortOrder(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest First</SelectItem>
                <SelectItem value="asc">Oldest First</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setPriorityFilter("all");
                setSortBy("created_at");
                setSortOrder("desc");
              }}
            >
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Assigned Reports ({filteredReports.length})</CardTitle>
          <CardDescription>
            Reports assigned to you for resolution
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No reports found</h3>
              <p className="text-muted-foreground">
                {reports.length === 0
                  ? "You don't have any assigned reports yet."
                  : "No reports match your current filters."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReports.map((report) => (
                <Card key={report.id} className="border-l-4 border-l-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">#{report.report_number}</h3>
                          <Badge variant={getStatusBadgeVariant(report.status)}>
                            {report.status.replace('_', ' ')}
                          </Badge>
                          <Badge variant={getPriorityBadgeVariant(report.priority)}>
                            {report.priority}
                          </Badge>
                        </div>
                        <h4 className="font-medium text-lg mb-1">{report.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {report.description}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span className="text-muted-foreground">Citizen:</span>
                        <span>{report.profiles?.full_name || 'Anonymous'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="text-muted-foreground">Location:</span>
                        <span className="truncate">{report.location_address}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span className="text-muted-foreground">Created:</span>
                        <span>{formatDate(report.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        {report.status === 'acknowledged' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => quickStatusUpdate(report.id, 'in_progress')}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              Start Work
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => quickStatusUpdate(report.id, 'resolved')}
                              className="border-green-600 text-green-600 hover:bg-green-50"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Quick Resolve
                            </Button>
                          </>
                        )}
                        {report.status === 'in_progress' && (
                          <Button
                            size="sm"
                            onClick={() => quickStatusUpdate(report.id, 'resolved')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Mark Resolved
                          </Button>
                        )}
                        {(report.status === 'resolved' || report.status === 'closed') && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                      </div>

                      <Button asChild size="sm" variant="outline">
                        <Link to={`/reports/${report.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkerDashboard;