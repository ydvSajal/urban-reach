import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { TrendingUp, FileText, Clock, CheckCircle, AlertTriangle, BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AnalyticsData {
  reportsByCategory: Array<{ name: string; value: number; percentage: number }>;
  reportsByStatus: Array<{ name: string; value: number; percentage: number }>;
  reportsByPriority: Array<{ name: string; value: number; percentage: number }>;
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

    // Reports by category
    const categoryCount = reports.reduce((acc, report) => {
      acc[report.category] = (acc[report.category] || 0) + 1;
      return acc;
    }, {});

    const reportsByCategory = Object.entries(categoryCount).map(([category, count]) => ({
      name: category.replace('_', ' ').toUpperCase(),
      value: count as number,
      percentage: total > 0 ? Math.round(((count as number) / total) * 100) : 0
    }));

    // Reports by status
    const statusCount = reports.reduce((acc, report) => {
      acc[report.status] = (acc[report.status] || 0) + 1;
      return acc;
    }, {});

    const reportsByStatus = Object.entries(statusCount).map(([status, count]) => ({
      name: status.replace('_', ' ').toUpperCase(),
      value: count as number,
      percentage: total > 0 ? Math.round(((count as number) / total) * 100) : 0
    }));

    // Reports by priority
    const priorityCount = reports.reduce((acc, report) => {
      acc[report.priority] = (acc[report.priority] || 0) + 1;
      return acc;
    }, {});

    const reportsByPriority = Object.entries(priorityCount).map(([priority, count]) => ({
      name: priority.toUpperCase(),
      value: count as number,
      percentage: total > 0 ? Math.round(((count as number) / total) * 100) : 0
    }));

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

      {/* Simple Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reports by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Reports by Category
            </CardTitle>
            <CardDescription>Distribution of issues by type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.reportsByCategory.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.name}</span>
                  <div className="flex items-center gap-3 flex-1 max-w-[200px]">
                    <Progress value={item.percentage} className="flex-1" />
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {item.value} ({item.percentage}%)
                    </span>
                  </div>
                </div>
              ))}
              {data.reportsByCategory.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reports by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Reports by Status
            </CardTitle>
            <CardDescription>Current status distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.reportsByStatus.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.name}</span>
                  <div className="flex items-center gap-3 flex-1 max-w-[200px]">
                    <Progress value={item.percentage} className="flex-1" />
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {item.value} ({item.percentage}%)
                    </span>
                  </div>
                </div>
              ))}
              {data.reportsByStatus.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reports by Priority */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Reports by Priority
            </CardTitle>
            <CardDescription>Priority level distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.reportsByPriority.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.name}</span>
                  <div className="flex items-center gap-3 flex-1 max-w-[200px]">
                    <Progress value={item.percentage} className="flex-1" />
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {item.value} ({item.percentage}%)
                    </span>
                  </div>
                </div>
              ))}
              {data.reportsByPriority.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Summary Statistics
            </CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Resolution Rate</span>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={data.totalReports > 0 ? Math.round((data.resolvedReports / data.totalReports) * 100) : 0} 
                    className="w-20" 
                  />
                  <span className="text-sm font-bold">
                    {data.totalReports > 0 ? Math.round((data.resolvedReports / data.totalReports) * 100) : 0}%
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Avg Resolution Time</span>
                <span className="text-sm font-bold">
                  {data.avgResolutionTime.toFixed(1)} days
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Most Common Category</span>
                <span className="text-sm font-bold">
                  {data.reportsByCategory.length > 0 
                    ? data.reportsByCategory.reduce((prev, current) => (prev.value > current.value) ? prev : current).name
                    : "N/A"
                  }
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Open vs Resolved</span>
                <span className="text-sm font-bold">
                  {data.openReports} / {data.resolvedReports}
                </span>
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