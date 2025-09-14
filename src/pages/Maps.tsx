import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ReportsMap from "@/components/ReportsMap";
import { MapPin } from "lucide-react";

const Maps = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MapPin className="h-8 w-8" />
            Reports Map
          </h1>
          <p className="text-muted-foreground">
            Interactive map showing all reported issues with filtering and clustering
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Interactive Reports Map</CardTitle>
          <CardDescription>
            View all reports on an interactive map. Use filters to narrow down by status, category, or priority. 
            Click on markers for detailed information and quick actions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReportsMap height="600px" />
        </CardContent>
      </Card>
    </div>
  );
};

export default Maps;