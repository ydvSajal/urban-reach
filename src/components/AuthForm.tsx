import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
      await verifyOTP(email, otpToken);
      
      toast({
        title: "Authentication successful",
        description: "Welcome to the Municipal Portal!",
      });

      // Create/update profile based on user type
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            user_id: user.id,
            email: user.email || email,
            role: userType,
            council_id: '00000000-0000-0000-0000-000000000001',
            full_name: user.user_metadata?.full_name || null,
            phone: user.user_metadata?.phone || null
          }, {
            onConflict: 'user_id'
          });

        if (profileError) {
          console.error("Error creating/updating profile:", profileError);
        }
      }

      onSuccess();
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
      case 'admin': return <Shield className="h-6 w-6" />;
      case 'worker': return <Users className="h-6 w-6" />;
      case 'citizen': return <UserCheck className="h-6 w-6" />;
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-2 mb-2">
            <Building2 className="h-8 w-8 text-primary" />
            {getUserTypeIcon()}
          </div>
          <CardTitle className="text-2xl">{getUserTypeTitle()}</CardTitle>
          <CardDescription>{getUserTypeDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          {!isOtpSent ? (
            <Tabs value={isSignUp ? "signup" : "signin"} onValueChange={(value) => setIsSignUp(value === "signup")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <Button onClick={handleSendOTP} disabled={loading || !isOnline} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send OTP
                    </>
                  )}
                </Button>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <Button onClick={handleSendOTP} disabled={loading || !isOnline} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Create Account
                    </>
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <h3 className="text-lg font-semibold">OTP Sent</h3>
                <p className="text-sm text-muted-foreground">
                  Please check your email for the 6-digit verification code
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={otpLoading}
                  maxLength={6}
                />
              </div>
              
              <Button onClick={handleVerifyOTP} disabled={otpLoading || !isOnline} className="w-full">
                {otpLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify OTP"
                )}
              </Button>
              
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Attempts remaining: {remainingAttempts}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resendCooldown > 0 ? undefined : handleSendOTP}
                  disabled={resendCooldown > 0 || loading}
                  className="p-0 h-auto"
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
              
              <Button variant="outline" onClick={resetForm} className="w-full">
                Change Email
              </Button>
            </div>
          )}
          
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {!isOnline && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
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