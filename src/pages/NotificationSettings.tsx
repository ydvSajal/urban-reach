import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell, 
  BellRing, 
  Mail, 
  Smartphone, 
  MessageSquare,
  Settings,
  Check,
  X,
  Info,
  TestTube
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  getNotificationPreferences, 
  updateNotificationPreferences,
  type NotificationPreferences 
} from '@/lib/notifications';
import { 
  useNotifications,
  NotificationPermissionPrompt 
} from '@/components/NotificationProvider';
import { browserNotificationService } from '@/lib/browser-notifications';

const NotificationSettings: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  const { permissionState, requestPermission, isEnabled } = useNotifications();

  useEffect(() => {
    const loadUserAndPreferences = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setUserId(user.id);
        const userPreferences = await getNotificationPreferences(user.id);
        setPreferences(userPreferences);
      } catch (error) {
        console.error('Error loading notification preferences:', error);
        toast({
          title: "Error loading preferences",
          description: "Failed to load your notification settings",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadUserAndPreferences();
  }, []);

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => prev ? { ...prev, [key]: value } : {
      email_status_changes: key === 'email_status_changes' ? value : true,
      email_assignments: key === 'email_assignments' ? value : true,
      email_new_reports: key === 'email_new_reports' ? value : false,
      push_status_changes: key === 'push_status_changes' ? value : true,
      push_assignments: key === 'push_assignments' ? value : true,
      push_new_reports: key === 'push_new_reports' ? value : false,
      sms_urgent_only: key === 'sms_urgent_only' ? value : false,
    });
  };

  const handleSave = async () => {
    if (!userId || !preferences) return;

    setSaving(true);
    try {
      await updateNotificationPreferences(userId, preferences);
      toast({
        title: "Settings saved",
        description: "Your notification preferences have been updated",
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error saving settings",
        description: "Failed to save your notification preferences",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await browserNotificationService.testNotification();
      toast({
        title: "Test notification sent",
        description: "Check if you received the browser notification",
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: "Test failed",
        description: "Failed to send test notification",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-64"></div>
          <div className="h-64 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground">
          Manage how you receive notifications about reports and system updates
        </p>
      </div>

      <NotificationPermissionPrompt />

      {/* Browser Notification Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Browser Notifications
          </CardTitle>
          <CardDescription>
            Real-time notifications in your browser
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                permissionState.permission === 'granted' ? 'bg-green-500' : 
                permissionState.permission === 'denied' ? 'bg-red-500' : 'bg-yellow-500'
              }`} />
              <div>
                <p className="font-medium">
                  Status: {permissionState.permission === 'granted' ? 'Enabled' : 
                          permissionState.permission === 'denied' ? 'Blocked' : 'Not Enabled'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {permissionState.permission === 'granted' && 'You will receive browser notifications'}
                  {permissionState.permission === 'denied' && 'Notifications are blocked in your browser'}
                  {permissionState.permission === 'default' && 'Click to enable browser notifications'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {permissionState.permission === 'granted' && (
                <Button variant="outline" size="sm" onClick={handleTestNotification}>
                  <TestTube className="h-4 w-4 mr-2" />
                  Test
                </Button>
              )}
              {permissionState.permission !== 'granted' && (
                <Button onClick={requestPermission}>
                  <Bell className="h-4 w-4 mr-2" />
                  Enable
                </Button>
              )}
            </div>
          </div>

          {permissionState.permission === 'denied' && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                To enable browser notifications, please allow notifications for this site in your browser settings.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Receive updates via email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-status">Status Changes</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when your report status changes
                </p>
              </div>
              <Switch
                id="email-status"
                checked={preferences?.email_status_changes ?? true}
                onCheckedChange={(value) => handlePreferenceChange('email_status_changes', value)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-assignments">Work Assignments</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when you're assigned to work on reports
                </p>
              </div>
              <Switch
                id="email-assignments"
                checked={preferences?.email_assignments ?? true}
                onCheckedChange={(value) => handlePreferenceChange('email_assignments', value)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-new-reports">New Reports</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about new reports in your area (admins only)
                </p>
              </div>
              <Switch
                id="email-new-reports"
                checked={preferences?.email_new_reports ?? false}
                onCheckedChange={(value) => handlePreferenceChange('email_new_reports', value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Real-time browser notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-status">Status Changes</Label>
                <p className="text-sm text-muted-foreground">
                  Instant notifications for status updates
                </p>
              </div>
              <Switch
                id="push-status"
                checked={preferences?.push_status_changes ?? true}
                onCheckedChange={(value) => handlePreferenceChange('push_status_changes', value)}
                disabled={!isEnabled}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-assignments">Work Assignments</Label>
                <p className="text-sm text-muted-foreground">
                  Instant notifications for new assignments
                </p>
              </div>
              <Switch
                id="push-assignments"
                checked={preferences?.push_assignments ?? true}
                onCheckedChange={(value) => handlePreferenceChange('push_assignments', value)}
                disabled={!isEnabled}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-new-reports">New Reports</Label>
                <p className="text-sm text-muted-foreground">
                  Instant notifications for new reports (admins only)
                </p>
              </div>
              <Switch
                id="push-new-reports"
                checked={preferences?.push_new_reports ?? false}
                onCheckedChange={(value) => handlePreferenceChange('push_new_reports', value)}
                disabled={!isEnabled}
              />
            </div>
          </div>

          {!isEnabled && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Enable browser notifications above to configure push notification preferences.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* SMS Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            SMS Notifications
          </CardTitle>
          <CardDescription>
            Text message notifications for urgent updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sms-urgent">Urgent Only</Label>
              <p className="text-sm text-muted-foreground">
                Receive SMS only for high-priority or urgent notifications
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Coming Soon</Badge>
              <Switch
                id="sms-urgent"
                checked={preferences?.sms_urgent_only ?? false}
                onCheckedChange={(value) => handlePreferenceChange('sms_urgent_only', value)}
                disabled={true}
              />
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              SMS notifications are not yet available. This feature will be added in a future update.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Changes are saved automatically when you modify settings
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Settings className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default NotificationSettings;