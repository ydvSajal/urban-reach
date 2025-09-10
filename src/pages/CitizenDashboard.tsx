import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface UserReport {
  id: string;
  report_number: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
  description: string;
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
        .select("id, report_number, title, category, status, created_at, description")
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
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'acknowledged': return 'text-blue-600 bg-blue-100';
      case 'in_progress': return 'text-orange-600 bg-orange-100';
      case 'resolved': return 'text-green-600 bg-green-100';
      case 'closed': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Dashboard</h1>
          <p className="text-muted-foreground">Track your reports and submit new ones</p>
        </div>
        <Button asChild>
          <Link to="/submit-report">
            <Plus className="mr-2 h-4 w-4" />
            Submit New Report
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time reports</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Being addressed</p>
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

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Your Reports</CardTitle>
          <CardDescription>
            {userReports.length === 0 
              ? "You haven't submitted any reports yet" 
              : `You have ${userReports.length} report${userReports.length === 1 ? '' : 's'}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userReports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No reports yet</h3>
              <p className="text-muted-foreground mb-4">
                Submit your first report to get started with our municipal services
              </p>
              <Button asChild>
                <Link to="/submit-report">
                  <Plus className="mr-2 h-4 w-4" />
                  Submit Your First Report
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {userReports.map((report) => (
                <div key={report.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">#{report.report_number}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(report.status)}`}>
                        {report.status.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(report.created_at)}
                    </span>
                  </div>
                  <h4 className="font-medium mb-1">{report.title}</h4>
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {report.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground capitalize">
                      {report.category.replace('_', ' ')}
                    </span>
                    <Button variant="outline" size="sm" asChild>
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
  );
};

export default CitizenDashboard;