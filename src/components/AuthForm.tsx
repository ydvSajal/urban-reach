import { useState } from "react";
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
}

const AuthForm = ({ onSuccess }: AuthFormProps) => {
  const [loading, setLoading] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showPhoneAuth, setShowPhoneAuth] = useState(false);
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [currentStep, setCurrentStep] = useState<'email' | 'otp'>('email');
  const [authMethod] = useState<'email' | 'phone'>('email'); // Keep for backend compatibility
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    phone: "",
    otp: "",
    fullName: "",
    role: "citizen" as "citizen" | "admin",
    councilId: "",
  });

  const ADMIN_EMAIL = 'sajalkumar1765@gmail.com';

  const [councils, setCounsils] = useState<Array<{ id: string; name: string; city: string }>>([]);
  const [councilsLoaded, setCouncilsLoaded] = useState(false);

  const loadCouncils = async () => {
    if (councilsLoaded) return;
    
    try {
      const { data, error } = await supabase
        .from("councils")
        .select("id, name, city");
      
      if (error) throw error;
      setCounsils(data || []);
      setCouncilsLoaded(true);
    } catch (error) {
      console.error("Error loading councils:", error);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      // Use email OTP for signup - no password required
      const { error } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            role: formData.role,
            council_id: formData.councilId || null,
          },
        },
      });

      if (error) throw error;

      setCurrentStep('otp');
      toast({
        title: "Account creation started!",
        description: "Please check your email for the verification code to complete signup.",
      });

    } catch (error: any) {
      toast({
        title: "Error creating account",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if admin email - create a session directly for dev
      if (formData.email === ADMIN_EMAIL) {
        // For development only - create a temporary admin session
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: 'dev-admin-password', // This is just for dev access
        });

        if (error) {
          // If password login fails, create the user first
          const { error: signUpError } = await supabase.auth.signUp({
            email: formData.email,
            password: 'dev-admin-password',
            options: {
              data: {
                full_name: 'Admin Developer',
                role: 'admin'
              }
            }
          });

          if (signUpError && !signUpError.message.includes('already registered')) {
            throw signUpError;
          }

          // Try signing in again
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: 'dev-admin-password',
          });

          if (signInError) throw signInError;
        }

        toast({
          title: "Admin access granted!",
          description: "Welcome, administrator!",
        });
        
        onSuccess();
        return;
      }

      // For regular users, send email OTP
      const { error } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        if (error.message.includes('rate limit')) {
          throw new Error('Too many requests. Please wait a moment before trying again.');
        }
        throw error;
      }

      setCurrentStep('otp');
      toast({
        title: "OTP sent!",
        description: "Please check your email for the verification code.",
      });

    } catch (error: any) {
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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

      toast({
        title: "Email verified successfully!",
        description: "Welcome to the municipal portal!",
      });
      
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

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error with Google sign in",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  if (showPasswordReset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <PasswordReset onBack={() => setShowPasswordReset(false)} />
      </div>
    );
  }

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
                }}
                className="w-full"
              >
                Back to Email
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
          <CardTitle className="text-2xl">Municipal Portal</CardTitle>
          <CardDescription>
            Access your council's administrative dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup" onClick={loadCouncils}>Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
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
                {formData.email === ADMIN_EMAIL && (
                  <p className="text-sm text-success">
                    🔑 Developer admin access - password login enabled
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {formData.email === ADMIN_EMAIL ? 'Sign In as Admin' : 'Send OTP'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                  />
                </div>
                {/* Simplified signup form - only email */}
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter your email address"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Phone (Optional)</Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-role">Role</Label>
                  <Select value={formData.role} onValueChange={(value: "citizen" | "admin") => setFormData({ ...formData, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="citizen">Citizen</SelectItem>
                      <SelectItem value="admin">Council Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.role === "admin" && (
                  <div className="space-y-2">
                    <Label htmlFor="signup-council">Council</Label>
                    <Select value={formData.councilId} onValueChange={(value) => setFormData({ ...formData, councilId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your council" />
                      </SelectTrigger>
                      <SelectContent>
                        {councils.map((council) => (
                          <SelectItem key={council.id} value={council.id}>
                            {council.name}, {council.city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send OTP to Create Account
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  We'll send a verification code to your email to complete account creation
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthForm;