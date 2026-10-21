import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";
import MainNavigation from "@/components/MainNavigation";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from '@supabase/supabase-js';
import { z } from 'zod';

// Password validation schema
const passwordSchema = z.string()
  .min(10, 'Password must be at least 10 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const Auth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<string>('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedRedirect = searchParams.get('redirect') || '/';
  // Only same-site paths, so the link in the confirmation email can't be
  // abused ("//host" and "/\\host" both leave the site in a browser)
  const redirectTo = /^\/(?![/\\])/.test(requestedRedirect) && !requestedRedirect.includes('\\') ? requestedRedirect : '/';
  const isHostFlow = redirectTo.startsWith('/host-dashboard') || redirectTo.startsWith('/host-application');
  // The reset email links to /auth?reset=1: the link signs the user in, and
  // they stay here to choose a new password instead of being sent on
  const [recovering, setRecovering] = useState(searchParams.get('reset') === '1');
  const recoveringRef = useRef(recovering);
  const [newPassword, setNewPassword] = useState("");
  // The address a confirmation email went to (or should go to): stays on screen
  // with a Resend button, since the email often lands in spam (Hotmail/Outlook)
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [tab, setTab] = useState(isHostFlow ? "signup" : "signin");

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (event === 'PASSWORD_RECOVERY') {
          recoveringRef.current = true;
          setRecovering(true);
        }
        if (recoveringRef.current) return;
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
      if (recoveringRef.current) return;
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
      toast.error('Password does not meet security requirements');
      return;
    }

    try {
      // Bring new users back to where they were going (e.g. the host application)
      const redirectUrl = `${window.location.origin}${redirectTo}`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) throw error;

      // An address that already has an account gets no email (Supabase hides
      // whether it exists by returning a user without identities)
      if (data.user && data.user.identities?.length === 0) {
        setError('This email already has an account. Sign in, or use "Forgot password?" if you don\'t remember it.');
        setTab('signin');
        return;
      }

      setConfirmEmail(email.trim());
    } catch (error: any) {
      setError(error.message);
      toast.error(error.message);
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
          redirectTo: `${window.location.origin}${redirectTo}`
        }
      });

      if (error) throw error;
    } catch (error: any) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!confirmEmail) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: confirmEmail,
        options: { emailRedirectTo: `${window.location.origin}${redirectTo}` },
      });
      if (error) throw error;
      toast.success(`We sent a new confirmation link to ${confirmEmail}.`);
    } catch (error) {
      // e.g. "For security purposes, you can only request this after 60 seconds."
      toast.error(
        error instanceof Error && error.message ? error.message : 'Could not send the email. Please try again in a minute.',
      );
    } finally {
      setResending(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Please enter your email address first');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=1`,
      });
      if (error) throw error;
      toast.success('Password reset link sent! Check your email.');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // Signed up but never clicked the link: offer to send it again
        if (error.code === 'email_not_confirmed' || /not confirmed/i.test(error.message)) {
          setConfirmEmail(email.trim());
          return;
        }
        throw error;
      }

      toast.success('Successfully signed in!');
    } catch (error: any) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassword(newPassword)) {
      toast.error('Password does not meet security requirements');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Your password is changed.');
      recoveringRef.current = false;
      setRecovering(false);
      navigate(redirectTo);
    } catch (error: any) {
      toast.error(error.message || 'Could not change the password. Request a new reset link.');
    } finally {
      setLoading(false);
    }
  };

  if (recovering) {
    return (
      <div className="min-h-screen bg-background">
        <MainNavigation />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-center text-2xl">Choose a new password</CardTitle>
              </CardHeader>
              <CardContent>
                {session ? (
                  <form onSubmit={handleSetNewPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          validatePassword(e.target.value);
                        }}
                        required
                      />
                      {passwordStrength && (
                        <p className={`text-xs ${passwordStrength === 'Strong' ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                          {passwordStrength}
                        </p>
                      )}
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Saving...' : 'Save new password'}
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Opening your reset link… If nothing happens, the link may have expired: sign in and choose
                      "Forgot password?" again.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        recoveringRef.current = false;
                        setRecovering(false);
                      }}
                    >
                      Back to sign in
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

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
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-2xl">
                {isHostFlow ? 'Create your host account' : 'Welcome'}
              </CardTitle>
              {isHostFlow && (
                <p className="text-center text-muted-foreground mt-2">
                  Sign up (or sign in) to access your host dashboard and start listing your property.
                </p>
              )}
            </CardHeader>
        <CardContent>
          {confirmEmail && (
            <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3" role="status">
              <div className="flex items-start gap-3">
                <MailCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">
                    Check your inbox (and spam) for <span className="break-all">{confirmEmail}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Click the link in our email to confirm your address, then you're signed in. It can take a few
                    minutes, and Hotmail and Outlook often put it in the junk folder.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pl-8">
                <Button size="sm" variant="outline" onClick={handleResendConfirmation} disabled={resending}>
                  {resending ? 'Sending...' : 'Resend email'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setConfirmEmail(null);
                    setError(null);
                  }}
                >
                  Use a different email
                </Button>
              </div>
            </div>
          )}
          <Tabs value={tab} onValueChange={setTab} className="w-full">
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
                    
                    {/* Google only: Facebook login is switched off in Supabase */}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                    >
                      Google
                    </Button>
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
                    
                    {/* Google only: Facebook login is switched off in Supabase */}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                    >
                      Google
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;