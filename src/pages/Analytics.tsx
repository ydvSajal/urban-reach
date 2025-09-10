import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { TrendingUp, FileText, Clock, CheckCircle, AlertTriangle, BarChart3, PieChart, Activity } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Insights and performance metrics for your municipal reports
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reports by Category - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Reports by Category
            </CardTitle>
            <CardDescription>Distribution of issues by type</CardDescription>
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

        {/* Reports by Status - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Reports by Status
            </CardTitle>
            <CardDescription>Current status distribution</CardDescription>
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

        {/* Reports Over Time - Line Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Reports Over Time
            </CardTitle>
            <CardDescription>Daily report submissions and resolutions (Last 7 days)</CardDescription>
          </CardHeader>
          <CardContent>
            {data.reportsOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.reportsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="reports" stroke="hsl(var(--chart-1))" strokeWidth={2} name="New Reports" />
                  <Line type="monotone" dataKey="resolved" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Resolved Reports" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reports by Priority - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Reports by Priority
            </CardTitle>
            <CardDescription>Priority level distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {data.reportsByPriority.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.reportsByPriority}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--chart-1))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Key Performance Indicators
            </CardTitle>
            <CardDescription>Important metrics at a glance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="text-center p-4 bg-gradient-to-br from-chart-2/10 to-chart-2/5 rounded-lg border border-chart-2/20">
                <div className="text-3xl font-bold text-chart-2 mb-1">
                  {data.totalReports > 0 ? Math.round((data.resolvedReports / data.totalReports) * 100) : 0}%
                </div>
                <div className="text-sm font-medium mb-2">Resolution Rate</div>
                <Progress 
                  value={data.totalReports > 0 ? Math.round((data.resolvedReports / data.totalReports) * 100) : 0} 
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground mt-2">
                  {data.resolvedReports} of {data.totalReports} resolved
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Avg Resolution Time</span>
                  <span className="text-sm font-bold text-chart-5">
                    {data.avgResolutionTime.toFixed(1)} days
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Most Common Category</span>
                  <span className="text-sm font-bold text-chart-1">
                    {data.reportsByCategory.length > 0 
                      ? data.reportsByCategory.reduce((prev, current) => (prev.value > current.value) ? prev : current).name
                      : "N/A"
                    }
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Open vs Resolved</span>
                  <span className="text-sm font-bold">
                    <span className="text-chart-3">{data.openReports}</span> / <span className="text-chart-2">{data.resolvedReports}</span>
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
          <CardDescription>Summary of important metrics and trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg border">
              <AlertTriangle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Resolution Rate</p>
              <p className="text-2xl font-bold text-blue-600">
                {data.totalReports > 0 ? Math.round((data.resolvedReports / data.totalReports) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {data.resolvedReports} of {data.totalReports} resolved
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Most Common Category</p>
              <p className="text-lg font-bold text-green-600">
                {data.reportsByCategory.length > 0 
                  ? data.reportsByCategory.reduce((prev, current) => (prev.value > current.value) ? prev : current).name
                  : "N/A"
                }
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {data.reportsByCategory.length > 0 
                  ? `${data.reportsByCategory.reduce((prev, current) => (prev.value > current.value) ? prev : current).value} reports`
                  : "No data"
                }
              </p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg border">
              <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Pending Reports</p>
              <p className="text-2xl font-bold text-orange-600">
                {data.reportsByStatus.find(s => s.name === 'PENDING')?.value || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Awaiting attention
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;