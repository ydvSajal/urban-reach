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
    full_name: string;
    email: string;
  };
  workers: {
    full_name: string;
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

  const loadReports = async () => {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select(`
          *,
          profiles!reports_citizen_id_fkey (
            full_name,
            email
          ),
          workers (
            full_name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setReports(data || []);
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'acknowledged': return 'outline';
      case 'in_progress': return 'default';
      case 'resolved': return 'default';
      case 'closed': return 'secondary';
      default: return 'secondary';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
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
  ];

  const statuses = ['pending', 'acknowledged', 'in_progress', 'resolved', 'closed'];
  const priorities = ['low', 'medium', 'high'];

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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports Management</h1>
        <p className="text-muted-foreground">
          Manage and track all reported issues from citizens
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.replace('_', ' ').toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.replace('_', ' ').toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {priorities.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priority.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setCategoryFilter("all");
                setPriorityFilter("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredReports.length} of {reports.length} reports
        </p>
      </div>

      {/* Reports Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Citizen</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No reports found matching your criteria</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">
                        #{report.report_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{report.title}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {report.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{report.profiles?.full_name || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground">{report.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {report.category.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(report.status)}>
                          {report.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPriorityBadgeVariant(report.priority)}>
                          {report.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {report.workers ? (
                          <p className="text-sm">{report.workers.full_name}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground">Unassigned</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {formatDate(report.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/reports/${report.id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;