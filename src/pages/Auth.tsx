import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import MainNavigation from "@/components/MainNavigation";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from '@supabase/supabase-js';
import { z } from 'zod';
import { Mail, ArrowLeft } from 'lucide-react';

// IMP-002: List of top common passwords to check against
const commonPasswords = [
  'password',
  '123456',
  '123456789',
  'qwerty',
  'abc123',
  'monkey',
  '1234567',
  'letmein',
  'trustno1',
  'dragon',
  'baseball',
  'iloveyou',
  'sunshine',
  'password123',
  '123123',
  'welcome',
  'login',
  'admin',
  'princess',
  'qwertyuiop'
];

// Password validation schema
const passwordSchema = z.string()
  .min(10, 'Password must be at least 10 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const Auth = () => {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<string>('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // BUG-049: Client-side rate limiting for password reset
  const [lastPasswordResetTime, setLastPasswordResetTime] = useState<number | null>(null);
  // IMP-015: Track password reset email sent state
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  // Validate redirect URL to prevent open redirect attacks
  const getValidatedRedirect = (redirectUrl: string | null): string => {
    if (!redirectUrl) return '/';

    // Only allow relative paths starting with '/'
    if (!redirectUrl.startsWith('/')) return '/';

    // Block protocol-relative URLs (// or http:// or https://)
    if (redirectUrl.startsWith('//') || redirectUrl.includes('://')) {
      return '/';
    }

    // Allow the relative path
    return redirectUrl;
  };

  const redirectTo = getValidatedRedirect(searchParams.get('redirect'));

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // User is logged in, redirect based on the original intent
          if (redirectTo === '/host-dashboard') {
            navigate('/host-dashboard');
          } else {
            navigate(redirectTo);
          }
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // User is already logged in, redirect
        if (redirectTo === '/host-dashboard') {
          navigate('/host-dashboard');
        } else {
          navigate(redirectTo);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, redirectTo]);

  const validatePassword = (pwd: string) => {
    try {
      // IMP-002: Check if password is a common password (case-insensitive)
      const lowerPwd = pwd.toLowerCase();
      if (commonPasswords.includes(lowerPwd)) {
        setPasswordStrength('This password is too common. Please choose a more unique password.');
        return false;
      }

      passwordSchema.parse(pwd);
      setPasswordStrength('Strong');
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        setPasswordStrength(err.issues[0].message);
      }
      return false;
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate password strength
    if (!validatePassword(password)) {
      setLoading(false);
      toast({ title: 'Error', description: 'Password does not meet security requirements', variant: 'destructive' });
      return;
    }

    try {
      const redirectUrl = `${window.location.origin}/`;
      const normalizedEmail = email.toLowerCase().trim();

      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'Check your email for the confirmation link!' });
    } catch (error: any) {
      setError(error.message);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;
    } catch (error: any) {
      setError(error.message);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;
    } catch (error: any) {
      setError(error.message);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({ title: 'Error', description: 'Please enter your email address first', variant: 'destructive' });
      return;
    }

    // BUG-049: Client-side rate limiting (60 seconds cooldown)
    const now = Date.now();
    if (lastPasswordResetTime && now - lastPasswordResetTime < 60000) {
      const secondsRemaining = Math.ceil((60000 - (now - lastPasswordResetTime)) / 1000);
      toast({ title: 'Error', description: `Please wait ${secondsRemaining} seconds before requesting another reset`, variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = email.toLowerCase().trim();

      // Attempt to send password reset link
      // Always show the same success message regardless of whether the email exists
      // This prevents email enumeration attacks
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });

      // IMP-015: Show distinct "check your email" state
      setResetEmailSent(true);
      setResetEmail(normalizedEmail);

      // Always show the generic success message
      toast({ title: 'Success', description: 'If an account exists with this email, you will receive a password reset link shortly.' });

      // Update last reset time
      setLastPasswordResetTime(now);

      // Optionally log error but don't expose it to the user
      if (error && error.message) {
        console.error('Password reset error:', error.message);
      }
    } catch (error: any) {
      // Also show generic message on catch
      toast({ title: 'Success', description: 'If an account exists with this email, you will receive a password reset link shortly.' });
      console.error('Unexpected error during password reset:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const normalizedEmail = email.toLowerCase().trim();

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'Successfully signed in!' });
    } catch (error: any) {
      setError(error.message);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // If user is already logged in, show loading while redirecting
  if (user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Redirecting...</h2>
          <p className="text-muted-foreground">Taking you to your destination</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          {/* IMP-015: Show distinct "check your email" state after password reset request */}
          {resetEmailSent ? (
            <Card>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <Mail className="h-12 w-12 text-primary" />
                </div>
                <CardTitle className="text-2xl">Check your email</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center space-y-2">
                  <p className="text-muted-foreground">
                    We've sent a password reset link to:
                  </p>
                  <p className="font-semibold text-foreground break-all">
                    {resetEmail}
                  </p>
                  <p className="text-sm text-muted-foreground mt-4">
                    Click the link in the email to reset your password. If you don't see the email, check your spam folder.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setResetEmailSent(false);
                    setResetEmail("");
                    setEmail("");
                  }}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to login
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-center text-2xl">
                  {redirectTo === '/host-dashboard' ? 'Sign in to become a Host' : 'Welcome'}
                </CardTitle>
                {redirectTo === '/host-dashboard' && (
                  <p className="text-center text-muted-foreground mt-2">
                    Create an account to access your host dashboard and start listing your property.
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
            
                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div>
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="your@email.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="signin-password">Password</Label>
                      <Input
                        id="signin-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                    {error && (
                      <div className="text-destructive text-sm">{error}</div>
                    )}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loading}
                    >
                      {loading ? 'Signing In...' : 'Sign In'}
                    </Button>
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                      >
                        Google
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleFacebookSignIn}
                        disabled={loading}
                      >
                        Facebook
                      </Button>
                    </div>
                  </form>
                </TabsContent>
            
                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div>
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="your@email.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (e.target.value.length > 0) {
                            validatePassword(e.target.value);
                          } else {
                            setPasswordStrength('');
                          }
                        }}
                        required
                        placeholder="Min 10 chars, uppercase, lowercase, number, special char"
                        minLength={10}
                      />
                      {passwordStrength && (
                        <div className={`text-sm mt-1 ${
                          passwordStrength === 'Strong' 
                            ? 'text-green-600' 
                            : 'text-destructive'
                        }`}>
                          {passwordStrength}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Must contain: 10+ characters, uppercase, lowercase, number, and special character
                      </p>
                    </div>
                    {error && (
                      <div className="text-destructive text-sm">{error}</div>
                    )}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loading}
                    >
                      {loading ? 'Creating Account...' : 'Create Account'}
                    </Button>
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                      >
                        Google
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleFacebookSignIn}
                        disabled={loading}
                      >
                        Facebook
                      </Button>
                    </div>
                  </form>
                </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;