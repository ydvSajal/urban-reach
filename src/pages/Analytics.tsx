import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { TrendingUp, FileText, Clock, CheckCircle, AlertTriangle, BarChart3, PieChart, Activity, Download } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ExportDialog from "@/components/ExportDialog";

interface AnalyticsData {
  reportsByCategory: Array<{ name: string; value: number; percentage: number; fill: string }>;
  reportsByStatus: Array<{ name: string; value: number; percentage: number; fill: string }>;
  reportsByPriority: Array<{ name: string; value: number; percentage: number; fill: string }>;
  reportsOverTime: Array<{ date: string; reports: number; resolved: number }>;
  avgResolutionTime: number;
  totalReports: number;
  openReports: number;
  resolvedReports: number;
}

const Analytics = () => {
  const [data, setData] = useState<AnalyticsData>({
    reportsByCategory: [],
    reportsByStatus: [],
    reportsByPriority: [],
    reportsOverTime: [],
    avgResolutionTime: 0,
    totalReports: 0,
    openReports: 0,
    resolvedReports: 0,
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30"); // days
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(timeRange));

      // Get reports within date range
      const { data: reports, error } = await supabase
        .from("reports")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (error) throw error;

      // Process data for charts
      const processedData = processReportsData(reports || []);
      setData(processedData);
    } catch (error: any) {
      console.error("Error loading analytics data:", error);
      toast({
        title: "Error loading analytics",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processReportsData = (reports: any[]): AnalyticsData => {
    const total = reports.length;
    const colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

    // Reports by category
    const categoryCount = reports.reduce((acc, report) => {
      acc[report.category] = (acc[report.category] || 0) + 1;
      return acc;
    }, {});

    const reportsByCategory = Object.entries(categoryCount).map(([category, count], index) => ({
      name: category.replace('_', ' ').toUpperCase(),
      value: count as number,
      percentage: total > 0 ? Math.round(((count as number) / total) * 100) : 0,
      fill: colors[index % colors.length]
    }));

    // Reports by status
    const statusCount = reports.reduce((acc, report) => {
      acc[report.status] = (acc[report.status] || 0) + 1;
      return acc;
    }, {});

    const statusColors = {
      pending: 'hsl(var(--status-pending))',
      acknowledged: 'hsl(var(--status-acknowledged))',
      in_progress: 'hsl(var(--status-in-progress))',
      resolved: 'hsl(var(--status-resolved))',
      closed: 'hsl(var(--status-closed))'
    };

    const reportsByStatus = Object.entries(statusCount).map(([status, count]) => ({
      name: status.replace('_', ' ').toUpperCase(),
      value: count as number,
      percentage: total > 0 ? Math.round(((count as number) / total) * 100) : 0,
      fill: statusColors[status as keyof typeof statusColors] || colors[0]
    }));

    // Reports by priority
    const priorityCount = reports.reduce((acc, report) => {
      acc[report.priority] = (acc[report.priority] || 0) + 1;
      return acc;
    }, {});

    const priorityColors = {
      high: 'hsl(var(--priority-high))',
      medium: 'hsl(var(--priority-medium))',
      low: 'hsl(var(--priority-low))'
    };

    const reportsByPriority = Object.entries(priorityCount).map(([priority, count]) => ({
      name: priority.toUpperCase(),
      value: count as number,
      percentage: total > 0 ? Math.round(((count as number) / total) * 100) : 0,
      fill: priorityColors[priority as keyof typeof priorityColors] || colors[0]
    }));

    // Reports over time (last 7 days)
    const reportsOverTime = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayReports = reports.filter(r => r.created_at.startsWith(dateStr));
      const dayResolved = dayReports.filter(r => r.resolved_at && r.resolved_at.startsWith(dateStr));
      
      reportsOverTime.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        reports: dayReports.length,
        resolved: dayResolved.length
      });
    }

    // Calculate average resolution time
    const resolvedReports = reports.filter(r => r.resolved_at);
    const avgResolutionTime = resolvedReports.length > 0 
      ? resolvedReports.reduce((acc, report) => {
          const created = new Date(report.created_at);
          const resolved = new Date(report.resolved_at);
          return acc + (resolved.getTime() - created.getTime());
        }, 0) / resolvedReports.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0;

    return {
      reportsByCategory,
      reportsByStatus,
      reportsByPriority,
      reportsOverTime,
      avgResolutionTime,
      totalReports: total,
      openReports: reports.filter(r => !['resolved', 'closed'].includes(r.status)).length,
      resolvedReports: reports.filter(r => ['resolved', 'closed'].includes(r.status)).length,
    };
  };

  const statCards = [
    {
      title: "Total Reports",
      value: data.totalReports,
      description: `Last ${timeRange} days`,
      icon: FileText,
      color: "text-chart-1",
    },
    {
      title: "Open Reports",
      value: data.openReports,
      description: "Currently active",
      icon: Clock,
      color: "text-chart-3",
    },
    {
      title: "Resolved Reports",
      value: data.resolvedReports,
      description: "Successfully closed",
      icon: CheckCircle,
      color: "text-chart-2",
    },
    {
      title: "Avg Resolution Time",
      value: `${data.avgResolutionTime.toFixed(1)} days`,
      description: "Average time to resolve",
      icon: TrendingUp,
      color: "text-chart-5",
    },
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-64"></div>
          <div className="h-20 bg-muted rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-muted rounded"></div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5 p-6">
      <div className="mx-auto max-w-7xl space-y-8 animate-fade-in">
        {/* Hero Analytics Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/20 via-chart-2/15 to-chart-1/20 p-8 shadow-2xl border border-primary/20 backdrop-blur-sm">
          <div className="absolute inset-0 bg-grid-white/[0.05]" />
          <div className="relative">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-chart-1 flex items-center justify-center shadow-lg">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-chart-1 to-chart-2 bg-clip-text text-transparent">
                      Analytics Hub
                    </h1>
                    <p className="text-lg text-muted-foreground">
                      Real-time insights and performance metrics
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{data.totalReports}</div>
                    <div className="text-xs text-muted-foreground">Total Reports</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-chart-2">{data.resolvedReports}</div>
                    <div className="text-xs text-muted-foreground">Resolved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-chart-3">{data.openReports}</div>
                    <div className="text-xs text-muted-foreground">Open Cases</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-chart-5">{data.avgResolutionTime.toFixed(1)}d</div>
                    <div className="text-xs text-muted-foreground">Avg Resolution</div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setExportDialogOpen(true)}
                  className="bg-white/80 backdrop-blur-sm border-white/50 hover:bg-white/90 shadow-lg"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-40 bg-white/80 backdrop-blur-sm border-white/50 hover:bg-white/90">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <Card key={stat.title} className={`group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 animate-fade-in bg-gradient-to-br from-card/90 to-muted/30 backdrop-blur-sm`} style={{ animationDelay: `${index * 100}ms` }}>
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 group-hover:to-primary/10 transition-all duration-300" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-chart-1 to-chart-1/70 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold mb-1 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <p className="text-sm text-muted-foreground">{stat.description}</p>
                <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full bg-gradient-to-r from-chart-1 to-chart-1/70 rounded-full animate-pulse`} style={{ width: '60%' }} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Modern Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Reports by Category - Enhanced Pie Chart */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-card/95 to-muted/20 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-chart-1 to-chart-2 flex items-center justify-center">
                  <PieChart className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Reports by Category</CardTitle>
                  <CardDescription>Issue distribution by type</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {data.reportsByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={data.reportsByCategory}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                    >
                      {data.reportsByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reports by Status - Enhanced Pie Chart */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-card/95 to-muted/20 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-chart-2 to-chart-3 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Reports by Status</CardTitle>
                  <CardDescription>Current status distribution</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {data.reportsByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={data.reportsByStatus}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                    >
                      {data.reportsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reports Over Time - Enhanced Line Chart */}
          <Card className="lg:col-span-2 shadow-lg border-0 bg-gradient-to-br from-card/95 to-muted/20 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-chart-3 to-chart-4 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Reports Trend</CardTitle>
                  <CardDescription>Daily submissions and resolutions (Last 7 days)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {data.reportsOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.reportsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="reports" 
                      stroke="hsl(var(--chart-1))" 
                      strokeWidth={3} 
                      name="New Reports"
                      dot={{ fill: 'hsl(var(--chart-1))', strokeWidth: 2, r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="resolved" 
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={3} 
                      name="Resolved Reports"
                      dot={{ fill: 'hsl(var(--chart-2))', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reports by Priority - Enhanced Bar Chart */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-card/95 to-muted/20 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-chart-4 to-chart-5 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Priority Distribution</CardTitle>
                  <CardDescription>Reports by priority level</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {data.reportsByPriority.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.reportsByPriority}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="hsl(var(--chart-1))" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enhanced KPI Summary */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-card/95 to-muted/20 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-chart-5 to-primary flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Performance KPIs</CardTitle>
                  <CardDescription>Key metrics overview</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-chart-2/10 to-chart-2/5 border border-chart-2/20">
                  <div className="text-4xl font-bold text-chart-2 mb-2">
                    {data.totalReports > 0 ? Math.round((data.resolvedReports / data.totalReports) * 100) : 0}%
                  </div>
                  <div className="font-medium mb-3">Resolution Rate</div>
                  <Progress 
                    value={data.totalReports > 0 ? Math.round((data.resolvedReports / data.totalReports) * 100) : 0} 
                    className="h-2"
                  />
                  <div className="text-sm text-muted-foreground mt-3">
                    {data.resolvedReports} of {data.totalReports} cases resolved
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50">
                    <div className="text-lg font-bold text-chart-1">
                      {data.reportsByCategory.length > 0 
                        ? data.reportsByCategory.reduce((prev, current) => (prev.value > current.value) ? prev : current).name
                        : "N/A"
                      }
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Top Category</div>
                  </div>
                  
                  <div className="text-center p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50">
                    <div className="text-lg font-bold text-chart-3">
                      {data.avgResolutionTime.toFixed(1)}d
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Avg Time</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export Dialog */}
        <ExportDialog
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          currentTimeRange={timeRange}
        />
      </div>
    </div>
  );
};

export default Analytics;
