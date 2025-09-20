import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, FileText, Clock, CheckCircle, AlertCircle, User } from "lucide-react";
import { Link } from "react-router-dom";

interface UserReport {
  id: string;
  report_number: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
  description: string;
  workers?: {
    full_name: string | null;
  } | null;
}

const CitizenDashboard = () => {
  const [userReports, setUserReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
  });

  useEffect(() => {
    loadUserReports();
  }, []);

  const loadUserReports = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: reports, error } = await supabase
        .from("reports")
        .select(`
          id, 
          report_number, 
          title, 
          category, 
          status, 
          created_at, 
          description,
          workers:assigned_worker_id (
            full_name
          )
        `)
        .eq("citizen_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setUserReports(reports || []);
      
      // Calculate stats
      const total = reports?.length || 0;
      const pending = reports?.filter(r => r.status === 'pending').length || 0;
      const inProgress = reports?.filter(r => r.status === 'in_progress' || r.status === 'acknowledged').length || 0;
      const resolved = reports?.filter(r => r.status === 'resolved' || r.status === 'closed').length || 0;

      setStats({ total, pending, inProgress, resolved });
    } catch (error: any) {
      console.error("Error loading reports:", error);
      toast({
        title: "Error loading your reports",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-status-pending bg-status-pending/10 border-status-pending/20';
      case 'acknowledged': return 'text-status-acknowledged bg-status-acknowledged/10 border-status-acknowledged/20';
      case 'in_progress': return 'text-status-in-progress bg-status-in-progress/10 border-status-in-progress/20';
      case 'resolved': return 'text-status-resolved bg-status-resolved/10 border-status-resolved/20';
      case 'closed': return 'text-status-closed bg-status-closed/10 border-status-closed/20';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              My Dashboard
            </h1>
            <p className="text-muted-foreground text-lg">Track your reports and submit new ones</p>
          </div>
          <Button asChild className="shadow-lg">
            <Link to="/submit-report">
              <Plus className="mr-2 h-4 w-4" />
              Submit New Report
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Reports</CardTitle>
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.total}</div>
              <p className="text-sm text-muted-foreground mt-1">All time reports</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
              <div className="p-2 rounded-lg bg-status-pending/10">
                <Clock className="h-5 w-5 text-status-pending" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.pending}</div>
              <p className="text-sm text-muted-foreground mt-1">Awaiting review</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
              <div className="p-2 rounded-lg bg-status-in-progress/10">
                <AlertCircle className="h-5 w-5 text-status-in-progress" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.inProgress}</div>
              <p className="text-sm text-muted-foreground mt-1">Being addressed</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Resolved</CardTitle>
              <div className="p-2 rounded-lg bg-status-resolved/10">
                <CheckCircle className="h-5 w-5 text-status-resolved" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.resolved}</div>
              <p className="text-sm text-muted-foreground mt-1">Completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Reports */}
        <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Your Reports</CardTitle>
            <CardDescription className="text-base">
              {userReports.length === 0 
                ? "You haven't submitted any reports yet" 
                : `You have ${userReports.length} report${userReports.length === 1 ? '' : 's'}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
          {userReports.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 rounded-full bg-primary/10 w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <FileText className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">No reports yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Submit your first report to get started with our municipal services
              </p>
              <Button asChild className="shadow-lg">
                <Link to="/submit-report">
                  <Plus className="mr-2 h-4 w-4" />
                  Submit Your First Report
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {userReports.map((report) => (
                <div key={report.id} className="border border-border/50 rounded-lg p-5 bg-background/50 hover:bg-accent/5 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-foreground">#{report.report_number}</h3>
                      <span className={`px-3 py-1 text-xs rounded-full font-medium border ${getStatusColor(report.status)}`}>
                        {report.status.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground font-medium">
                      {formatDate(report.created_at)}
                    </span>
                  </div>
                  <h4 className="font-semibold mb-2 text-foreground">{report.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {report.description}
                  </p>
                  
                  {/* Worker Assignment Info */}
                  {report.workers?.full_name && (
                    <div className="flex items-center gap-2 mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <User className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-blue-700">
                        <span className="font-medium">Assigned to:</span> {report.workers.full_name}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground capitalize font-medium">
                      {report.category.replace('_', ' ')}
                    </span>
                    <Button variant="outline" size="sm" asChild className="shadow-sm">
                      <Link to={`/reports/${report.id}`}>
                        View Details
                      </Link>
                    </Button>
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

export default CitizenDashboard;