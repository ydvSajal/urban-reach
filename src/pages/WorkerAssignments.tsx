import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Navigation,
  MapPin,
  User
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

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

const WorkerAssignments = () => {
  const [reports, setReports] = useState<AssignedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Get worker profile
      const { data: worker } = await supabase
        .from("workers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!worker) return;

      // Get assignments
      const { data: reportsData, error } = await supabase
        .from("reports")
        .select(`
          id, report_number, title, description, category, status, priority,
          location_address, latitude, longitude, created_at, images, citizen_id
        `)
        .eq("assigned_worker_id", worker.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch citizen profiles
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
    } catch (error: any) {
      console.error("Error loading assignments:", error);
      toast({
        title: "Error loading assignments",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const filteredReports = reports.filter(report => {
    if (filter === 'all') return true;
    return report.status === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Assignments</h1>
          <p className="text-muted-foreground">Manage your assigned tasks</p>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'acknowledged', 'in_progress', 'resolved'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(status)}
            className="capitalize"
          >
            {status === 'all' ? 'All Tasks' : status.replace('_', ' ')}
          </Button>
        ))}
      </div>

      {/* Assignments List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">No assignments found</h3>
              <p className="text-muted-foreground">
                {filter === 'all' ? 'You have no assignments yet.' : `No ${filter.replace('_', ' ')} assignments.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredReports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between space-x-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-foreground">{report.title}</h3>
                      <Badge className={getPriorityColor(report.priority)}>
                        {report.priority.toUpperCase()}
                      </Badge>
                      <Badge className={getStatusColor(report.status)}>
                        {report.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {report.description}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4" />
                        <span>{report.location_address}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>

                    {report.citizen.full_name && (
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>Reported by: {report.citizen.full_name}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    <Button 
                      size="sm"
                      onClick={() => openInMaps(report.location_address, report.latitude || undefined, report.longitude || undefined)}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Navigation className="h-4 w-4 mr-1" />
                      Navigate
                    </Button>
                    <Button 
                      size="sm"
                      variant="outline"
                      asChild
                    >
                      <Link to={`/reports/${report.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default WorkerAssignments;