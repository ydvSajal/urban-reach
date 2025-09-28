import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Search, Edit, Trash2, UserPlus, Phone, Mail } from "lucide-react";

interface Worker {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  specialty: string | null;
  is_available: boolean;
  created_at: string;
}

const Workers = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [filteredWorkers, setFilteredWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    specialty: "",
    is_available: true,
  });

  useEffect(() => {
    loadWorkers();
  }, []);

  useEffect(() => {
    filterWorkers();
  }, [workers, searchTerm]);

  const loadWorkers = async () => {
    try {
      const { data, error } = await supabase
        .from("workers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setWorkers(data || []);
    } catch (error: any) {
      console.error("Error loading workers:", error);
      toast({
        title: "Error loading workers",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterWorkers = () => {
    let filtered = workers;

    if (searchTerm) {
      filtered = filtered.filter(
        (worker) =>
          worker.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          worker.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          worker.specialty?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredWorkers(filtered);
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      phone: "",
      specialty: "",
      is_available: true,
    });
    setEditingWorker(null);
  };

  const openEditDialog = (worker: Worker) => {
    setFormData({
      full_name: worker.full_name,
      email: worker.email,
      phone: worker.phone || "",
      specialty: worker.specialty || "",
      is_available: worker.is_available,
    });
    setEditingWorker(worker);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingWorker) {
        // Update existing worker
        const { error } = await supabase
          .from("workers")
          .update({
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone || null,
            specialty: formData.specialty || null,
            is_available: formData.is_available,
          })
          .eq("id", editingWorker.id);

        if (error) throw error;

        toast({
          title: "Worker updated successfully",
          description: `${formData.full_name} has been updated.`,
        });
      }

      resetForm();
      loadWorkers();
    } catch (error: any) {
      console.error("Error saving worker:", error);
      toast({
        title: "Error saving worker",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (worker: Worker) => {
    if (!confirm(`Are you sure you want to remove ${worker.full_name} from the workers list?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("workers")
        .delete()
        .eq("id", worker.id);

      if (error) throw error;

      toast({
        title: "Worker removed",
        description: `${worker.full_name} has been removed from the workers list.`,
      });

      loadWorkers();
    } catch (error: any) {
      console.error("Error deleting worker:", error);
      toast({
        title: "Error removing worker",
        description: error.message,
        variant: "destructive",
      });
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
          <div className="h-20 bg-muted rounded"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-chart-2/5 p-6">
      <div className="mx-auto max-w-7xl space-y-8 animate-fade-in">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-chart-2/15 via-primary/10 to-chart-1/15 p-8 shadow-2xl border border-chart-2/20 backdrop-blur-sm">
          <div className="absolute inset-0 bg-grid-white/[0.05]" />
          <div className="relative">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-chart-2 to-primary flex items-center justify-center shadow-lg">
                    <UserPlus className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-chart-2 via-primary to-chart-1 bg-clip-text text-transparent">
                      Workers Hub
                    </h1>
                    <p className="text-lg text-muted-foreground">
                      Manage your workforce and track assignments efficiently
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-chart-2">{workers.length}</div>
                    <div className="text-xs text-muted-foreground">Total Workers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{workers.filter(w => w.is_available).length}</div>
                    <div className="text-xs text-muted-foreground">Available</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-chart-3">{workers.filter(w => w.specialty).length}</div>
                    <div className="text-xs text-muted-foreground">Specialists</div>
                  </div>
                </div>
              </div>
              
              <div className="text-center lg:text-right p-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                <div className="text-sm font-medium mb-2">Worker Registration</div>
                <p className="text-xs text-muted-foreground mb-1">
                  Workers can self-register at the
                </p>
                <p className="text-sm font-semibold text-primary">Worker Portal</p>
                <p className="text-xs text-muted-foreground mt-1">
                  They appear here automatically
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search Panel */}
        <Card className="shadow-lg border-0 bg-gradient-to-br from-card/95 to-muted/30 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search workers by name, email, or specialty..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-11 border-2 focus:border-primary/50 transition-all"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{filteredWorkers.length} of {workers.length} workers</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workers Grid */}
        <div className="space-y-6">
          {filteredWorkers.length === 0 ? (
            <Card className="shadow-xl border-0 bg-gradient-to-br from-card/80 to-muted/40 backdrop-blur-sm">
              <CardContent className="py-16">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-chart-2/20 to-primary/20 flex items-center justify-center">
                    <UserPlus className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-semibold mb-2">
                      {searchTerm ? "No Workers Found" : "No Workers Registered Yet"}
                    </h3>
                    <p className="text-muted-foreground">
                      {searchTerm 
                        ? "Try adjusting your search terms" 
                        : "Workers can register through the Worker Portal"
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredWorkers.map((worker, index) => (
                <Card key={worker.id} className={`group shadow-lg border-0 bg-gradient-to-r from-card/95 to-muted/20 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-fade-in`} style={{ animationDelay: `${index * 50}ms` }}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-chart-2 to-primary flex items-center justify-center text-white font-semibold text-lg shadow-lg">
                          {worker.full_name.charAt(0).toUpperCase()}
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                            {worker.full_name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span>{worker.email}</span>
                            </div>
                            {worker.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                <span>{worker.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {worker.specialty ? (
                          <Badge variant="outline" className="bg-gradient-to-r from-primary/10 to-chart-1/10 border-primary/20">
                            {worker.specialty}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground px-3 py-1 rounded-full bg-muted/50">
                            No specialty
                          </span>
                        )}
                        
                        <Badge 
                          variant={worker.is_available ? "default" : "secondary"}
                          className={worker.is_available ? "bg-gradient-to-r from-chart-2 to-chart-2/80" : ""}
                        >
                          {worker.is_available ? "Available" : "Unavailable"}
                        </Badge>
                        
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditDialog(worker)}
                                className="hover:bg-primary/10 hover:border-primary/50 transition-all"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Edit Worker Profile</DialogTitle>
                                <DialogDescription>
                                  Update worker information and availability status
                                </DialogDescription>
                              </DialogHeader>
                              <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="edit_full_name">Full Name</Label>
                                  <Input
                                    id="edit_full_name"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    required
                                    className="h-11"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit_email">Email</Label>
                                  <Input
                                    id="edit_email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    className="h-11"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit_phone">Phone Number</Label>
                                  <Input
                                    id="edit_phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+91 98765 43210"
                                    className="h-11"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit_specialty">Specialty</Label>
                                  <Input
                                    id="edit_specialty"
                                    value={formData.specialty}
                                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                                    placeholder="e.g., Electrician, Plumber, Road Maintenance"
                                    className="h-11"
                                  />
                                </div>
                                <div className="flex items-center space-x-2 p-4 rounded-lg bg-muted/50">
                                  <Switch
                                    id="edit_is_available"
                                    checked={formData.is_available}
                                    onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                                  />
                                  <Label htmlFor="edit_is_available" className="font-medium">
                                    Available for assignments
                                  </Label>
                                </div>
                                <DialogFooter>
                                  <Button type="button" variant="outline" onClick={resetForm}>
                                    Cancel
                                  </Button>
                                  <Button type="submit" className="bg-gradient-to-r from-primary to-chart-1">
                                    Update Worker
                                  </Button>
                                </DialogFooter>
                              </form>
                            </DialogContent>
                          </Dialog>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(worker)}
                            className="hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span>Registered {formatDate(worker.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${worker.is_available ? 'bg-chart-2' : 'bg-muted-foreground'}`} />
                        <span>{worker.is_available ? 'Ready for assignments' : 'Currently unavailable'}</span>
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

export default Workers;