import ReportsMap from "@/components/ReportsMap";
import { MapPin } from "lucide-react";

const Maps = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg">
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Interactive Map</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Explore complaints across India with multiple map views
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Full-screen Map */}
      <div className="container mx-auto px-6 py-6">
        <ReportsMap height="calc(100vh - 200px)" />
      </div>
    </div>
  );
};

export default Maps;