import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  UserCog, 
  User, 
  ExternalLink, 
  Info,
  Tabs as TabsIcon
} from 'lucide-react';

const MultiRoleGuide: React.FC = () => {
  const roles = [
    {
      id: 'admin',
      name: 'Administrator',
      description: 'Manage reports, workers, and system settings',
      icon: Shield,
      color: 'destructive' as const,
      path: '/auth/admin?role=admin'
    },
    {
      id: 'worker',
      name: 'Worker',
      description: 'View and update assigned reports',
      icon: UserCog,
      color: 'secondary' as const,
      path: '/auth/worker?role=worker'
    },
    {
      id: 'citizen',
      name: 'Citizen',
      description: 'Submit and track your reports',
      icon: User,
      color: 'default' as const,
      path: '/auth/citizen?role=citizen'
    }
  ];

  const openInNewTab = (path: string) => {
    window.open(path, '_blank');
  };

  const openInCurrentTab = (path: string) => {
    window.location.href = path;
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <TabsIcon className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-2">Municipal Portal</h1>
          <p className="text-xl text-muted-foreground mb-4">
            Access different dashboards for testing and management
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Multi-Dashboard Testing</p>
                <p>
                  You can now open multiple dashboards simultaneously in different browser tabs. 
                  Each tab will maintain its own role context, allowing you to test different user types at once.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {roles.map((role) => {
            const IconComponent = role.icon;
            return (
              <Card key={role.id} className="relative">
                <CardHeader className="text-center pb-4">
                  <IconComponent className="h-12 w-12 mx-auto mb-2 text-primary" />
                  <CardTitle className="flex items-center justify-center gap-2">
                    {role.name}
                    <Badge variant={role.color}>{role.id}</Badge>
                  </CardTitle>
                  <CardDescription className="text-center">
                    {role.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    onClick={() => openInNewTab(role.path)}
                    className="w-full"
                    variant="default"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open in New Tab
                  </Button>
                  <Button 
                    onClick={() => openInCurrentTab(role.path)}
                    className="w-full"
                    variant="outline"
                  >
                    <IconComponent className="mr-2 h-4 w-4" />
                    Open in Current Tab
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="bg-muted rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-3">How Multi-Role Testing Works</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">1</span>
              <p>Click "Open in New Tab" for each role you want to test simultaneously.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">2</span>
              <p>Each tab will maintain its own role context, even when using the same login credentials.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">3</span>
              <p>If you're already logged in, you'll see a role switcher to choose the role for that specific tab.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">4</span>
              <p>Navigate between tabs to test real-time updates and cross-role functionality.</p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            For testing purposes, you can use the same login credentials for all roles.
            In production, each role would have proper permission restrictions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MultiRoleGuide;