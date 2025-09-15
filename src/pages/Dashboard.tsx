import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ReportsMap from "@/components/ReportsMap";
import { FileText, CheckCircle, Clock, AlertCircle, TrendingUp, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useNewReportsSubscription, useRealtimeConnectionStatus, useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import ExportDialog from "@/components/ExportDialog";
import TestDataInserter from "@/components/TestDataInserter";

interface DashboardStats {
  totalReports: number;
  openReports: number;
  resolvedReports: number;
  pendingReports: number;
}

interface RecentReport {
  id: string;
  report_number: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
  profiles: {
    full_name: string | null;
  } | null;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalReports: 0,
    openReports: 0,
    resolvedReports: 0,
    pendingReports: 0,
  });
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [councilId, setCouncilId] = useState<string | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  
  // Real-time connection status
  const { isOnline } = useRealtimeConnectionStatus();

  // Get council ID for real-time subscriptions
  useEffect(() => {
    const getCouncilId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("council_id")
          .eq("user_id", user.id)
          .single();
        setCouncilId(profile?.council_id || null);
      }
    };
    getCouncilId();
  }, []);

  // Subscribe to new reports
  useNewReportsSubscription(
    councilId || undefined,
    (newReport) => {
      // Refresh dashboard data when new report comes in
      loadDashboardData();
    },
    !!councilId
  );

  // Subscribe to report status changes for real-time stats updates
  useRealtimeSubscription({
    table: 'reports',
    event: 'UPDATE',
    filter: councilId ? `council_id=eq.${councilId}` : undefined,
    onUpdate: (payload) => {
      // Refresh dashboard data when any report is updated
      loadDashboardData();
    },
    enabled: !!councilId,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's council ID
      const { data: profile } = await supabase
        .from("profiles")
        .select("council_id")
        .eq("user_id", user.id)
        .single();

      const userCouncilId = profile?.council_id;

      // Load stats - filter by council if user has one, otherwise show all for admin
      let reportsQuery = supabase
        .from("reports")
        .select("status");
      
      if (userCouncilId) {
        reportsQuery = reportsQuery.eq("council_id", userCouncilId);
      }

      const { data: reportsData, error: reportsError } = await reportsQuery;

      if (reportsError) throw reportsError;

      const total = reportsData?.length || 0;
      const resolved = reportsData?.filter(r => r.status === 'resolved' || r.status === 'closed').length || 0;
      const pending = reportsData?.filter(r => r.status === 'pending').length || 0;
      const open = total - resolved;

      setStats({
        totalReports: total,
        openReports: open,
        resolvedReports: resolved,
        pendingReports: pending,
      });

      // Load recent reports - filter by council
      let recentQuery = supabase
        .from("reports")
        .select("id, report_number, title, category, status, created_at, citizen_id")
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (userCouncilId) {
        recentQuery = recentQuery.eq("council_id", userCouncilId);
      }

      const { data: recentData, error: recentError } = await recentQuery;

      if (recentError) {
        console.error("Recent reports error:", recentError);
        setRecentReports([]);
      } else {
        // Fetch profiles for each report
        const reportsWithProfiles = await Promise.all(
          (recentData || []).map(async (report) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", report.citizen_id)
              .single();
            
            return {
              ...report,
              profiles: profile || { full_name: null }
            };
          })
        );
        
        setRecentReports(reportsWithProfiles);
      }
    } catch (error: unknown) {
      console.error("Error loading dashboard data:", error);
      toast({
        title: "Error loading dashboard",
        description: (error as Error)?.message || "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
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

  const statCards = [
    {
      title: "Total Reports",
      value: stats.totalReports,
      description: "All time reports",
      icon: FileText,
      color: "text-chart-1",
    },
    {
      title: "Open Reports",
      value: stats.openReports,
      description: "Currently active",
      icon: Clock,
      color: "text-chart-3",
    },
    {
      title: "Resolved Reports",
      value: stats.resolvedReports,
      description: "Successfully closed",
      icon: CheckCircle,
      color: "text-chart-2",
    },
    {
      title: "Pending Reports",
      value: stats.pendingReports,
      description: "Awaiting attention",
      icon: AlertCircle,
      color: "text-chart-4",
    },
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Overview of your municipal reports and activities
            <span className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={isOnline ? 'text-green-600' : 'text-destructive'}>
                {isOnline ? 'Live Updates' : 'Offline'}
              </span>
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowExportDialog(true)}>
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
          <Button asChild>
            <Link to="/reports">
              <TrendingUp className="mr-2 h-4 w-4" />
              View All Reports
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Map and Recent Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Reports Map</CardTitle>
              <CardDescription>Geographic distribution of reported issues</CardDescription>
            </CardHeader>
            <CardContent>
              <ReportsMap height="350px" />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
              <CardDescription>Latest 5 reports submitted to your council</CardDescription>
            </CardHeader>
            <CardContent>
            <div className="space-y-4">
              {recentReports.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No reports found
                </p>
              ) : (
                recentReports.map((report) => (
                  <div key={report.id} className="flex items-center space-x-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium leading-none">
                          #{report.report_number}
                        </p>
                        <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(report.status)}`}>
                          {report.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {report.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{report.category.replace('_', ' ')}</span>
                        <span>•</span>
                        <span>{report.profiles?.full_name || 'Anonymous'}</span>
                        <span>•</span>
                        <span>{formatDate(report.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {recentReports.length > 0 && (
              <div className="pt-4">
                <Button variant="outline" asChild className="w-full">
                  <Link to="/reports">View All Reports</Link>
                </Button>
              </div>
            )}
            </CardContent>
          </Card>

          <TestDataInserter />
        </div>
      </div>
      {showExportDialog && (
        <ExportDialog 
          open={showExportDialog} 
          onOpenChange={setShowExportDialog}
        />
      )}
    </div>
  );
};

export default Dashboard;