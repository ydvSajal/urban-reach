import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Search, Filter, Eye, Calendar, MapPin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNewReportsSubscription, useRealtimeSubscription, useRealtimeConnectionStatus } from "@/hooks/useRealtimeSubscription";

interface Report {
  id: string;
  report_number: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  location_address: string;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
  workers: {
    full_name: string | null;
  } | null;
}

const Reports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, searchTerm, statusFilter, categoryFilter, priorityFilter]);

  // Real-time connection status
  const { isOnline } = useRealtimeConnectionStatus();

  // Subscribe to new reports
  useNewReportsSubscription(
    undefined, // All councils for admin view
    (newReport) => {
      loadReports(); // Refresh the reports list
    },
    true
  );

  // Subscribe to report updates
  useRealtimeSubscription({
    table: 'reports',
    event: 'UPDATE',
    onUpdate: (payload) => {
      loadReports(); // Refresh when any report is updated
    },
    enabled: true,
  });

  const loadReports = async () => {
    try {
      // Get current user and their council
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("council_id")
        .eq("user_id", user.id)
        .single();

      const userCouncilId = profile?.council_id;

      // Load reports, filtered by council if user has one
      let reportsQuery = supabase
        .from("reports")
        .select(`
          *,
          citizen_id,
          assigned_worker_id
        `)
        .order("created_at", { ascending: false });
      
      if (userCouncilId) {
        reportsQuery = reportsQuery.eq("council_id", userCouncilId);
      }

      const { data, error } = await reportsQuery;

      if (error) {
        console.error("Reports loading error:", error);
        setReports([]);
        return;
      }

      // Manually fetch profiles and workers for each report
      const reportsWithRelations = await Promise.all(
        (data || []).map(async (report) => {
          // Ensure report data has valid values to prevent empty string Select errors
          const cleanReport = {
            ...report,
            category: report.category || 'other',
            status: report.status || 'pending',
            priority: report.priority || 'medium'
          };

          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", report.citizen_id)
            .single();

          let worker = null;
          if (report.assigned_worker_id) {
            const { data: workerData } = await supabase
              .from("workers")
              .select("full_name")
              .eq("id", report.assigned_worker_id)
              .single();
            worker = workerData;
          }

          return {
            ...cleanReport,
            profiles: profile || { full_name: null, email: null },
            workers: worker
          };
        })
      );

      setReports(reportsWithRelations);
    } catch (error: any) {
      console.error("Error loading reports:", error);
      toast({
        title: "Error loading reports",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = reports;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (report) =>
          report.report_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          report.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          report.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((report) => report.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((report) => report.category === categoryFilter);
    }

    // Priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter((report) => report.priority === priorityFilter);
    }

    setFilteredReports(filtered);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-status-pending/10 text-status-pending border-status-pending/20';
      case 'acknowledged': return 'bg-status-acknowledged/10 text-status-acknowledged border-status-acknowledged/20';
      case 'in_progress': return 'bg-status-in-progress/10 text-status-in-progress border-status-in-progress/20';
      case 'resolved': return 'bg-status-resolved/10 text-status-resolved border-status-resolved/20';
      case 'closed': return 'bg-status-closed/10 text-status-closed border-status-closed/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-priority-high/10 text-priority-high border-priority-high/20';
      case 'medium': return 'bg-priority-medium/10 text-priority-medium border-priority-medium/20';
      case 'low': return 'bg-priority-low/10 text-priority-low border-priority-low/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const categories = [
    'roads', 'sanitation', 'water_supply', 'electricity', 'public_safety', 
    'parks', 'drainage', 'waste_management', 'street_lights', 'other'
  ].filter(cat => cat && cat.trim() !== '');

  const statuses = ['pending', 'acknowledged', 'in_progress', 'resolved', 'closed'].filter(status => status && status.trim() !== '');
  const priorities = ['low', 'medium', 'high'].filter(priority => priority && priority.trim() !== '');

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-64"></div>
          <div className="h-20 bg-muted rounded"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
      <div className="mx-auto max-w-7xl space-y-8 animate-fade-in">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/10 via-chart-1/5 to-chart-2/10 p-8 shadow-xl border border-primary/10 backdrop-blur-sm">
          <div className="absolute inset-0 bg-grid-white/[0.05] opacity-50" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-chart-1 bg-clip-text text-transparent">
                  Reports Management
                </h1>
                <p className="mt-2 text-lg text-muted-foreground">
                  Advanced municipal report tracking and management system
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-chart-2' : 'bg-destructive'} animate-pulse`} />
                  <span className={`font-medium ${isOnline ? 'text-chart-2' : 'text-destructive'}`}>
                    {isOnline ? 'Live Updates Active' : 'Connection Lost'}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">{filteredReports.length} reports shown</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Smart Filters Panel */}
        <Card className="shadow-lg border-0 bg-gradient-to-br from-card/95 to-muted/30 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-chart-1 flex items-center justify-center">
                <Filter className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Smart Filters</CardTitle>
                <p className="text-sm text-muted-foreground">Filter and search through reports intelligently</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reports, citizens, or descriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-11 border-2 focus:border-primary/50 transition-all"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-11 border-2 focus:border-primary/50">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statuses.filter(status => status && status.trim() !== '').map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace('_', ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-11 border-2 focus:border-primary/50">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.filter(category => category && category.trim() !== '').map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.replace('_', ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-11 border-2 focus:border-primary/50">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {priorities.filter(priority => priority && priority.trim() !== '').map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                variant="outline"
                size="lg"
                className="h-11 border-2 hover:border-primary/50 transition-all hover:shadow-md"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setCategoryFilter("all");
                  setPriorityFilter("all");
                }}
              >
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reports Grid */}
        <div className="space-y-6">
          {filteredReports.length === 0 ? (
            <Card className="shadow-xl border-0 bg-gradient-to-br from-card/80 to-muted/40 backdrop-blur-sm">
              <CardContent className="py-16">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-muted to-muted/40 flex items-center justify-center">
                    <Search className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-semibold mb-2">No Reports Found</h3>
                    <p className="text-muted-foreground">Try adjusting your filters or search terms</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredReports.map((report, index) => (
                <Card key={report.id} className={`group shadow-lg border-0 bg-gradient-to-r from-card/95 to-muted/20 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-fade-in`} style={{ animationDelay: `${index * 50}ms` }}>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                      <div className="lg:col-span-2">
                        <div className="text-center lg:text-left">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-primary/10 to-chart-1/10 text-sm font-medium">
                            #{report.report_number}
                          </div>
                        </div>
                      </div>
                      
                      <div className="lg:col-span-3">
                        <div>
                          <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">{report.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{report.description}</p>
                        </div>
                      </div>
                      
                      <div className="lg:col-span-2">
                        <div className="text-center lg:text-left">
                          <p className="font-medium">{report.profiles?.full_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{report.profiles?.email}</p>
                        </div>
                      </div>
                      
                      <div className="lg:col-span-1">
                        <Badge variant="outline" className="capitalize justify-center">
                          {report.category.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <div className="lg:col-span-1">
                        <Badge className={`border capitalize justify-center ${getStatusBadgeColor(report.status)}`}>
                          {report.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <div className="lg:col-span-1">
                        <Badge className={`border capitalize justify-center ${getPriorityBadgeColor(report.priority)}`}>
                          {report.priority}
                        </Badge>
                      </div>
                      
                      <div className="lg:col-span-1">
                        <div className="text-center lg:text-left">
                          {report.workers ? (
                            <p className="text-sm font-medium">{report.workers.full_name}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">Unassigned</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="lg:col-span-1 text-center lg:text-right">
                        <Button 
                          asChild 
                          size="sm" 
                          className="bg-gradient-to-r from-primary to-chart-1 hover:from-primary/90 hover:to-chart-1/90 shadow-lg hover:shadow-xl transition-all"
                        >
                          <Link to={`/reports/${report.id}`} className="inline-flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            View
                          </Link>
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <span>Created {formatDate(report.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-[200px]">{report.location_address || 'Location not specified'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;