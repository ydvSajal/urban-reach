import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import Layout from "./components/Layout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import ReportDetail from "./pages/ReportDetail";
import Workers from "./pages/Workers";
import Analytics from "./pages/Analytics";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Get user profile to determine role
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("user_id", session.user.id)
            .single();
          
          setUserRole(profile?.role || "citizen");
        } else {
          setUserRole("");
        }
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from("profiles")
          .select("role")
          .eq("user_id", session.user.id)
          .single()
          .then(({ data: profile }) => {
            setUserRole(profile?.role || "citizen");
            setLoading(false);
          });
      } else {
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
            <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Index />} />
            <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/dashboard" />} />
            
            {/* Protected Admin Routes */}
            {user && userRole === "admin" && (
              <>
                <Route path="/dashboard" element={<Layout userRole={userRole}><Dashboard /></Layout>} />
                <Route path="/reports" element={<Layout userRole={userRole}><Reports /></Layout>} />
                <Route path="/reports/:id" element={<Layout userRole={userRole}><ReportDetail /></Layout>} />
                <Route path="/workers" element={<Layout userRole={userRole}><Workers /></Layout>} />
                <Route path="/analytics" element={<Layout userRole={userRole}><Analytics /></Layout>} />
              </>
            )}
            
            {/* Redirect unauthorized users */}
            {user && userRole !== "admin" && (
              <Route path="*" element={<div className="p-6 text-center"><h1>Access Denied</h1><p>Admin access required</p></div>} />
            )}
            
            {/* Redirect unauthenticated users */}
            {!user && (
              <Route path="*" element={<Navigate to="/auth" />} />
            )}
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
