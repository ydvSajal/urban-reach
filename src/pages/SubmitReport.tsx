import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Loader2, MapPin, FileText } from "lucide-react";

const SubmitReport = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "" as Database['public']['Enums']['report_category'] | "",
    location: "",
    landmark: "",
    priority: "medium" as Database['public']['Enums']['priority_level'],
  });

  const categories = [
    { value: "roads", label: "Road Maintenance" },
    { value: "water_supply", label: "Water Supply" },
    { value: "sanitation", label: "Sewerage & Sanitation" },
    { value: "street_lights", label: "Street Lighting" },
    { value: "waste_management", label: "Waste Management" },
    { value: "public_safety", label: "Public Safety" },
    { value: "parks", label: "Parks & Recreation" },
    { value: "drainage", label: "Drainage" },
    { value: "electricity", label: "Electricity" },
    { value: "other", label: "Other" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!formData.category) {
        toast({
          title: "Category required",
          description: "Please select a category for your report",
          variant: "destructive",
        });
        return;
      }

      // Get user's council_id from profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("council_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      // If no profile exists, create one for the user
      if (!profileData) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const { error: createProfileError } = await supabase
          .from("profiles")
          .insert({
            user_id: authUser.id,
            email: authUser.email || "",
            full_name: authUser.user_metadata?.full_name || "",
            role: "citizen",
            council_id: null
          });

        if (createProfileError) {
          console.error("Error creating profile:", createProfileError);
        }
      }

      const { data, error } = await supabase
        .from("reports")
        .insert({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          location_address: formData.location,
          priority: formData.priority,
          citizen_id: user.id,
          council_id: profileData?.council_id || "00000000-0000-0000-0000-000000000000", // Default council if none
          status: "pending",
          report_number: "", // Will be set by database trigger
        })
        .select()
        .maybeSingle();

      if (error) throw error;

      toast({
        title: "Report submitted successfully!",
        description: `Your report #${data.report_number} has been submitted and is being reviewed.`,
      });

      navigate("/citizen-dashboard");
    } catch (error: any) {
      console.error("Error submitting report:", error);
      toast({
        title: "Error submitting report",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Submit New Report</h1>
        <p className="text-muted-foreground">
          Report issues in your area for municipal action
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report Details
          </CardTitle>
          <CardDescription>
            Please provide detailed information about the issue you're reporting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Issue Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief description of the issue"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value: Database['public']['Enums']['report_category']) => setFormData({ ...formData, category: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select issue category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Detailed Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide a detailed description of the issue, including when you noticed it and how it affects you or the community"
                className="min-h-[120px]"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location Address *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Street address or area name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="landmark">Nearby Landmark</Label>
                <Input
                  id="landmark"
                  value={formData.landmark}
                  onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                  placeholder="Hospital, school, market, etc."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority Level</Label>
            <Select 
              value={formData.priority} 
              onValueChange={(value: Database['public']['Enums']['priority_level']) => setFormData({ ...formData, priority: value })}
            >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Minor inconvenience</SelectItem>
                  <SelectItem value="medium">Medium - Moderate impact</SelectItem>
                  <SelectItem value="high">High - Urgent attention needed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Report
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate("/citizen-dashboard")}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-muted rounded-lg">
        <h3 className="font-medium mb-2 flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Location Tips
        </h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Be as specific as possible with the location</li>
          <li>• Include nearby landmarks to help locate the issue</li>
          <li>• You can mention the ward or zone if known</li>
        </ul>
      </div>
    </div>
  );
};

export default SubmitReport;