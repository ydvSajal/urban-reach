import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-que  // Handle role switching for existing sessions
  const handleRoleSwitch = (newRole: UserRole) => {
    setTabSpecificRole(newRole as UserRole);
    sessionManager.setTabRole(newRole);
    // Remove role from URL and redirect to appropriate dashboard
    const newUrl = window.location.href.split('?')[0];
    window.history.replaceState({}, '', newUrl);
    window.location.hash = getDefaultRoute(newRole);
  };

  // Check if we need to show role switcher
  const requestedRole = getRequestedRoleFromURL();
  const showRoleSwitcher = user && userProfile && requestedRole && requestedRole !== effectiveRole;ort { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect, Suspense, lazy } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import CitizenLayout from "./components/CitizenLayout";
import WorkerLayout from "./components/WorkerLayout";
import { NotificationProvider } from "./components/NotificationProvider";
import MobilePerformanceMonitor from "./components/MobilePerformanceMonitor";
import PageLoading from "./components/PageLoading";
import RoleSwitcher from "./components/RoleSwitcher";
import { sessionManager } from "@/lib/session-manager";
import { cleanupRealtimeSubscriptions } from "@/hooks/useRealtimeSubscription";
import { initializeCleanupSystem } from "@/lib/cleanup-utils";

// Lazy load page components for code splitting
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Reports = lazy(() => import("./pages/Reports"));
const ReportDetail = lazy(() => import("./pages/ReportDetail"));
const Workers = lazy(() => import("./pages/Workers"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Maps = lazy(() => import("./pages/Maps"));
const CitizenDashboard = lazy(() => import("./pages/CitizenDashboard"));
const WorkerDashboard = lazy(() => import("./pages/WorkerDashboard"));
const WorkerAssignments = lazy(() => import("./pages/WorkerAssignments"));
const WorkerTaskDetail = lazy(() => import("./pages/WorkerTaskDetail"));
const WorkerReports = lazy(() => import("./pages/WorkerReports"));
const SubmitReport = lazy(() => import("./pages/SubmitReport"));
const MyReports = lazy(() => import("./pages/MyReports"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const Index = lazy(() => import("./pages/Index"));
const MultiRoleGuide = lazy(() => import("./pages/MultiRoleGuide"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

type UserRole = 'admin' | 'worker' | 'citizen' | '';

interface UserProfile {
  role: UserRole;
  council_id: string | null;
  full_name: string | null;
}

const LAST_ROLE_KEY = "last_known_role"; // Use session manager for this

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [profileResolved, setProfileResolved] = useState(false);
  const [tabSpecificRole, setTabSpecificRole] = useState<UserRole | null>(null);

  // Use session-specific storage helpers
  const getLastKnownRole = (): UserRole => {
    try {
      return (sessionManager.getGlobalItem(LAST_ROLE_KEY) as UserRole) || 'citizen';
    } catch {
      return 'citizen';
    }
  };

  const setLastKnownRole = (role: UserRole) => {
    try {
      sessionManager.setGlobalItem(LAST_ROLE_KEY, role);
    } catch {
      console.warn('Failed to save last known role');
    }
  };

  // Initialize tab-specific role from URL or session
  useEffect(() => {
    const initTabRole = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlRole = urlParams.get('role') as UserRole;
      const savedTabRole = sessionManager.getTabRole() as UserRole;
      
      if (urlRole && ['admin', 'worker', 'citizen'].includes(urlRole)) {
        setTabSpecificRole(urlRole);
        sessionManager.setTabRole(urlRole);
      } else if (savedTabRole) {
        setTabSpecificRole(savedTabRole);
      }
    };
    
    initTabRole();
  }, []);

  // Add cleanup on app unmount
  useEffect(() => {
    // Initialize cleanup system
    const masterCleanup = initializeCleanupSystem();

    return () => {
      // Cleanup subscriptions
      cleanupRealtimeSubscriptions();
      // Cleanup session storage
      sessionManager.cleanup();
      // Run master cleanup
      masterCleanup();
    };
  }, []);

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
        // Only fetch profile if we don't already have it or if it's a different user
        if (!userProfile || userProfile === null) {
          // Fetch profile with reduced timeout to improve loading experience
          const timeoutPromise = new Promise<undefined>((resolve) => {
            setTimeout(() => resolve(undefined), 3000);
          });

          const profile = await Promise.race([
            fetchUserProfile(session.user.id),
            timeoutPromise,
          ]);

          if (profile === undefined) {
            // Use last known role to avoid blocking user
            const lastRole = getLastKnownRole();
            setUserProfile({ role: lastRole, council_id: null, full_name: null });
            setProfileResolved(true);
          } else {
            setUserProfile(profile);
            setProfileResolved(true);
            if (profile && profile.role) {
              setLastKnownRole(profile.role);
            }
          }
        } else {
          // Profile already exists, just mark as resolved
          setProfileResolved(true);
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

  // Determine effective role with tab-specific override
  const determineEffectiveRole = (): UserRole => {
    // If tab has a specific role set, use it (but verify user has permission)
    if (tabSpecificRole && user && userProfile) {
      // In a real app, you'd verify the user has permission for this role
      // For now, we'll allow the override if they're logged in
      return tabSpecificRole;
    }
    
    // Otherwise use the user's actual profile role
    if (user && userProfile) {
      return userProfile.role;
    }
    
    // For non-authenticated users, use tab role or default
    return tabSpecificRole || getLastKnownRole();
  };

  const effectiveRole = determineEffectiveRole();

  // Auth success handler
  const handleAuthSuccess = (userType?: string) => {
    try {
      // Set tab role based on auth type
      if (userType && ['admin', 'worker', 'citizen'].includes(userType)) {
        setTabSpecificRole(userType as UserRole);
        sessionManager.setTabRole(userType);
      }
      sessionManager.removeItem(LAST_ROLE_KEY);
    } catch {}
  };

  // Handle role switching for existing sessions
  const handleRoleSwitch = (newRole: UserRole) => {
    setTabSpecificRole(newRole);
    sessionManager.setTabRole(newRole);
    // Remove role from URL and redirect to appropriate dashboard
    const newUrl = window.location.href.split('?')[0];
    window.history.replaceState({}, '', newUrl);
    window.location.hash = getDefaultRoute(newRole);
  };

  // Only show loading screen for first-time users without any profile data
  if (user && !profileResolved && !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Setting up your account...</p>
        </div>
      </div>
    );
  }

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

  // Show role switcher if needed
  if (showRoleSwitcher && requestedRole) {
    return (
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <RoleSwitcher
              currentRole={effectiveRole}
              requestedRole={requestedRole}
              userProfile={userProfile}
              onRoleSwitch={handleRoleSwitch}
            />
          </TooltipProvider>
        </QueryClientProvider>
      </ErrorBoundary>
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
              <Suspense fallback={<PageLoading />}>
                <Routes>
                  {/* Public Routes */}
                  <Route 
                    path="/" 
                    element={user ? <Navigate to={getDefaultRoute(effectiveRole)} replace /> : <MultiRoleGuide />} 
                  />
                  <Route 
                    path="/guide" 
                    element={<MultiRoleGuide />} 
                  />
                  <Route 
                    path="/index" 
                    element={<Index />} 
                  />
                  
                  {/* Auth Routes - Clear localStorage on successful auth */}
                  <Route 
                    path="/auth/admin" 
                    element={!user ? <Auth userType="admin" onSuccess={() => handleAuthSuccess('admin')} /> : <Navigate to="/dashboard" replace />} 
                  />
                  <Route 
                    path="/auth/worker" 
                    element={!user ? <Auth userType="worker" onSuccess={() => handleAuthSuccess('worker')} /> : <Navigate to="/worker-dashboard" replace />} 
                  />
                  <Route 
                    path="/auth/citizen" 
                    element={!user ? <Auth userType="citizen" onSuccess={() => handleAuthSuccess('citizen')} /> : <Navigate to="/citizen-dashboard" replace />} 
                  />
                  <Route 
                    path="/auth" 
                    element={!user ? <Auth userType="citizen" onSuccess={() => handleAuthSuccess('citizen')} /> : <Navigate to={getDefaultRoute(effectiveRole)} replace />} 
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
              </Suspense>
            </HashRouter>
          </NotificationProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;