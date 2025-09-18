import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, FileText, Settings, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-16 sm:py-24 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-6">
              <Building2 className="h-12 w-12 text-primary mr-3" />
              <h1 className="text-4xl sm:text-6xl font-bold text-foreground">
                Municipal Portal
              </h1>
            </div>
            <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Streamlined municipal services for citizens, workers, and administrators. 
              Report issues, track progress, and manage municipal operations efficiently.
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-card/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
            Choose Your Portal
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Citizen Portal */}
            <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-2">
                  <Users className="h-8 w-8 text-primary" />
                  <Badge className="bg-blue-100 text-blue-800">Citizens</Badge>
                </div>
                <CardTitle className="text-xl">Citizen Services</CardTitle>
                <CardDescription>
                  Report municipal issues, track requests, and access city services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                  <li>• Submit service requests</li>
                  <li>• Track report status</li>
                  <li>• Upload photos and evidence</li>
                  <li>• Get real-time updates</li>
                </ul>
                <Link to="/auth/citizen" className="block">
                  <Button className="w-full group-hover:bg-primary/90">
                    Access Citizen Portal
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Worker Portal */}
            <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-2">
                  <FileText className="h-8 w-8 text-primary" />
                  <Badge className="bg-green-100 text-green-800">Workers</Badge>
                </div>
                <CardTitle className="text-xl">Field Operations</CardTitle>
                <CardDescription>
                  Manage assigned tasks, update work status, and navigate to locations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                  <li>• View assigned tasks</li>
                  <li>• Update work progress</li>
                  <li>• Navigate to locations</li>
                  <li>• Upload completion photos</li>
                </ul>
                <Link to="/auth/worker" className="block">
                  <Button variant="outline" className="w-full group-hover:bg-accent">
                    Access Worker Portal
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Admin Portal */}
            <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-2">
                  <Settings className="h-8 w-8 text-primary" />
                  <Badge className="bg-purple-100 text-purple-800">Admins</Badge>
                </div>
                <CardTitle className="text-xl">Administration</CardTitle>
                <CardDescription>
                  Comprehensive municipal management and oversight tools
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                  <li>• Manage all reports</li>
                  <li>• Assign workers</li>
                  <li>• Generate analytics</li>
                  <li>• System administration</li>
                </ul>
                <Link to="/auth/admin" className="block">
                  <Button variant="secondary" className="w-full group-hover:bg-secondary/80">
                    Access Admin Portal
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 border-t bg-card/30">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground">
            © 2024 Municipal Portal. Streamlining city services for everyone.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;