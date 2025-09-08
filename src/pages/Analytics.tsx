import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, FileText, Clock, CheckCircle, AlertTriangle } from "lucide-react";

interface AnalyticsData {
  reportsByCategory: Array<{ name: string; value: number; color: string }>;
  reportsByStatus: Array<{ name: string; value: number; color: string }>;
  reportsByPriority: Array<{ name: string; value: number; color: string }>;
  reportsOverTime: Array<{ date: string; count: number }>;
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
    // Reports by category
    const categoryColors = {
      roads: "#8884d8",
      sanitation: "#82ca9d",
      water_supply: "#ffc658",
      electricity: "#ff7300",
      public_safety: "#00ff00",
      parks: "#0088fe",
      drainage: "#00c49f",
      waste_management: "#ffbb28",
      street_lights: "#ff8042",
      other: "#8dd1e1"
    };

    const categoryCount = reports.reduce((acc, report) => {
      acc[report.category] = (acc[report.category] || 0) + 1;
      return acc;
    }, {});

    const reportsByCategory = Object.entries(categoryCount).map(([category, count]) => ({
      name: category.replace('_', ' ').toUpperCase(),
      value: count as number,
      color: categoryColors[category as keyof typeof categoryColors] || "#8884d8"
    }));

    // Reports by status
    const statusColors = {
      pending: "#ffc658",
      acknowledged: "#8884d8",
      in_progress: "#ff7300",
      resolved: "#00c49f",
      closed: "#8dd1e1"
    };

    const statusCount = reports.reduce((acc, report) => {
      acc[report.status] = (acc[report.status] || 0) + 1;
      return acc;
    }, {});

    const reportsByStatus = Object.entries(statusCount).map(([status, count]) => ({
      name: status.replace('_', ' ').toUpperCase(),
      value: count as number,
      color: statusColors[status as keyof typeof statusColors] || "#8884d8"
    }));

    // Reports by priority
    const priorityColors = {
      low: "#00c49f",
      medium: "#ffc658",
      high: "#ff8042"
    };

    const priorityCount = reports.reduce((acc, report) => {
      acc[report.priority] = (acc[report.priority] || 0) + 1;
      return acc;
    }, {});

    const reportsByPriority = Object.entries(priorityCount).map(([priority, count]) => ({
      name: priority.toUpperCase(),
      value: count as number,
      color: priorityColors[priority as keyof typeof priorityColors] || "#8884d8"
    }));

    // Reports over time (daily)
    const dailyCounts = reports.reduce((acc, report) => {
      const date = new Date(report.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    const reportsOverTime = Object.entries(dailyCounts)
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        count: count as number
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
      totalReports: reports.length,
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
      color: "text-blue-600",
    },
    {
      title: "Open Reports",
      value: data.openReports,
      description: "Currently active",
      icon: Clock,
      color: "text-orange-600",
    },
    {
      title: "Resolved Reports",
      value: data.resolvedReports,
      description: "Successfully closed",
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      title: "Avg Resolution Time",
      value: `${data.avgResolutionTime.toFixed(1)} days`,
      description: "Average time to resolve",
      icon: TrendingUp,
      color: "text-purple-600",
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
        {/* Reports by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Reports by Category</CardTitle>
            <CardDescription>Distribution of issues by type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.reportsByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.reportsByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Reports by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Reports by Status</CardTitle>
            <CardDescription>Current status distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.reportsByStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8">
                  {data.reportsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Reports Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Reports Over Time</CardTitle>
            <CardDescription>Daily report submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.reportsOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Reports by Priority */}
        <Card>
          <CardHeader>
            <CardTitle>Reports by Priority</CardTitle>
            <CardDescription>Priority level distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.reportsByPriority}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8">
                  {data.reportsByPriority.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <AlertTriangle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Resolution Rate</p>
              <p className="text-2xl font-bold text-blue-600">
                {data.totalReports > 0 ? Math.round((data.resolvedReports / data.totalReports) * 100) : 0}%
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Most Common Category</p>
              <p className="text-lg font-bold text-green-600">
                {data.reportsByCategory.length > 0 
                  ? data.reportsByCategory.reduce((prev, current) => (prev.value > current.value) ? prev : current).name
                  : "N/A"
                }
              </p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Pending Reports</p>
              <p className="text-2xl font-bold text-orange-600">
                {data.reportsByStatus.find(s => s.name === 'PENDING')?.value || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;