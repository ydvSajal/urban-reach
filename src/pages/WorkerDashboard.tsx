import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import ImageUpload from "@/components/ImageUpload";
import { uploadFiles } from "@/lib/storage";
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar,
  ArrowUpDown,
  Search,
  Filter,
  BarChart3,
  Activity,
  Target,
  TrendingUp,
  Camera,
  FileImage,
  X
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

interface WorkerProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  specialty: string | null;
  council_id: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

interface AssignedReport {
  id: string;
  report_number: string;
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  location_address: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  citizen_id: string;
  assigned_worker_id: string | null;
  images: string[] | null;
  completion_photos: string[] | null;
  profiles: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  };
}

interface DashboardStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
}

const WorkerDashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null);
  const [reports, setReports] = useState<AssignedReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<AssignedReport[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ total: 0, pending: 0, inProgress: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter and sort states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"created_at" | "priority" | "status">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Work completion dialog states
  const [completionDialog, setCompletionDialog] = useState<{ open: boolean; reportId: string | null }>({ open: false, reportId: null });
  const [completionNotes, setCompletionNotes] = useState("");
  const [completionPhotos, setCompletionPhotos] = useState<string[]>([]);
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState(false);

  // Real-time subscription for worker-assigned reports
  const useWorkerSubscription = () => {
    useEffect(() => {
      if (!workerProfile?.id) return;

      const subscription = supabase
        .channel(`worker-reports-${workerProfile.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reports',
            filter: `assigned_worker_id=eq.${workerProfile.id}`,
          },
          (payload) => {
            console.log('Report update received:', payload);
            loadWorkerData(); // Reload data when changes occur
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }, [workerProfile?.id]);
  };

  useWorkerSubscription();

  useEffect(() => {
    loadWorkerData();
  }, []);

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

      setUser(user);

      // First, get user's profile to check role
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError) {
        console.error("Profile error:", profileError);
        throw new Error("Failed to load user profile");
      }

      // Load worker profile
      const { data: worker, error: workerError } = await supabase
        .from("workers")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (workerError && workerError.code !== 'PGRST116') {
        console.error("Worker profile error:", workerError);
        throw new Error("Failed to load worker profile");
      }

      // If no worker profile exists, create one for users with worker role
      if (!worker && profile?.role === 'worker') {
        const { data: newWorker, error: createError } = await supabase
          .from("workers")
          .insert({
            user_id: user.id,
            full_name: profile.full_name || user.email?.split('@')[0] || 'Worker',
            email: user.email || '',
            phone: profile.phone || '',
            specialty: 'General',
            council_id: profile.council_id,
            is_available: true
          })
          .select()
          .single();

        if (createError) {
          console.error("Error creating worker profile:", createError);
          throw new Error("Failed to create worker profile");
        }

        setWorkerProfile(newWorker);
        await loadReportsForWorker(newWorker.id);
      } else if (worker) {
        setWorkerProfile(worker);
        await loadReportsForWorker(worker.id);
      } else {
        throw new Error("You don't have worker access. Please contact your administrator.");
      }

    } catch (error: any) {
      console.error("Error loading worker data:", error);
      setError(error.message);
      toast({
        title: "Error loading dashboard",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadReportsForWorker = async (workerId: string) => {
    const { data: reportsData, error: reportsError } = await supabase
      .from("reports")
      .select("*")
      .eq("assigned_worker_id", workerId)
      .order("created_at", { ascending: false });

    if (reportsError) {
      console.error("Reports error:", reportsError);
      return;
    }

    // Fetch citizen profiles for each report
    const reportsWithProfiles = await Promise.all(
      (reportsData || []).map(async (report) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email, phone")
          .eq("user_id", report.citizen_id)
          .single();

        return {
          ...report,
          profiles: profile || { full_name: null, email: null, phone: null }
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

    // Sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "created_at":
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case "priority":
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder];
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder];
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
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

    try {
      const { error } = await supabase
        .from("workers")
        .update({ is_available: isAvailable })
        .eq("id", workerProfile.id);

      if (error) throw error;

      setWorkerProfile({ ...workerProfile, is_available: isAvailable });
      toast({
        title: "Status updated",
        description: `You are now ${isAvailable ? "available" : "unavailable"} for assignments`,
      });
    } catch (error: any) {
      console.error("Error updating availability:", error);
      toast({
        title: "Error",
        description: "Failed to update availability status",
        variant: "destructive",
      });
    }
  };

  const quickStatusUpdate = async (reportId: string, newStatus: 'pending' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed') => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("reports")
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
          ...(newStatus === 'resolved' && { resolved_at: new Date().toISOString() })
        })
        .eq("id", reportId);

      if (error) throw error;

      // Add to status history
      const currentReport = reports.find(r => r.id === reportId);
      await supabase.from("report_status_history").insert({
        report_id: reportId,
        old_status: currentReport?.status || null,
        new_status: newStatus,
        changed_by: user.id,
        notes: `Status updated via worker dashboard`
      });

      // Reload data
      loadWorkerData();

      toast({
        title: "Status updated",
        description: `Report status changed to ${newStatus}`,
      });
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update report status",
        variant: "destructive",
      });
    }
  };

  const submitWorkCompletion = async () => {
    if (!completionDialog.reportId || !workerProfile?.id || !user) return;

    setIsSubmittingCompletion(true);
    try {
      // Create work completion record
      const { error: completionError } = await supabase
        .from('work_completions')
        .insert({
          report_id: completionDialog.reportId,
          worker_id: workerProfile.id,
          completion_notes: completionNotes,
          completion_photos: completionPhotos
        });

      if (completionError) throw completionError;

      // Update report with completion photos and resolve status  
      const { error: reportError } = await supabase
        .from('reports')
        .update({ 
          status: 'resolved',
          completion_photos: completionPhotos,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', completionDialog.reportId);

      if (reportError) throw reportError;

      // Add to status history
      const { error: historyError } = await supabase
        .from('report_status_history')
        .insert({
          report_id: completionDialog.reportId,
          old_status: null,
          new_status: 'resolved',
          changed_by: user.id,
          notes: completionNotes || 'Work completed with photos'
        });

      if (historyError) {
        console.error('Error adding to status history:', historyError);
      }

      // Refresh reports
      await loadReportsForWorker(workerProfile.id);

      // Reset form
      setCompletionDialog({ open: false, reportId: null });
      setCompletionNotes('');
      setCompletionPhotos([]);

      toast({
        title: "Success",
        description: "Work completion submitted successfully",
      });

    } catch (error: any) {
      console.error('Error submitting work completion:', error);
      toast({
        title: "Error",
        description: "Failed to submit work completion",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingCompletion(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'acknowledged': return 'default';
      case 'in_progress': return 'default';
      case 'resolved': return 'default';
      case 'closed': return 'outline';
      default: return 'secondary';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
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
          <h1 className="text-3xl font-bold tracking-tight">Welcome, {workerProfile.full_name}</h1>
          <p className="text-muted-foreground">
            Manage your assigned reports and track your progress
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Available for assignments</span>
          <Switch
            checked={workerProfile.is_available}
            onCheckedChange={updateAvailability}
          />
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">Pending</p>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Reports awaiting action
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">In Progress</p>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">
              Currently working on
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">Completed</p>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{stats.resolved}</div>
            <p className="text-xs text-muted-foreground">
              Successfully resolved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">Total Assigned</p>
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              All time assignments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Worker Profile</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{workerProfile.email}</span>
              </div>
              {workerProfile.phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{workerProfile.phone}</span>
                </div>
              )}
              {workerProfile.specialty && (
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{workerProfile.specialty}</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Metrics</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Completion Rate</span>
                <span className="font-medium">
                  {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Active Tasks</span>
                <span className="font-medium">{stats.pending + stats.inProgress}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Status</span>
                <Badge variant={workerProfile.is_available ? "default" : "secondary"}>
                  {workerProfile.is_available ? "Available" : "Unavailable"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Productivity Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Productivity Insights</span>
          </CardTitle>
          <CardDescription>
            Your performance at a glance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Assignments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
              <div className="text-sm text-muted-foreground">Completed Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.pending + stats.inProgress}</div>
              <div className="text-sm text-muted-foreground">Active Tasks</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filter & Search Reports</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('-');
              setSortBy(field as any);
              setSortOrder(order as any);
            }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at-desc">Newest First</SelectItem>
                <SelectItem value="created_at-asc">Oldest First</SelectItem>
                <SelectItem value="priority-desc">High Priority</SelectItem>
                <SelectItem value="priority-asc">Low Priority</SelectItem>
                <SelectItem value="status-asc">Status A-Z</SelectItem>
                <SelectItem value="status-desc">Status Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Reports ({filteredReports.length})</CardTitle>
          <CardDescription>
            Reports currently assigned to you
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No reports found</h3>
              <p className="text-muted-foreground">
                {reports.length === 0 
                  ? "You haven't been assigned any reports yet."
                  : "No reports match your current filters."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReports.map((report) => (
                <Card key={report.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between space-x-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{report.title}</h3>
                          <Badge variant="outline">#{report.report_number}</Badge>
                          <Badge variant={getPriorityBadgeVariant(report.priority)}>
                            {report.priority}
                          </Badge>
                          <Badge variant="secondary">{report.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {report.description}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-4 w-4" />
                            <span className="truncate max-w-[200px]">{report.location_address}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(report.created_at)}</span>
                          </div>
                          {report.profiles?.full_name && (
                            <div className="flex items-center space-x-1">
                              <span>Reported by: {report.profiles.full_name}</span>
                            </div>
                          )}
                        </div>

                        {/* Show original report images if any */}
                        {report.images && report.images.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium mb-2">Report Images:</h4>
                            <div className="grid grid-cols-3 gap-2">
                              {report.images.slice(0, 3).map((image, index) => (
                                <img
                                  key={index}
                                  src={image}
                                  alt={`Report image ${index + 1}`}
                                  className="w-full h-20 object-cover rounded border"
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Show completion photos if any */}
                        {report.completion_photos && report.completion_photos.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium mb-2 flex items-center">
                              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                              Work Completed - Photos:
                            </h4>
                            <div className="grid grid-cols-3 gap-2">
                              {report.completion_photos.map((photo, index) => (
                                <img
                                  key={index}
                                  src={photo}
                                  alt={`Completion photo ${index + 1}`}
                                  className="w-full h-20 object-cover rounded border border-green-200"
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <Badge variant={getStatusBadgeVariant(report.status)}>
                          {report.status.replace('_', ' ')}
                        </Badge>
                        <div className="flex flex-col gap-2">
                          {report.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => quickStatusUpdate(report.id, 'acknowledged')}
                            >
                              Acknowledge
                            </Button>
                          )}
                          {report.status === 'acknowledged' && (
                            <Button
                              size="sm"
                              onClick={() => quickStatusUpdate(report.id, 'in_progress')}
                            >
                              Start Work
                            </Button>
                          )}
                          {(report.status === 'in_progress' || report.status === 'acknowledged') && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => setCompletionDialog({ open: true, reportId: report.id })}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Camera className="w-4 h-4 mr-2" />
                              Complete with Photos
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Work Completion Dialog */}
      <Dialog open={completionDialog.open} onOpenChange={(open) => setCompletionDialog({ open, reportId: completionDialog.reportId })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Work</DialogTitle>
            <DialogDescription>
              Add completion notes and upload photos of the completed work.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="completion-notes">Completion Notes</Label>
              <Textarea
                id="completion-notes"
                placeholder="Describe the work completed..."
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Completion Photos</Label>
              <ImageUpload
                onUpload={async (files) => {
                  try {
                    const reportId = completionDialog.reportId || 'completion';
                    const uploadedUrls = await uploadFiles(files, reportId);
                    setCompletionPhotos(prev => [...prev, ...uploadedUrls]);
                    return uploadedUrls;
                  } catch (error) {
                    console.error('Error uploading completion photos:', error);
                    toast({
                      title: "Upload Error",
                      description: "Failed to upload photos. Please try again.",
                      variant: "destructive"
                    });
                    return [];
                  }
                }}
                maxFiles={5}
                className="mt-1"
              />
              
              {completionPhotos.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {completionPhotos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={photo}
                        alt={`Completion photo ${index + 1}`}
                        className="w-full h-20 object-cover rounded border"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => setCompletionPhotos(prev => prev.filter((_, i) => i !== index))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setCompletionDialog({ open: false, reportId: null });
                  setCompletionNotes('');
                  setCompletionPhotos([]);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={submitWorkCompletion}
                disabled={isSubmittingCompletion || completionPhotos.length === 0}
                className="flex-1"
              >
                {isSubmittingCompletion ? 'Submitting...' : 'Submit Completion'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkerDashboard;