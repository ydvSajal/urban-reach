import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import Layout from "./components/Layout";
import CitizenLayout from "./components/CitizenLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import ReportDetail from "./pages/ReportDetail";
import Workers from "./pages/Workers";
import Analytics from "./pages/Analytics";
import CitizenDashboard from "./pages/CitizenDashboard";
import SubmitReport from "./pages/SubmitReport";
import MyReports from "./pages/MyReports";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async (userId: string, email: string) => {
      // Special handling for dev admin
      if (email === "sajalkumar1765@gmail.com") {
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
        // Set role immediately for dev admin
        if (session.user.email === "sajalkumar1765@gmail.com") {
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

    // Get initial session AFTER listener is set
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        if (session.user.email === "sajalkumar1765@gmail.com") {
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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={user ? (userRole === "admin" ? <Navigate to="/dashboard" /> : <Navigate to="/citizen-dashboard" />) : <Index />} />
            <Route path="/auth" element={!user ? <Auth /> : (userRole === "admin" ? <Navigate to="/dashboard" /> : <Navigate to="/citizen-dashboard" />)} />
            
            {/* Admin Routes */}
            {user && userRole === "admin" && (
              <>
                <Route path="/dashboard" element={<Layout userRole={userRole}><Dashboard /></Layout>} />
                <Route path="/reports" element={<Layout userRole={userRole}><Reports /></Layout>} />
                <Route path="/reports/:id" element={<Layout userRole={userRole}><ReportDetail /></Layout>} />
                <Route path="/workers" element={<Layout userRole={userRole}><Workers /></Layout>} />
                <Route path="/analytics" element={<Layout userRole={userRole}><Analytics /></Layout>} />
              </>
            )}
            
            {/* Citizen Routes */}
            {user && (userRole === "citizen" || userRole === "admin") && (
              <>
                <Route path="/citizen-dashboard" element={<CitizenLayout><CitizenDashboard /></CitizenLayout>} />
                <Route path="/submit-report" element={<CitizenLayout><SubmitReport /></CitizenLayout>} />
                <Route path="/my-reports" element={<CitizenLayout><MyReports /></CitizenLayout>} />
                <Route path="/reports/:id" element={<CitizenLayout><ReportDetail /></CitizenLayout>} />
              </>
            )}
            
            {/* Redirect unauthenticated users */}
            {!user && (
              <Route path="*" element={<Navigate to="/auth" />} />
            )}
            
            {/* 404 fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
