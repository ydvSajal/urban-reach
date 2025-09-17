import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import CitizenLayout from "./components/CitizenLayout";
import WorkerLayout from "./components/WorkerLayout";
import { NotificationProvider } from "./components/NotificationProvider";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import ReportDetail from "./pages/ReportDetail";
import Workers from "./pages/Workers";
import Analytics from "./pages/Analytics";
import Maps from "./pages/Maps";
import CitizenDashboard from "./pages/CitizenDashboard";
import WorkerDashboard from "./pages/WorkerDashboard";
import WorkerAssignments from "./pages/WorkerAssignments";
import WorkerTaskDetail from "./pages/WorkerTaskDetail";
import WorkerReports from "./pages/WorkerReports";
import SubmitReport from "./pages/SubmitReport";
import MyReports from "./pages/MyReports";
import NotificationSettings from "./pages/NotificationSettings";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import MobilePerformanceMonitor from "./components/MobilePerformanceMonitor";

const queryClient = new QueryClient();

type UserRole = 'admin' | 'worker' | 'citizen' | '';

interface UserProfile {
  role: UserRole;
  council_id: string | null;
  full_name: string | null;
}

const LAST_ROLE_KEY = "ur_last_known_role";

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [profileResolved, setProfileResolved] = useState(false);

  const fetchUserProfile = async (userId: string): Promise<UserProfile | null | undefined> => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, council_id, full_name")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user profile:", error);
        return undefined; // signal fetch error
      }

      if (!profile) {
        return null; // not found
      }

      return profile as UserProfile;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return undefined; // fetch failed
    }
  };

  useEffect(() => {
    const handleAuthStateChange = async (session: Session | null) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Fetch profile with timeout to prevent hanging
        const timeoutPromise = new Promise<undefined>((resolve) => {
          setTimeout(() => resolve(undefined), 8000);
        });

        const profile = await Promise.race([
          fetchUserProfile(session.user.id),
          timeoutPromise,
        ]);

        if (profile === undefined) {
          // Keep previous profile; don't force profile-setup screen
          setProfileResolved(false);
        } else {
          setUserProfile(profile);
          setProfileResolved(true);
          if (profile && profile.role) {
            try { localStorage.setItem(LAST_ROLE_KEY, profile.role); } catch {}
          }
        }

        setLoading(false);
      } else {
        setUserProfile(undefined);
        setProfileResolved(false);
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await handleAuthStateChange(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthStateChange(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const getDefaultRoute = (role: UserRole): string => {
    switch (role) {
      case 'admin':
        return '/dashboard';
      case 'worker':
        return '/worker-dashboard';
      case 'citizen':
      default:
        return '/citizen-dashboard';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading application...</p>
        </div>
      </div>
    );
  }

  // Determine role preference using profile first, then last-known role
  const lastKnownRole = ((): UserRole => {
    try { return (localStorage.getItem(LAST_ROLE_KEY) as UserRole) || 'citizen'; } catch { return 'citizen'; }
  })();
  const effectiveRole: UserRole = (userProfile && userProfile.role) || lastKnownRole || 'citizen';

  // Only show setup screen if we positively know there is no profile
  if (user && profileResolved && userProfile === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full mx-4 text-center">
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Profile Setup Required</h2>
            <p className="text-muted-foreground mb-4">
              Your account needs to be set up. Please contact your administrator or try logging in again.
            </p>
            <button
              onClick={() => supabase.auth.signOut()}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md"
            >
              Sign Out & Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <NotificationProvider>
            <Toaster />
            <Sonner />
            <MobilePerformanceMonitor />
            <HashRouter>
              <Routes>
                {/* Public Routes */}
                <Route 
                  path="/" 
                  element={user ? <Navigate to={getDefaultRoute(effectiveRole)} replace /> : <Index />} 
                />
                
                {/* Auth Routes */}
                <Route 
                  path="/auth/admin" 
                  element={!user ? <Auth userType="admin" onSuccess={() => {}} /> : <Navigate to="/dashboard" replace />} 
                />
                <Route 
                  path="/auth/worker" 
                  element={!user ? <Auth userType="worker" onSuccess={() => {}} /> : <Navigate to="/worker-dashboard" replace />} 
                />
                <Route 
                  path="/auth/citizen" 
                  element={!user ? <Auth userType="citizen" onSuccess={() => {}} /> : <Navigate to="/citizen-dashboard" replace />} 
                />
                <Route 
                  path="/auth" 
                  element={!user ? <Auth userType="citizen" onSuccess={() => {}} /> : <Navigate to={getDefaultRoute(effectiveRole)} replace />} 
                />

                {/* Protected Routes */}
                {user && (
                  <>
                    {/* Admin Routes */}
                    {effectiveRole === 'admin' && (
                      <>
                        <Route path="/dashboard" element={<Layout userRole={effectiveRole}><Dashboard /></Layout>} />
                        <Route path="/reports" element={<Layout userRole={effectiveRole}><Reports /></Layout>} />
                        <Route path="/reports/:id" element={<Layout userRole={effectiveRole}><ReportDetail /></Layout>} />
                        <Route path="/workers" element={<Layout userRole={effectiveRole}><Workers /></Layout>} />
                        <Route path="/analytics" element={<Layout userRole={effectiveRole}><Analytics /></Layout>} />
                        <Route path="/maps" element={<Layout userRole={effectiveRole}><Maps /></Layout>} />
                        <Route path="/notifications" element={<Layout userRole={effectiveRole}><NotificationSettings /></Layout>} />
                      </>
                    )}

                    {/* Worker Routes */}
                    {effectiveRole === 'worker' && (
                      <>
                        <Route path="/worker-dashboard" element={<WorkerLayout><WorkerDashboard /></WorkerLayout>} />
                        <Route path="/worker/assignments" element={<WorkerLayout><WorkerAssignments /></WorkerLayout>} />
                        <Route path="/worker/reports" element={<WorkerLayout><WorkerReports /></WorkerLayout>} />
                        <Route path="/worker/task/:id" element={<WorkerLayout><WorkerTaskDetail /></WorkerLayout>} />
                        <Route path="/reports/:id" element={<WorkerLayout><ReportDetail /></WorkerLayout>} />
                        <Route path="/notifications" element={<WorkerLayout><NotificationSettings /></WorkerLayout>} />
                      </>
                    )}

                    {/* Citizen Routes */}
                    {effectiveRole === 'citizen' && (
                      <>
                        <Route path="/citizen-dashboard" element={<CitizenLayout><CitizenDashboard /></CitizenLayout>} />
                        <Route path="/submit-report" element={<CitizenLayout><SubmitReport /></CitizenLayout>} />
                        <Route path="/my-reports" element={<CitizenLayout><MyReports /></CitizenLayout>} />
                        <Route path="/reports/:id" element={<CitizenLayout><ReportDetail /></CitizenLayout>} />
                        <Route path="/notifications" element={<CitizenLayout><NotificationSettings /></CitizenLayout>} />
                      </>
                    )}

                    {/* Role-based redirects for unauthorized access */}
                    <Route 
                      path="/dashboard" 
                      element={effectiveRole !== 'admin' ? <Navigate to={getDefaultRoute(effectiveRole)} replace /> : null} 
                    />
                    <Route 
                      path="/worker-dashboard" 
                      element={effectiveRole !== 'worker' ? <Navigate to={getDefaultRoute(effectiveRole)} replace /> : null} 
                    />
                    <Route 
                      path="/citizen-dashboard" 
                      element={effectiveRole !== 'citizen' ? <Navigate to={getDefaultRoute(effectiveRole)} replace /> : null} 
                    />
                  </>
                )}

                {/* 404 fallback */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </HashRouter>
          </NotificationProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;