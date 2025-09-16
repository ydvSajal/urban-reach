import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Database, MapPin } from "lucide-react";

const TestDataInserter = () => {
  const [loading, setLoading] = useState(false);

  const testReports = [
    {
      title: "Pothole on Main Road",
      description: "Large pothole causing traffic issues and vehicle damage",
      category: "roads" as const,
      location_address: "Bennett University Main Gate, Greater Noida, Uttar Pradesh",
      latitude: 28.4509,
      longitude: 77.5847,
      priority: "high" as const,
      status: "pending" as const,
    },
    {
      title: "Street Light Not Working",
      description: "Street light near parking area is not functioning",
      category: "street_lights" as const,
      location_address: "Near Bennett University Parking, Greater Noida, Uttar Pradesh",
      latitude: 28.4515,
      longitude: 77.5852,
      priority: "medium" as const,
      status: "acknowledged" as const,
    },
    {
      title: "Garbage Collection Issue",
      description: "Garbage not being collected regularly in residential area",
      category: "waste_management" as const,
      location_address: "Bennett University Residential Block, Greater Noida, Uttar Pradesh",
      latitude: 28.4520,
      longitude: 77.5857,
      priority: "medium" as const,
      status: "in_progress" as const,
    },
    {
      title: "Water Supply Problem",
      description: "Low water pressure in the morning hours",
      category: "water_supply" as const,
      location_address: "Bennett University Campus, Greater Noida, Uttar Pradesh",
      latitude: 28.4525,
      longitude: 77.5862,
      priority: "low" as const,
      status: "resolved" as const,
    },
    {
      title: "Drainage Blockage",
      description: "Drainage system blocked causing water logging",
      category: "drainage" as const,
      location_address: "Near Bennett University Library, Greater Noida, Uttar Pradesh",
      latitude: 28.4530,
      longitude: 77.5867,
      priority: "high" as const,
      status: "pending" as const,
    }
  ];

  const insertTestData = async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to insert test data",
          variant: "destructive",
        });
        return;
      }

      // Get or create Bennett University council
      const BENNETT_UNIVERSITY_ID = "00000000-0000-0000-0000-000000000001";
      
      // Check if council exists, if not create it
      const { data: existingCouncil } = await supabase
        .from("councils")
        .select("id")
        .eq("id", BENNETT_UNIVERSITY_ID)
        .maybeSingle();

      if (!existingCouncil) {
        const { error: councilError } = await supabase
          .from("councils")
          .insert({
            id: BENNETT_UNIVERSITY_ID,
            name: "Bennett University",
            city: "Greater Noida",
            state: "Uttar Pradesh",
            contact_email: "admin@bennett.edu.in",
            contact_phone: "+91-120-7199300"
          });

        if (councilError) {
          console.error("Error creating council:", councilError);
        }
      }

      // Ensure user has a profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profileData) {
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            user_id: user.id,
            email: user.email || "",
            full_name: user.user_metadata?.full_name || "Test User",
            role: "citizen",
            council_id: BENNETT_UNIVERSITY_ID
          });

        if (profileError) {
          console.error("Error creating profile:", profileError);
        }
      }

      // First, check if test data already exists and clear it
      const { data: existingTestData } = await supabase
        .from("reports")
        .select("id")
        .eq("council_id", BENNETT_UNIVERSITY_ID)
        .eq("citizen_id", user.id);

      if (existingTestData && existingTestData.length > 0) {
        // Clear existing test data
        await supabase
          .from("reports")
          .delete()
          .eq("council_id", BENNETT_UNIVERSITY_ID)
          .eq("citizen_id", user.id);
      }

      // Insert test reports
      const reportsToInsert = testReports.map(report => ({
        ...report,
        citizen_id: user.id,
        council_id: BENNETT_UNIVERSITY_ID,
        report_number: '', // Will be overwritten by database trigger
      }));

      const { data, error } = await supabase
        .from("reports")
        .insert(reportsToInsert)
        .select();

      if (error) throw error;

      toast({
        title: "Test data inserted successfully!",
        description: `${data.length} test reports have been added to the database.`,
      });

    } catch (error: any) {
      console.error("Error inserting test data:", error);
      toast({
        title: "Error inserting test data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Test Data
        </CardTitle>
        <CardDescription>
          Add sample reports to test the map functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>This will add {testReports.length} sample reports with location data to help test the map functionality.</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            {testReports.map((report, index) => (
              <li key={index} className="text-xs">
                {report.title} ({report.category})
              </li>
            ))}
          </ul>
        </div>
        
        <Button 
          onClick={insertTestData} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Inserting Test Data...
            </>
          ) : (
            <>
              <MapPin className="mr-2 h-4 w-4" />
              Add Test Reports
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default TestDataInserter;
