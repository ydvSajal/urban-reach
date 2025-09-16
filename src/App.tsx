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

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async (userId: string, email: string) => {
      // Check if it's a Bennett email or specific admin email for testing
      if (email === "sajalkumar1765@gmail.com" || email?.includes("@bennett.edu.in")) {
        setUserRole("admin");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", userId)
        .single();
      setUserRole(profile?.role || "citizen");
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        if (session.user.email === "sajalkumar1765@gmail.com" || session.user.email?.includes("@bennett.edu.in")) {
          setUserRole("admin");
          setLoading(false);
        } else {
          setTimeout(() => {
            fetchRole(session.user.id, session.user.email || "").finally(() => setLoading(false));
          }, 0);
        }
      } else {
        setUserRole("");
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        if (session.user.email === "sajalkumar1765@gmail.com" || session.user.email?.includes("@bennett.edu.in")) {
          setUserRole("admin");
          setLoading(false);
        } else {
          fetchRole(session.user.id, session.user.email || "").finally(() => setLoading(false));
        }
      } else {
        setUserRole("");
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
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
            <BrowserRouter>
              <Routes>
                <Route path="/" element={user ? (
                  userRole === "admin" ? <Navigate to="/dashboard" /> :
                  userRole === "worker" ? <Navigate to="/worker-dashboard" /> :
                  <Navigate to="/citizen-dashboard" />
                ) : <Index />} />
                <Route path="/auth" element={!user ? <Auth userType="citizen" onSuccess={() => window.location.href = '/'} /> : (
                  userRole === "admin" ? <Navigate to="/dashboard" /> :
                  userRole === "worker" ? <Navigate to="/worker-dashboard" /> :
                  <Navigate to="/citizen-dashboard" />
                )} />

                {/* Admin Routes */}
                {user && (userRole === "admin" || (session?.user?.email === "sajalkumar1765@gmail.com") || (session?.user?.email?.includes("@bennett.edu.in"))) && (
                  <Route path="/dashboard" element={<Layout userRole={userRole}><Dashboard /></Layout>} />
                )}
                {user && (userRole === "admin" || (session?.user?.email === "sajalkumar1765@gmail.com") || (session?.user?.email?.includes("@bennett.edu.in"))) && (
                  <Route path="/reports" element={<Layout userRole={userRole}><Reports /></Layout>} />
                )}
                {user && (userRole === "admin" || (session?.user?.email === "sajalkumar1765@gmail.com") || (session?.user?.email?.includes("@bennett.edu.in"))) && (
                  <Route path="/reports/:id" element={<Layout userRole={userRole}><ReportDetail /></Layout>} />
                )}
                {user && (userRole === "admin" || (session?.user?.email === "sajalkumar1765@gmail.com") || (session?.user?.email?.includes("@bennett.edu.in"))) && (
                  <Route path="/workers" element={<Layout userRole={userRole}><Workers /></Layout>} />
                )}
                {user && (userRole === "admin" || (session?.user?.email === "sajalkumar1765@gmail.com") || (session?.user?.email?.includes("@bennett.edu.in"))) && (
                  <Route path="/analytics" element={<Layout userRole={userRole}><Analytics /></Layout>} />
                )}
                {user && (userRole === "admin" || (session?.user?.email === "sajalkumar1765@gmail.com") || (session?.user?.email?.includes("@bennett.edu.in"))) && (
                  <Route path="/maps" element={<Layout userRole={userRole}><Maps /></Layout>} />
                )}
                {user && (userRole === "admin" || (session?.user?.email === "sajalkumar1765@gmail.com") || (session?.user?.email?.includes("@bennett.edu.in"))) && (
                  <Route path="/notifications" element={<Layout userRole={userRole}><NotificationSettings /></Layout>} />
                )}

                {/* Worker Routes */}
                {user && (userRole === "worker" || (session?.user?.email === "sajalkumar1765@gmail.com")) && (
                  <Route path="/worker-dashboard" element={<Layout userRole={userRole}><WorkerDashboard /></Layout>} />
                )}
                {user && (userRole === "worker" || (session?.user?.email === "sajalkumar1765@gmail.com")) && (
                  <Route path="/reports/:id" element={<Layout userRole={userRole}><ReportDetail /></Layout>} />
                )}
                {user && (userRole === "worker" || (session?.user?.email === "sajalkumar1765@gmail.com")) && (
                  <Route path="/notifications" element={<Layout userRole={userRole}><NotificationSettings /></Layout>} />
                )}

                {/* Citizen Routes */}
                {user && ((userRole === "citizen" || userRole === "" || (session?.user?.email === "sajalkumar1765@gmail.com"))) && (
                  <Route path="/citizen-dashboard" element={<CitizenLayout><CitizenDashboard /></CitizenLayout>} />
                )}
                {user && ((userRole === "citizen" || userRole === "" || (session?.user?.email === "sajalkumar1765@gmail.com"))) && (
                  <Route path="/submit-report" element={<CitizenLayout><SubmitReport /></CitizenLayout>} />
                )}
                {user && ((userRole === "citizen" || userRole === "" || (session?.user?.email === "sajalkumar1765@gmail.com"))) && (
                  <Route path="/my-reports" element={<CitizenLayout><MyReports /></CitizenLayout>} />
                )}
                {user && ((userRole === "citizen" || userRole === "" || (session?.user?.email === "sajalkumar1765@gmail.com"))) && (
                  <Route path="/reports/:id" element={<CitizenLayout><ReportDetail /></CitizenLayout>} />
                )}
                {user && ((userRole === "citizen" || userRole === "" || (session?.user?.email === "sajalkumar1765@gmail.com"))) && (
                  <Route path="/notifications" element={<CitizenLayout><NotificationSettings /></CitizenLayout>} />
                )}

                {/* Auth routes */}
                <Route 
                  path="/auth/admin" 
                  element={
                    <Auth 
                      userType="admin" 
                      onSuccess={() => window.location.href = '/dashboard'} 
                    />
                  } 
                />
                <Route 
                  path="/auth/worker" 
                  element={
                    <Auth 
                      userType="worker" 
                      onSuccess={() => window.location.href = '/worker-dashboard'} 
                    />
                  } 
                />
                <Route 
                  path="/auth/citizen" 
                  element={
                    <Auth 
                      userType="citizen" 
                      onSuccess={() => window.location.href = '/citizen-dashboard'} 
                    />
                  } 
                />
                <Route path="/auth" element={<Auth userType="citizen" onSuccess={() => window.location.href = '/'} />} />

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
