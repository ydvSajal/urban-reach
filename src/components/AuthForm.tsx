import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Building2, Mail, AlertCircle, CheckCircle, RefreshCw, Clock, Shield, Zap } from "lucide-react";
import PasswordReset from "./PasswordReset";
import { sendOTP, verifyOTP, signInAdmin, rateLimitUtils, ADMIN_EMAIL } from "@/lib/auth-config";
import { classifyError, getRecoveryActions } from "@/lib/error-handling";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

interface AuthFormProps {
  onSuccess: () => void;
  userType: 'admin' | 'citizen';
}

const AuthForm = ({ onSuccess, userType }: AuthFormProps) => {
  const [loading, setLoading] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showPhoneAuth, setShowPhoneAuth] = useState(false);
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [currentStep, setCurrentStep] = useState<'email' | 'otp'>('email');
  const [authMethod] = useState<'email' | 'phone'>('email');
  
  const [formData, setFormData] = useState({
    email: "",
    otp: "",
    fullName: "",
    phone: "",
    role: "citizen" as "citizen" | "worker" | "admin",
    councilId: "",
  });

  // Additional state variables
  const [resendCooldown, setResendCooldown] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [otpError, setOtpError] = useState("");
  const [otpExpiryTime, setOtpExpiryTime] = useState<number | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [recoveryActions, setRecoveryActions] = useState<string[]>([]);
  const [councils, setCouncils] = useState<Array<{id: string, name: string}>>([]);
  const otpInputRef = useRef<HTMLInputElement>(null);

  const networkStatus = useNetworkStatus();

  // Cooldown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // OTP expiry timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (otpExpiryTime && timeRemaining > 0) {
      interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((otpExpiryTime - now) / 1000));
        setTimeRemaining(remaining);
        
        if (remaining === 0) {
          setOtpError("OTP has expired. Please request a new one.");
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpExpiryTime, timeRemaining]);

  // Reset attempt count on successful OTP
  useEffect(() => {
    if (otpSuccess) {
      setAttemptCount(0);
    }
  }, [otpSuccess]);

  // Auto-focus OTP input
  useEffect(() => {
    if (currentStep === 'otp' && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [currentStep]);

  // Resend cooldown effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!networkStatus.online) {
      toast({
        title: "Network Error",
        description: "Please check your internet connection and try again.",
        variant: "destructive",
      });
      return;
    }

    if (currentStep === 'email') {
      await handleSendOTP();
    } else {
      await handleVerifyOTP();
    }
  };

  const handleSendOTP = async () => {
    if (!formData.email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    if (userType === 'admin' && !formData.email.endsWith('@bennett.edu.in')) {
      toast({
        title: "Invalid email",
        description: "Admin access requires a @bennett.edu.in email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await sendOTP(formData.email);
      
      if (result.success) {
        setCurrentStep('otp');
        setShowOtpVerification(true);
        setOtpExpiryTime(Date.now() + (10 * 60 * 1000)); // 10 minutes
        setTimeRemaining(600);
        setResendCooldown(60);
        setOtpError("");
        setRecoveryActions([]);
        
        toast({
          title: "OTP sent successfully",
          description: `Check your ${authMethod} for the 6-digit code`,
        });
      } else {
        toast({
          title: "Failed to send OTP",
          description: "Please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Auth error:', error);
      const message = error instanceof Error ? error.message : String(error);
      toast({
        title: "Authentication failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCouncils = async () => {
    try {
      const { data, error } = await supabase
        .from("councils")
        .select("id, name");
      
      if (error) throw error;
      setCouncils(data || []);
    } catch (error) {
      console.error("Error loading councils:", error);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    // Implement sign up logic here
    console.log("Sign up functionality to be implemented");
  };

  const handleVerifyOTP = async () => {
    if (!formData.otp.trim()) {
      toast({
        title: "OTP required",
        description: "Please enter the 6-digit code",
        variant: "destructive",
      });
      return;
    }

    if (formData.otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "OTP must be 6 digits",
        variant: "destructive",
      });
      return;
    }

    // Check if OTP has expired
    if (otpExpiryTime && Date.now() > otpExpiryTime) {
      setOtpError("OTP has expired. Please request a new one.");
      return;
    }

    // Rate limiting check
    if (attemptCount >= 3) {
      const canRetry = rateLimitUtils.canSendOTP(formData.email).allowed;
      if (!canRetry) {
        toast({
          title: "Too many attempts",
          description: "Please wait before trying again",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      let result;
      
      if (userType === 'admin' && formData.email === ADMIN_EMAIL) {
        result = await signInAdmin(formData.email);
      } else {
        result = await verifyOTP(formData.email, formData.otp);
      }
      
      if (result.success) {
        setOtpSuccess(true);
        setOtpError("");
        setRecoveryActions([]);
        
        toast({
          title: "Login successful",
          description: "Welcome back!",
        });
        
        onSuccess();
      } else {
        setAttemptCount(prev => prev + 1);
        rateLimitUtils.incrementAttempts(formData.email);
        
        const errorMessage = result.error || "Verification failed";
        const actions = getRecoveryActions(errorMessage);
        
        setOtpError(errorMessage);
        setRecoveryActions(actions);
        
        toast({
          title: "Verification failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Verification error:', error);
      setOtpError("");
      setRecoveryActions([]);
      setAttemptCount(prev => prev + 1);
      
      toast({
        title: "Verification failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0 || isResending) {
      return;
    }

    setIsResending(true);
    try {
      const result = await sendOTP(formData.email);
      
      if (result.success) {
        setOtpExpiryTime(Date.now() + (10 * 60 * 1000));
        setTimeRemaining(600);
        setResendCooldown(60);
        setOtpError("");
        setFormData(prev => ({ ...prev, otp: "" }));
        
        toast({
          title: "OTP resent",
          description: `New code sent to your ${authMethod}`,
        });
      } else {
        toast({
          title: "Failed to resend OTP",
          description: "Please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Resend error:', error);
      toast({
        title: "Failed to resend OTP",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  if (showPasswordReset) {
    return <PasswordReset onBack={() => setShowPasswordReset(false)} />;
  }

  const canResend = resendCooldown === 0 && !isResending;
  const hasTimeRemaining = timeRemaining > 0;

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <Card>
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            {userType === 'admin' ? (
              <div className="flex items-center space-x-2">
                <Shield className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-bold">Admin Portal</h2>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Building2 className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-bold">Citizen Portal</h2>
              </div>
            )}
          </div>
          <CardTitle className="text-2xl text-center">
            {otpSuccess ? "Login Successful" : currentStep === 'email' ? 'Sign In' : 'Verify OTP'}
          </CardTitle>
          <CardDescription className="text-center">
            {otpSuccess 
              ? "Redirecting to dashboard..." 
              : currentStep === 'email' 
                ? 'Enter your email to receive an OTP' 
                : `We've sent a 6-digit code to your ${authMethod}`}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {otpSuccess ? (
            <div className="flex items-center justify-center space-x-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span>Login successful!</span>
            </div>
          ) : (
            <form onSubmit={handleSignIn} className="space-y-4">
              {currentStep === 'email' ? (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={userType === 'admin' ? "admin@bennett.edu.in" : "Enter your email"}
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                  {userType === 'admin' && (
                    <p className="text-xs text-muted-foreground">
                      Admin access requires a @bennett.edu.in email address
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* OTP Display */}
                  <div className="text-center space-y-2">
                    <Mail className="h-12 w-12 text-muted-foreground mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      Code sent to {formData.email}
                    </p>
                    {hasTimeRemaining && (
                      <div className="flex items-center justify-center space-x-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Expires in {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="otp">6-digit code</Label>
                    <Input
                      ref={otpInputRef}
                      id="otp"
                      type="text"
                      placeholder="000000"
                      value={formData.otp}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setFormData(prev => ({ ...prev, otp: value }));
                        setOtpError("");
                      }}
                      maxLength={6}
                      className="text-center text-2xl font-mono tracking-widest"
                      required
                    />
                  </div>

                  {otpError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{otpError}</AlertDescription>
                    </Alert>
                  )}

                  {recoveryActions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Try these solutions:</p>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        {recoveryActions.map((action, index) => (
                          <li key={index}>• {action}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {attemptCount >= 3 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Multiple failed attempts. If you continue having issues, contact support.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleResendOTP}
                      disabled={!canResend}
                      className="text-xs"
                    >
                      {isResending ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          Sending...
                        </>
                      ) : canResend ? (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Resend code
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3 mr-1" />
                          Resend in {resendCooldown}s
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !networkStatus.online}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {currentStep === 'email' ? 'Sending...' : 'Verifying...'}
                  </>
                ) : currentStep === 'email' ? (
                  'Send OTP'
                ) : (
                  'Verify & Sign In'
                )}
              </Button>

              {currentStep === 'otp' && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setCurrentStep('email');
                    setShowOtpVerification(false);
                    setFormData(prev => ({ ...prev, otp: "" }));
                    setOtpError("");
                    setTimeRemaining(0);
                    setOtpExpiryTime(null);
                  }}
                >
                  ← Back to email
                </Button>
              )}
            </form>
          )}

          {/* Sign Up Section for Citizens */}
          {userType === 'citizen' && currentStep === 'email' && !otpSuccess && (
            <div className="pt-4 border-t">
              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                
                <TabsContent value="signup" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Create a new account
                  </p>
                  
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Enter your full name"
                        value={formData.fullName}
                        onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Enter your phone number"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select value={formData.role} onValueChange={(value: "citizen" | "worker" | "admin") => setFormData(prev => ({ ...prev, role: value }))}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="citizen">Citizen</SelectItem>
                          <SelectItem value="worker">Worker</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.role === "worker" && (
                      <div className="space-y-2">
                        <Label htmlFor="councilId">Municipal Council</Label>
                        <Select value={formData.councilId} onValueChange={(value) => setFormData(prev => ({ ...prev, councilId: value }))} onOpenChange={loadCouncils}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select council" />
                          </SelectTrigger>
                          <SelectContent>
                            {councils.map((council) => (
                              <SelectItem key={council.id} value={council.id}>
                                {council.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        'Create Account'
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {!networkStatus.online && (
            <Alert variant="destructive">
              <Zap className="h-4 w-4" />
              <AlertDescription>
                No internet connection. Please check your network and try again.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthForm;