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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workers Management</h1>
          <p className="text-muted-foreground">
            Manage registered workers and their assignments. Workers can register themselves through the worker portal.
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">
            Workers can self-register at the <strong>Worker Portal</strong>
          </p>
          <p className="text-xs text-muted-foreground">
            They will appear here automatically after registration
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredWorkers.length} of {workers.length} workers
        </p>
      </div>

      {/* Workers Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <UserPlus className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {searchTerm ? "No workers found matching your criteria" : "No workers registered yet"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Workers can register through the Worker Portal
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWorkers.map((worker) => (
                    <TableRow key={worker.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{worker.full_name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3" />
                            {worker.email}
                          </div>
                          {worker.phone && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {worker.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {worker.specialty ? (
                          <Badge variant="outline">{worker.specialty}</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not specified</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={worker.is_available ? "default" : "secondary"}>
                          {worker.is_available ? "Available" : "Unavailable"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(worker.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditDialog(worker)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Worker</DialogTitle>
                                <DialogDescription>
                                  Update worker information and availability
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
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit_phone">Phone</Label>
                                  <Input
                                    id="edit_phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit_specialty">Specialty</Label>
                                  <Input
                                    id="edit_specialty"
                                    value={formData.specialty}
                                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                                    placeholder="e.g., Electrician, Plumber, Road Maintenance"
                                  />
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    id="edit_is_available"
                                    checked={formData.is_available}
                                    onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                                  />
                                  <Label htmlFor="edit_is_available">Available for assignments</Label>
                                </div>
                                <DialogFooter>
                                  <Button type="button" variant="outline" onClick={resetForm}>
                                    Cancel
                                  </Button>
                                  <Button type="submit">Update Worker</Button>
                                </DialogFooter>
                              </form>
                            </DialogContent>
                          </Dialog>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(worker)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

export default Workers;