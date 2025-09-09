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
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    phone: "",
    otp: "",
    fullName: "",
    role: "citizen" as "citizen" | "admin",
    councilId: "",
  });

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
      
      if (authMethod === 'phone') {
        // Phone signup with OTP
        const { error } = await supabase.auth.signUp({
          phone: formData.phone,
          password: formData.password,
        });

        if (error) throw error;

        setShowOtpVerification(true);
        toast({
          title: "OTP sent!",
          description: "Please check your phone for the verification code.",
        });
      } else {
        // Email signup
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
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

        if (data.user) {
          // Create profile entry
          const { error: profileError } = await supabase
            .from("profiles")
            .insert({
              user_id: data.user.id,
              email: formData.email,
              full_name: formData.fullName,
              phone: formData.phone,
              role: formData.role,
              council_id: formData.councilId || null,
            });

          if (profileError) throw profileError;

          toast({
            title: "Account created successfully!",
            description: "Please check your email to verify your account.",
          });
          
          onSuccess();
        }
      }
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
      if (authMethod === 'phone') {
        // Phone signin with OTP
        const { error } = await supabase.auth.signInWithOtp({
          phone: formData.phone,
        });

        if (error) throw error;

        setShowOtpVerification(true);
        toast({
          title: "OTP sent!",
          description: "Please check your phone for the verification code.",
        });
      } else {
        // Email signin
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        toast({
          title: "Signed in successfully!",
          description: "Welcome back!",
        });
        
        onSuccess();
      }
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

  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formData.phone,
        token: formData.otp,
        type: 'sms',
      });

      if (error) throw error;

      if (data.user) {
        // Create profile for phone signup
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            user_id: data.user.id,
            email: data.user.email || "",
            full_name: formData.fullName,
            phone: formData.phone,
            role: formData.role,
            council_id: formData.councilId || null,
          });

        if (profileError) {
          console.error("Profile creation error:", profileError);
        }

        toast({
          title: "Phone verified successfully!",
          description: "Welcome to the municipal portal!",
        });
        
        onSuccess();
      }
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

  if (showOtpVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Smartphone className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle>Verify Your Phone</CardTitle>
            <CardDescription>
              Enter the 6-digit code sent to {formData.phone}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleOtpVerification} className="space-y-4">
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
                Verify Phone
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowOtpVerification(false);
                  setFormData({ ...formData, otp: "" });
                }}
                className="w-full"
              >
                Back to Login
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
          {/* Google Sign In Button */}
          <div className="mb-6">
            <Button 
              onClick={handleGoogleSignIn} 
              variant="outline" 
              className="w-full"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Tabs defaultValue="signin" className="w-full mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup" onClick={loadCouncils}>Sign Up</TabsTrigger>
            </TabsList>

            {/* Auth Method Selection */}
            <div className="mt-4 mb-4">
              <div className="flex items-center justify-center space-x-4">
                <Button
                  type="button"
                  variant={authMethod === 'email' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAuthMethod('email')}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </Button>
                <Button
                  type="button"
                  variant={authMethod === 'phone' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAuthMethod('phone')}
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Phone
                </Button>
              </div>
            </div>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                {authMethod === 'email' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <Input
                        id="signin-password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="signin-phone">Phone Number</Label>
                    <Input
                      id="signin-phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      required
                    />
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {authMethod === 'phone' ? 'Send OTP' : 'Sign In'}
                </Button>
                {authMethod === 'email' && (
                  <Button 
                    type="button" 
                    variant="link" 
                    onClick={() => setShowPasswordReset(true)}
                    className="w-full text-sm"
                  >
                    Forgot your password?
                  </Button>
                )}
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
                {authMethod === 'email' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone-required">Phone Number</Label>
                    <Input
                      id="signup-phone-required"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      required
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
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
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthForm;