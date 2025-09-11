import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, FileText, BarChart3, Shield, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <Building2 className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Municipal Portal
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Streamline your municipal operations with our comprehensive administrative platform.
            Manage reports, track progress, and engage with citizens efficiently.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/dashboard">
              <Button size="lg" className="font-semibold">
                <Shield className="mr-2 h-4 w-4" />
                Admin Dashboard
              </Button>
            </Link>
            <Link to="/citizen-dashboard">
              <Button variant="outline" size="lg">
                <UserCheck className="mr-2 h-4 w-4" />
                Citizen Portal
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <Card>
            <CardHeader>
              <Users className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Citizen Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Efficiently handle citizen reports and communication through our streamlined portal.
              </CardDescription>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <FileText className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Report Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Monitor and manage municipal issues from submission to resolution with real-time updates.
              </CardDescription>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <BarChart3 className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Analytics Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Get insights into municipal operations with comprehensive data visualization and reporting.
              </CardDescription>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <Building2 className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Municipal Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Coordinate workers, manage resources, and oversee municipal operations efficiently.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
