import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Navigation,
  Calendar,
  ArrowRight,
  ClipboardList
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import WorkerMapReal from "@/components/WorkerMapReal";
import { Link } from "react-router-dom";

interface WorkerProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  specialty: string | null;
  is_available: boolean;
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
  images: string[] | null;
  citizen: {
    full_name: string | null;
    email: string;
    phone: string | null;
  };
}

interface DashboardStats {
  newAssignments: number;
  inProgress: number;
  completedToday: number;
}

const WorkerDashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null);
  const [reports, setReports] = useState<AssignedReport[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ newAssignments: 0, inProgress: 0, completedToday: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upcomingTasks, setUpcomingTasks] = useState<AssignedReport[]>([]);

  useEffect(() => {
    initializeWorkerDashboard();
  }, []);

  const initializeWorkerDashboard = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      setUser(user);
      
      // Get worker profile
      const { data: worker, error: workerError } = await supabase
        .from("workers")
        .select("id, user_id, full_name, email, phone, specialty, is_available")
        .eq("user_id", user.id)
        .single();

      if (workerError) {
        console.error("Worker profile error:", workerError);
        throw new Error("You don't have worker access. Please contact your administrator.");
      }

      setWorkerProfile(worker);
      await loadWorkerAssignments(worker.id);

    } catch (error: any) {
      console.error("Error initializing dashboard:", error);
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

  const loadWorkerAssignments = async (workerId: string) => {
    try {
      // Get all reports assigned to this worker and fetch citizen info separately
      const { data: reportsData, error: reportsError } = await supabase
        .from("reports")
        .select(`
          id, report_number, title, description, category, status, priority,
          location_address, latitude, longitude, created_at, images, citizen_id
        `)
        .eq("assigned_worker_id", workerId)
        .order("created_at", { ascending: false });

      if (reportsError) {
        console.error("Reports error:", reportsError);
        throw reportsError;
      }

      // Fetch citizen profiles for each report with better error handling
      const reportsWithCitizen = await Promise.all(
        (reportsData || []).map(async (report) => {
          try {
            const { data: citizen, error: citizenError } = await supabase
              .from("profiles")
              .select("full_name, email, phone")
              .eq("user_id", report.citizen_id)
              .maybeSingle();

            if (citizenError) {
              console.warn("Error fetching citizen profile:", citizenError);
            }

            return {
              ...report,
              citizen: citizen || { full_name: 'Unknown Citizen', email: '', phone: null }
            };
          } catch (error) {
            console.warn("Error processing citizen data:", error);
            return {
              ...report,
              citizen: { full_name: 'Unknown Citizen', email: '', phone: null }
            };
          }
        })
      );

      setReports(reportsWithCitizen);

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const newAssignments = reportsWithCitizen.filter(r => 
        ['pending', 'acknowledged'].includes(r.status)
      ).length;

      const inProgress = reportsWithCitizen.filter(r => r.status === 'in_progress').length;

      const completedToday = reportsWithCitizen.filter(r => 
        r.status === 'resolved' && 
        new Date(r.created_at) >= today
      ).length;

      setStats({ newAssignments, inProgress, completedToday });

      // Get upcoming priority tasks (next 3 highest priority pending/acknowledged)
      const upcoming = reportsWithCitizen
        .filter(r => ['pending', 'acknowledged'].includes(r.status))
        .sort((a, b) => {
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority as keyof typeof priorityOrder] - 
                 priorityOrder[a.priority as keyof typeof priorityOrder];
        })
        .slice(0, 3);

      setUpcomingTasks(upcoming);

    } catch (error: any) {
      console.error("Error loading assignments:", error);
      toast({
        title: "Error loading assignments", 
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-priority-critical text-white border-priority-critical';
      case 'high': return 'bg-priority-high text-white border-priority-high';
      case 'medium': return 'bg-priority-medium text-black border-priority-medium';
      case 'low': return 'bg-priority-low text-white border-priority-low';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-status-pending bg-status-pending/10 border-status-pending/20';
      case 'acknowledged': return 'text-status-acknowledged bg-status-acknowledged/10 border-status-acknowledged/20';
      case 'in_progress': return 'text-status-in-progress bg-status-in-progress/10 border-status-in-progress/20';
      case 'resolved': return 'text-status-resolved bg-status-resolved/10 border-status-resolved/20';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  const openInMaps = (address: string, lat?: number, lng?: number) => {
    const query = lat && lng ? `${lat},${lng}` : encodeURIComponent(address);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your assignments...</p>
        </div>
      </div>
    );
  }

  if (error || !workerProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error || "Worker profile not found. Please contact your administrator."}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Welcome Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Welcome, {workerProfile.full_name}
              </h1>
              <p className="text-muted-foreground text-lg">Your daily assignments</p>
            </div>
            <Button asChild className="shadow-lg">
              <Link to="/worker/assignments">
                <ClipboardList className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">My Assignments</span>
              </Link>
            </Button>
          </div>
        </div>
        {/* Assignment Map */}
        <Card className="mb-6 border-0 shadow-lg bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-xl font-semibold">
              <span>📍 Your Assignments Map</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg overflow-hidden">
              <WorkerMapReal reports={reports.filter(r => r.latitude && r.longitude)} />
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          <Card className="text-center border-0 shadow-lg bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <CardContent className="pt-6 pb-6">
              <div className="p-3 rounded-lg bg-primary/10 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <div className="text-3xl font-bold text-foreground">{stats.newAssignments}</div>
              <div className="text-sm text-muted-foreground mt-2">
                New Assignments
              </div>
            </CardContent>
          </Card>
          
          <Card className="text-center border-0 shadow-lg bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <CardContent className="pt-6 pb-6">
              <div className="p-3 rounded-lg bg-status-in-progress/10 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-status-in-progress" />
              </div>
              <div className="text-3xl font-bold text-foreground">{stats.inProgress}</div>
              <div className="text-sm text-muted-foreground mt-2">
                In Progress
              </div>
            </CardContent>
          </Card>
          
          <Card className="text-center border-0 shadow-lg bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <CardContent className="pt-6 pb-6">
              <div className="p-3 rounded-lg bg-status-resolved/10 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-status-resolved" />
              </div>
              <div className="text-3xl font-bold text-foreground">{stats.completedToday}</div>
              <div className="text-sm text-muted-foreground mt-2">
                Completed Today
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Tasks */}
        <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="text-xl font-semibold">Next Priority Tasks</span>
              </div>
              <Link 
                to="/worker/assignments"
                className="text-sm text-primary hover:text-primary/80 flex items-center space-x-1 font-medium"
              >
                <span>View All</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
          {upcomingTasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 rounded-full bg-status-resolved/10 w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-status-resolved" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">All caught up!</h3>
              <p className="text-muted-foreground">No pending assignments at the moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="border border-border/50 rounded-lg p-5 bg-background/50 hover:bg-accent/5 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-start justify-between space-x-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="font-semibold text-foreground">{task.title}</h3>
                        <Badge className={`${getPriorityColor(task.priority)} border font-medium`}>
                          {task.priority.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{task.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <span>📍 {task.location_address}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-3">
                      <Badge className={`${getStatusColor(task.status)} border font-medium`}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                      <Button 
                        size="sm"
                        onClick={() => openInMaps(task.location_address, task.latitude || undefined, task.longitude || undefined)}
                        className="shadow-sm"
                      >
                        <Navigation className="h-4 w-4 mr-1" />
                        Navigate
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkerDashboard;