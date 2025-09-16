import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Navigation,
  List,
  Calendar,
  ArrowRight
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import WorkerMap from "@/components/WorkerMap";
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

      if (reportsError) throw reportsError;

      // Fetch citizen profiles for each report
      const reportsWithCitizen = await Promise.all(
        (reportsData || []).map(async (report) => {
          const { data: citizen } = await supabase
            .from("profiles")
            .select("full_name, email, phone")
            .eq("user_id", report.citizen_id)
            .single();

          return {
            ...report,
            citizen: citizen || { full_name: null, email: '', phone: null }
          };
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
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'acknowledged': return 'bg-yellow-100 text-yellow-800';  
      case 'in_progress': return 'bg-orange-100 text-orange-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const openInMaps = (address: string, lat?: number, lng?: number) => {
    const query = lat && lng ? `${lat},${lng}` : encodeURIComponent(address);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your assignments...</p>
        </div>
      </div>
    );
  }

  if (error || !workerProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-First Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Welcome, {workerProfile.full_name}
              </h1>
              <p className="text-sm text-gray-600">Your daily assignments</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                to="/worker/assignments" 
                className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">My Assignments</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Task Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="text-center">
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-blue-600">{stats.newAssignments}</div>
              <div className="text-sm text-gray-600 flex items-center justify-center mt-1">
                <Clock className="h-4 w-4 mr-1" />
                New Assignments
              </div>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-orange-600">{stats.inProgress}</div>
              <div className="text-sm text-gray-600 flex items-center justify-center mt-1">
                <AlertTriangle className="h-4 w-4 mr-1" />
                In Progress
              </div>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-green-600">{stats.completedToday}</div>
              <div className="text-sm text-gray-600 flex items-center justify-center mt-1">
                <CheckCircle className="h-4 w-4 mr-1" />
                Completed Today
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assignments Map */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              <span>Your Assignment Locations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 bg-gray-100 rounded-lg flex items-center justify-center">
              <WorkerMap reports={reports.filter(r => r.latitude && r.longitude)} />
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span>Next Priority Tasks</span>
              </div>
              <Link 
                to="/worker/assignments"
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <span>View All</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingTasks.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
                <p className="text-gray-600">No pending assignments at the moment.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingTasks.map((task) => (
                  <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between space-x-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-gray-900">{task.title}</h3>
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span>{task.location_address}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <Badge className={getStatusColor(task.status)}>
                          {task.status.replace('_', ' ')}
                        </Badge>
                        <Button 
                          size="sm"
                          onClick={() => openInMaps(task.location_address, task.latitude || undefined, task.longitude || undefined)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
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