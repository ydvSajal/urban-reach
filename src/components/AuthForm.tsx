import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Building2, Phone, Mail, Smartphone } from "lucide-react";
import PasswordReset from "./PasswordReset";

interface AuthFormProps {
  onSuccess: () => void;
  userType: 'admin' | 'citizen';
}

const AuthForm = ({ onSuccess, userType }: AuthFormProps) => {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'email' | 'otp'>('email');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [formData, setFormData] = useState({
    email: "",
    otp: "",
  });

  const ADMIN_EMAIL = 'sajalkumar1765@gmail.com';

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

  const startCooldown = () => {
    setResendCooldown(60);
  };

  const sendOTP = async (isResend = false) => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            user_type: userType,
            ...(userType === 'admin' && formData.email === ADMIN_EMAIL && {
              full_name: 'Admin Developer',
              role: 'admin'
            })
          }
        },
      });

      if (error) {
        if (error.message.includes('rate limit') || error.message.includes('email_send_rate_limit')) {
          if (!isResend) {
            setCurrentStep('otp');
          }
          toast({
            title: isResend ? "Rate limited" : "Please check your email",
            description: isResend 
              ? "Please wait before requesting another code. Check your email for any recently sent codes."
              : "An OTP may have been sent. If you received it, enter it below.",
            variant: isResend ? "destructive" : "default",
          });
          return;
        }
        throw error;
      }

      if (!isResend) {
        setCurrentStep('otp');
      }
      
      startCooldown();
      
      toast({
        title: isResend ? "New OTP sent!" : "OTP sent!",
        description: `Please check your email for the verification code. ${
          userType === 'admin' && formData.email === ADMIN_EMAIL 
            ? 'Admin access will be granted after verification.' 
            : ''
        }`,
      });

    } catch (error: any) {
      toast({
        title: `Error ${isResend ? 'resending' : 'sending'} OTP`,
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendOTP(false);
  };

  const handleResendOTP = async () => {
    await sendOTP(true);
  };

  const handleEmailOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: formData.email,
        token: formData.otp,
        type: 'email',
      });

      if (error) throw error;

      // Special handling for admin developer email
      if (userType === 'admin' && formData.email === ADMIN_EMAIL) {
        toast({
          title: "Admin access granted!",
          description: "Welcome, administrator!",
        });
      } else {
        toast({
          title: "Email verified successfully!",
          description: "Welcome to the municipal portal!",
        });
      }
      
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error verifying OTP",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  // Show email OTP verification step
  if (currentStep === 'otp') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Mail className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle>Verify Your Email</CardTitle>
            <CardDescription>
              Enter the 6-digit code sent to {formData.email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailOtpVerification} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  value={formData.otp}
                  onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || formData.otp.length !== 6}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify Email
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setCurrentStep('email');
                  setFormData({ ...formData, otp: "" });
                  setResendCooldown(0);
                }}
                className="w-full"
              >
                Back to Email
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                onClick={handleResendOTP}
                disabled={loading || resendCooldown > 0}
                className="w-full"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {resendCooldown > 0 
                  ? `Resend OTP in ${resendCooldown}s` 
                  : 'Resend OTP'
                }
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Building2 className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {userType === 'admin' ? 'Admin Login' : 'Citizen Login'}
          </CardTitle>
          <CardDescription>
            {userType === 'admin' 
              ? 'Access your council\'s administrative dashboard' 
              : 'Access your citizen portal'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signin-email">Email</Label>
              <Input
                id="signin-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter your email address"
                required
              />
            </div>
            {userType === 'admin' && formData.email === ADMIN_EMAIL && (
              <p className="text-sm text-success">
                🔑 Developer admin access - OTP login
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send OTP
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthForm;