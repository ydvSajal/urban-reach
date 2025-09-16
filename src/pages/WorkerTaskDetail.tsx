import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Navigation,
  MapPin,
  User,
  Phone,
  Mail,
  Play,
  Square,
  ArrowLeft
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import ImageGallery from "@/components/ImageGallery";

interface TaskReport {
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

const WorkerTaskDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<TaskReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [statusNotes, setStatusNotes] = useState("");

  useEffect(() => {
    if (id) {
      loadTaskDetail(id);
    }
  }, [id]);

  const loadTaskDetail = async (taskId: string) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Get worker profile first
      const { data: worker } = await supabase
        .from("workers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!worker) {
        throw new Error("Worker profile not found");
      }

      // Get the specific report assigned to this worker
      const { data: reportData, error } = await supabase
        .from("reports")
        .select(`
          id, report_number, title, description, category, status, priority,
          location_address, latitude, longitude, created_at, images, citizen_id
        `)
        .eq("id", taskId)
        .eq("assigned_worker_id", worker.id)
        .single();

      if (error) {
        console.error("Task error:", error);
        throw error;
      }

      // Get citizen info
      const { data: citizen } = await supabase
        .from("profiles")
        .select("full_name, email, phone")
        .eq("user_id", reportData.citizen_id)
        .maybeSingle();

      setTask({
        ...reportData,
        citizen: citizen || { full_name: 'Unknown Citizen', email: '', phone: null }
      });

    } catch (error: any) {
      console.error("Error loading task:", error);
      toast({
        title: "Error loading task",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (newStatus: TaskReport['status']) => {
    if (!task) return;

    try {
      setUpdating(true);
      
      const { error } = await supabase
        .from("reports")
        .update({ 
          status: newStatus,
          ...(newStatus === 'resolved' ? { resolved_at: new Date().toISOString() } : {})
        })
        .eq("id", task.id);

      if (error) throw error;

      // Add status history entry
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("report_status_history")
          .insert({
            report_id: task.id,
            old_status: task.status,
            new_status: newStatus,
            notes: statusNotes || null,
            changed_by: user.id
          });
      }

      setTask({ ...task, status: newStatus });
      setStatusNotes("");
      
      toast({
        title: "Status updated",
        description: `Task marked as ${newStatus.replace('_', ' ')}`,
      });

    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const openInMaps = (address: string, lat?: number, lng?: number) => {
    const query = lat && lng ? `${lat},${lng}` : encodeURIComponent(address);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(url, '_blank');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-4xl mx-auto">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Task not found or you don't have access to this task.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/worker/assignments">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Assignments
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Task Details</h1>
            <p className="text-muted-foreground">#{task.report_number}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge className={getPriorityColor(task.priority)}>
            {task.priority.toUpperCase()}
          </Badge>
          <Badge className={getStatusColor(task.status)}>
            {task.status.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {/* Task Information */}
      <Card>
        <CardHeader>
          <CardTitle>{task.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{task.description}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{task.location_address}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Reported {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{task.citizen.full_name || 'Unknown Citizen'}</span>
              </div>
              {task.citizen.phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{task.citizen.phone}</span>
                </div>
              )}
              {task.citizen.email && (
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{task.citizen.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Button */}
          <div className="pt-4">
            <Button 
              onClick={() => openInMaps(task.location_address, task.latitude || undefined, task.longitude || undefined)}
              className="w-full sm:w-auto"
            >
              <Navigation className="h-4 w-4 mr-2" />
              Get Directions
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Images */}
      {task.images && task.images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageGallery images={task.images} />
          </CardContent>
        </Card>
      )}

      {/* Status Update */}
      <Card>
        <CardHeader>
          <CardTitle>Update Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Add Notes (Optional)</label>
            <Textarea
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              placeholder="Add any notes about the work progress..."
              rows={3}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {task.status === 'pending' && (
              <Button
                onClick={() => updateTaskStatus('acknowledged')}
                disabled={updating}
                variant="outline"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Acknowledge Task
              </Button>
            )}

            {(task.status === 'pending' || task.status === 'acknowledged') && (
              <Button
                onClick={() => updateTaskStatus('in_progress')}
                disabled={updating}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Work
              </Button>
            )}

            {task.status === 'in_progress' && (
              <Button
                onClick={() => updateTaskStatus('resolved')}
                disabled={updating}
                className="bg-green-600 hover:bg-green-700"
              >
                <Square className="h-4 w-4 mr-2" />
                Mark Complete
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkerTaskDetail;