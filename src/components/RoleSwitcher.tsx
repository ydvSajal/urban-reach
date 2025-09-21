import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, UserCheck, Shield, UserCog, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface RoleSwitcherProps {
  currentRole: string;
  requestedRole: string;
  userProfile: any;
  onRoleSwitch: (role: string) => void;
}

const RoleSwitcher: React.FC<RoleSwitcherProps> = ({
  currentRole,
  requestedRole,
  userProfile,
  onRoleSwitch,
}) => {
  const roleIcons = {
    admin: Shield,
    worker: UserCog,
    citizen: User,
  };

  const roleLabels = {
    admin: 'Administrator',
    worker: 'Worker',
    citizen: 'Citizen',
  };

  const roleColors = {
    admin: 'destructive',
    worker: 'secondary',
    citizen: 'default',
  } as const;

  const CurrentIcon = roleIcons[currentRole as keyof typeof roleIcons] || User;
  const RequestedIcon = roleIcons[requestedRole as keyof typeof roleIcons] || User;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <UserCheck className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle>Role Switch Required</CardTitle>
          <CardDescription>
            You're already logged in with a different role. Choose how to proceed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Role */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <CurrentIcon className="h-5 w-5" />
              <div>
                <div className="font-medium">Current Role</div>
                <div className="text-sm text-muted-foreground">{userProfile?.full_name || 'User'}</div>
              </div>
            </div>
            <Badge variant={roleColors[currentRole as keyof typeof roleColors]}>
              {roleLabels[currentRole as keyof typeof roleLabels]}
            </Badge>
          </div>

          {/* Requested Role */}
          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <RequestedIcon className="h-5 w-5" />
              <div>
                <div className="font-medium">Requested Role</div>
                <div className="text-sm text-muted-foreground">Switch to this role in this tab</div>
              </div>
            </div>
            <Badge variant={roleColors[requestedRole as keyof typeof roleColors]}>
              {roleLabels[requestedRole as keyof typeof roleLabels]}
            </Badge>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={() => onRoleSwitch(requestedRole)} 
              className="w-full"
            >
              <RequestedIcon className="mr-2 h-4 w-4" />
              Switch to {roleLabels[requestedRole as keyof typeof roleLabels]} (This Tab Only)
            </Button>
            
            <Button 
              onClick={() => onRoleSwitch(currentRole)} 
              variant="outline" 
              className="w-full"
            >
              <CurrentIcon className="mr-2 h-4 w-4" />
              Keep Current Role ({roleLabels[currentRole as keyof typeof roleLabels]})
            </Button>
            
            <Button 
              onClick={handleSignOut} 
              variant="destructive" 
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out & Login as {roleLabels[requestedRole as keyof typeof roleLabels]}
            </Button>
          </div>

          {/* Info Note */}
          <div className="text-xs text-muted-foreground text-center p-3 bg-muted rounded-lg">
            <strong>Note:</strong> Role switching only affects this browser tab. Other tabs will keep their current roles.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleSwitcher;