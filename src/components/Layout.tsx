import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  Building2, 
  LayoutDashboard, 
  FileText, 
  Users, 
  BarChart3, 
  Bell,
  MapPin,
  LogOut,
  Menu
} from "lucide-react";
import NotificationCenter from "./NotificationCenter";
import { NotificationPermissionPrompt, NotificationStatusIndicator } from "./NotificationProvider";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";

interface LayoutProps {
  children: ReactNode;
  userRole: string;
}

const Layout = ({ children, userRole }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
    });
  }, []);
  const isDev = userEmail === "sajalkumar1765@gmail.com";

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Signed out successfully",
        description: "You have been logged out.",
      });
      
      navigate("/auth");
    } catch (error: unknown) {
      toast({
        title: "Error signing out",
        description: (error as Error)?.message || "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Reports", href: "/reports", icon: FileText },
    { name: "Workers", href: "/workers", icon: Users },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Maps", href: "/maps", icon: MapPin },
    { name: "Notifications", href: "/notifications", icon: Bell },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center gap-2">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">Municipal Portal</h1>
            <p className="text-sm text-muted-foreground capitalize">{userRole} Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationStatusIndicator />
          <NotificationCenter />
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t">
        <Button
          variant="outline"
          className="w-full"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="fixed top-4 left-4 z-50 md:hidden"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-64 md:flex-col">
        <div className="flex-1 flex flex-col min-h-0 border-r bg-card">
          <SidebarContent />
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64">
        <main className="flex-1">
          <div className="p-6">
            <NotificationPermissionPrompt />
          </div>
          {children}
        </main>
      </div>

      {isDev && (
        <Button
          variant="secondary"
          size="sm"
          className="fixed bottom-4 right-4 z-50"
          onClick={() => navigate("/citizen-dashboard")}
          aria-label="Switch to Citizen View (Dev Only)"
        >
          Dev: Citizen View
        </Button>
      )}
    </div>
  );
};

export default Layout;