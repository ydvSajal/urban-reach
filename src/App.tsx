import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import CitizenLayout from "./components/CitizenLayout";
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

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, council_id, full_name")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error);
        return null;
      }

      return profile as UserProfile;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  };

  useEffect(() => {
    const handleAuthStateChange = async (session: Session | null) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await handleAuthStateChange(session);
    });

    // Check initial session
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const userRole = userProfile?.role || 'citizen';

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <NotificationProvider>
            <Toaster />
            <Sonner />
            <MobilePerformanceMonitor />
            <BrowserRouter>
              <Routes>
                {/* Public Routes */}
                <Route 
                  path="/" 
                  element={user ? <Navigate to={getDefaultRoute(userRole)} replace /> : <Index />} 
                />
                
                {/* Auth Routes */}
                <Route 
                  path="/auth/admin" 
                  element={!user ? <Auth userType="admin" onSuccess={() => window.location.reload()} /> : <Navigate to="/dashboard" replace />} 
                />
                <Route 
                  path="/auth/worker" 
                  element={!user ? <Auth userType="worker" onSuccess={() => window.location.reload()} /> : <Navigate to="/worker-dashboard" replace />} 
                />
                <Route 
                  path="/auth/citizen" 
                  element={!user ? <Auth userType="citizen" onSuccess={() => window.location.reload()} /> : <Navigate to="/citizen-dashboard" replace />} 
                />
                <Route 
                  path="/auth" 
                  element={!user ? <Auth userType="citizen" onSuccess={() => window.location.reload()} /> : <Navigate to={getDefaultRoute(userRole)} replace />} 
                />

                {/* Protected Routes */}
                {user && (
                  <>
                    {/* Admin Routes */}
                    {userRole === 'admin' && (
                      <>
                        <Route path="/dashboard" element={<Layout userRole={userRole}><Dashboard /></Layout>} />
                        <Route path="/reports" element={<Layout userRole={userRole}><Reports /></Layout>} />
                        <Route path="/reports/:id" element={<Layout userRole={userRole}><ReportDetail /></Layout>} />
                        <Route path="/workers" element={<Layout userRole={userRole}><Workers /></Layout>} />
                        <Route path="/analytics" element={<Layout userRole={userRole}><Analytics /></Layout>} />
                        <Route path="/maps" element={<Layout userRole={userRole}><Maps /></Layout>} />
                        <Route path="/notifications" element={<Layout userRole={userRole}><NotificationSettings /></Layout>} />
                      </>
                    )}

                    {/* Worker Routes */}
                    {userRole === 'worker' && (
                      <>
                        <Route path="/worker-dashboard" element={<Layout userRole={userRole}><WorkerDashboard /></Layout>} />
                        <Route path="/reports/:id" element={<Layout userRole={userRole}><ReportDetail /></Layout>} />
                        <Route path="/notifications" element={<Layout userRole={userRole}><NotificationSettings /></Layout>} />
                      </>
                    )}

                    {/* Citizen Routes */}
                    {userRole === 'citizen' && (
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
                      element={userRole !== 'admin' ? <Navigate to={getDefaultRoute(userRole)} replace /> : null} 
                    />
                    <Route 
                      path="/worker-dashboard" 
                      element={userRole !== 'worker' ? <Navigate to={getDefaultRoute(userRole)} replace /> : null} 
                    />
                    <Route 
                      path="/citizen-dashboard" 
                      element={userRole !== 'citizen' ? <Navigate to={getDefaultRoute(userRole)} replace /> : null} 
                    />
                  </>
                )}

                {/* 404 fallback */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </NotificationProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;