import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Building2, Mail, AlertCircle, CheckCircle, RefreshCw, Shield, Users, UserCheck } from "lucide-react";
import { sendOTP, verifyOTP, rateLimitUtils } from "@/lib/auth-config";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

interface AuthFormProps {
  onSuccess: () => void;
  userType: 'admin' | 'citizen' | 'worker';
}

const AuthForm = ({ onSuccess, userType }: AuthFormProps) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  
  // Worker registration fields
  const [workerData, setWorkerData] = useState({
    fullName: "",
    phone: "",
    specialty: ""
  });
  
  const isOnline = useNetworkStatus();
  const cooldownInterval = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (cooldownInterval.current) {
        clearInterval(cooldownInterval.current);
      }
    };
  }, []);

  const startCooldown = (seconds: number) => {
    setResendCooldown(seconds);
    if (cooldownInterval.current) {
      clearInterval(cooldownInterval.current);
    }
    cooldownInterval.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownInterval.current) {
            clearInterval(cooldownInterval.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOTP = async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    // Worker validation for signup
    if (userType === 'worker' && isSignUp) {
      if (!workerData.fullName.trim()) {
        setError("Please enter your full name");
        return;
      }
      if (!workerData.phone.trim()) {
        setError("Please enter your phone number");
        return;
      }
    }

    // Role-specific email validation (remove hardcoded admin bypass)  
    if (userType === 'admin' && !email.includes('@bennett.edu.in')) {
      setError("Admin access is restricted to Bennett University emails only");
      return;
    }

    if (!isOnline) {
      setError("You are offline. Please check your internet connection.");
      return;
    }

    const rateLimitCheck = rateLimitUtils.canSendOTP(email);
    if (!rateLimitCheck.allowed) {
      const minutes = Math.ceil((rateLimitCheck.remainingTime || 0) / 60000);
      setError(`Please wait ${minutes} minute(s) before requesting another OTP`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      await sendOTP(email, { 
        isSignUp,
        userData: {
          role: userType,
          council_id: '00000000-0000-0000-0000-000000000001' // Bennett University
        }
      });
      
      setIsOtpSent(true);
      startCooldown(60);
      setRemainingAttempts(3);
      
      toast({
        title: "OTP sent successfully",
        description: `Please check your email for the verification code`,
      });
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      setError(error.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpToken || otpToken.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    if (!isOnline) {
      setError("You are offline. Please check your internet connection.");
      return;
    }

    setOtpLoading(true);
    setError("");

    try {
      const { data } = await verifyOTP(email, otpToken);
      
      // Wait a moment for the session to be established
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get the current session to ensure we have the latest user data
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error("Authentication failed - no session found");
      }

      // Create/update profile based on user type
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          user_id: session.user.id,
          email: session.user.email || email,
          role: userType,
          council_id: '00000000-0000-0000-0000-000000000001',
          full_name: userType === 'worker' ? workerData.fullName : (session.user.user_metadata?.full_name || null),
          phone: userType === 'worker' ? workerData.phone : (session.user.user_metadata?.phone || null)
        }, {
          onConflict: 'user_id'
        });

      if (profileError) {
        console.error("Error creating/updating profile:", profileError);
        throw new Error("Failed to create user profile");
      }

      // If worker, also create worker profile
      if (userType === 'worker' && isSignUp) {
        const { error: workerError } = await supabase
          .from("workers")
          .upsert({
            user_id: session.user.id,
            full_name: workerData.fullName,
            email: session.user.email || email,
            phone: workerData.phone || null,
            specialty: workerData.specialty || null,
            council_id: '00000000-0000-0000-0000-000000000001',
            is_available: true
          }, {
            onConflict: 'user_id'
          });

        if (workerError) {
          console.error("Error creating worker profile:", workerError);
          throw new Error("Failed to create worker profile");
        }
      }
      
      toast({
        title: "Authentication successful",
        description: "Welcome to the Municipal Portal!",
      });

      // The auth state change will automatically redirect to the correct dashboard
      // No need to call onSuccess() as the App component will handle the routing
    } catch (error: any) {
      console.error("Error verifying OTP:", error);
      const attempts = rateLimitUtils.incrementAttempts(email);
      setRemainingAttempts(Math.max(0, 3 - attempts));
      setError(error.message || "Invalid OTP. Please try again.");
      
      if (attempts >= 3) {
        setError("Too many failed attempts. Please request a new OTP.");
        setIsOtpSent(false);
        setOtpToken("");
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const resetForm = () => {
    setIsOtpSent(false);
    setOtpToken("");
    setError("");
    setResendCooldown(0);
    rateLimitUtils.resetAttempts(email);
    setRemainingAttempts(3);
  };

  const getUserTypeIcon = () => {
    switch (userType) {
      case 'admin': return <Shield className="h-6 w-6 text-white" />;
      case 'worker': return <Users className="h-6 w-6 text-white" />;
      case 'citizen': return <UserCheck className="h-6 w-6 text-white" />;
    }
  };

  const getUserTypeTitle = () => {
    switch (userType) {
      case 'admin': return 'Admin Portal';
      case 'worker': return 'Worker Portal';
      case 'citizen': return 'Citizen Portal';
    }
  };

  const getUserTypeDescription = () => {
    switch (userType) {
      case 'admin': return 'Administrative access to manage municipal operations';
      case 'worker': return 'Worker access to view and update assigned reports';
      case 'citizen': return 'Citizen access to submit and track reports';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>
      
      {/* Main card */}
      <Card className="w-full max-w-md backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl">
        <CardHeader className="text-center pb-8">
          <div className="flex justify-center items-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-600 shadow-lg">
              {getUserTypeIcon()}
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
            {getUserTypeTitle()}
          </CardTitle>
          <CardDescription className="text-gray-300 mt-2 text-base">
            {getUserTypeDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isOtpSent ? (
            <Tabs value={isSignUp ? "signup" : "signin"} onValueChange={(value) => setIsSignUp(value === "signup")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10 rounded-xl p-1">
                <TabsTrigger 
                  value="signin" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-gray-300 rounded-lg transition-all duration-200"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white text-gray-300 rounded-lg transition-all duration-200"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-6 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-200 font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-blue-400 focus:bg-white/10 transition-all duration-200 h-12"
                  />
                </div>
                <Button 
                  onClick={handleSendOTP} 
                  disabled={loading || !isOnline} 
                  className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-5 w-5" />
                      Send OTP
                    </>
                  )}
                </Button>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-6 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-gray-200 font-medium">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-400 focus:bg-white/10 transition-all duration-200 h-12"
                  />
                </div>
                
                {userType === 'worker' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-gray-200 font-medium">Full Name *</Label>
                      <Input
                        id="fullName"
                        placeholder="Enter your full name"
                        value={workerData.fullName}
                        onChange={(e) => setWorkerData({ ...workerData, fullName: e.target.value })}
                        disabled={loading}
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-400 focus:bg-white/10 transition-all duration-200 h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-gray-200 font-medium">Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Enter your phone number"
                        value={workerData.phone}
                        onChange={(e) => setWorkerData({ ...workerData, phone: e.target.value })}
                        disabled={loading}
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-400 focus:bg-white/10 transition-all duration-200 h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="specialty" className="text-gray-200 font-medium">Specialty</Label>
                      <Select
                        value={workerData.specialty}
                        onValueChange={(value) => setWorkerData({ ...workerData, specialty: value })}
                        disabled={loading}
                      >
                        <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-purple-400 focus:bg-white/10 transition-all duration-200 h-12">
                          <SelectValue placeholder="Select your specialty" className="text-gray-400" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="electrician" className="text-white hover:bg-slate-700">Electrician</SelectItem>
                          <SelectItem value="plumber" className="text-white hover:bg-slate-700">Plumber</SelectItem>
                          <SelectItem value="road_maintenance" className="text-white hover:bg-slate-700">Road Maintenance</SelectItem>
                          <SelectItem value="sanitation" className="text-white hover:bg-slate-700">Sanitation</SelectItem>
                          <SelectItem value="water_supply" className="text-white hover:bg-slate-700">Water Supply</SelectItem>
                          <SelectItem value="waste_management" className="text-white hover:bg-slate-700">Waste Management</SelectItem>
                          <SelectItem value="general" className="text-white hover:bg-slate-700">General Maintenance</SelectItem>
                          <SelectItem value="other" className="text-white hover:bg-slate-700">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                
                <Button 
                  onClick={handleSendOTP} 
                  disabled={loading || !isOnline} 
                  className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-5 w-5" />
                      Create Account
                    </>
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <div className="relative inline-flex">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                    <CheckCircle className="h-8 w-8 text-white" />
                  </div>
                  <div className="absolute inset-0 w-16 h-16 bg-green-400 rounded-full animate-ping opacity-20"></div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">OTP Sent</h3>
                <p className="text-gray-300">
                  Please check your email for the 6-digit verification code
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-gray-200 font-medium">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={otpLoading}
                  maxLength={6}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-green-400 focus:bg-white/10 transition-all duration-200 h-12 text-center text-2xl tracking-widest font-mono"
                />
              </div>
              
              <Button 
                onClick={handleVerifyOTP} 
                disabled={otpLoading || !isOnline} 
                className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                {otpLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify OTP"
                )}
              </Button>
              
              <div className="flex justify-between text-sm text-gray-300">
                <span>Attempts remaining: <span className="font-semibold text-white">{remainingAttempts}</span></span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resendCooldown > 0 ? undefined : handleSendOTP}
                  disabled={resendCooldown > 0 || loading}
                  className="p-0 h-auto text-blue-400 hover:text-blue-300"
                >
                  {resendCooldown > 0 ? (
                    `Resend in ${resendCooldown}s`
                  ) : (
                    <>
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Resend OTP
                    </>
                  )}
                </Button>
              </div>
              
              <Button 
                variant="outline" 
                onClick={resetForm} 
                className="w-full h-12 bg-white/5 border-white/20 text-white hover:bg-white/10 rounded-xl transition-all duration-200"
              >
                Change Email
              </Button>
            </div>
          )}
          
          {error && (
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 backdrop-blur-sm">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-200">{error}</AlertDescription>
            </Alert>
          )}
          
          {!isOnline && (
            <Alert className="bg-yellow-500/10 border-yellow-500/20 backdrop-blur-sm">
              <AlertCircle className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="text-yellow-200">
                You are currently offline. Please check your internet connection.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthForm;