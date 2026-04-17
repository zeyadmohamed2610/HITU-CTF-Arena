import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Flag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logActivity } from '@/lib/activityLog';

export default function AuthPage() {
  const { user, loading } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success('Password reset link sent to your email!');
        setMode('login');
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username, full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success('Check your email to confirm your account!');
        logActivity('signup', { username });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Welcome back!');
        logActivity('login', { email });
      }
    } catch (err: any) {
      const status = err?.status || err?.statusCode;
      const isRateLimited = status === 429 || err?.message?.toLowerCase().includes('rate limit');

      if (isRateLimited) {
        toast.error('Please wait a moment before trying again');
      } else {
        if (mode === 'login') logActivity('login_failed', { email, reason: err?.message });
        toast.error(err.message || 'Authentication failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md gradient-card border-border">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl gradient-primary flex items-center justify-center mb-4 glow-primary">
            <Flag className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-sans text-gradient">
            {mode === 'signup' ? 'Join the Arena' : mode === 'forgot' ? 'Reset Password' : 'Welcome Back'}
          </CardTitle>
          <CardDescription>
            {mode === 'signup'
              ? 'Create your account to compete'
              : mode === 'forgot'
              ? 'Enter your email to receive a reset link'
              : 'Sign in to continue your mission'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    required
                    className="bg-muted border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Security Name (Username)</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="h4ck3r"
                    required
                    className="bg-muted border-border"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="bg-muted border-border"
              />
            </div>
            {mode !== 'forgot' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="bg-muted border-border"
                />
              </div>
            )}
            <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'signup' ? 'Create Account' : mode === 'forgot' ? 'Send Reset Link' : 'Sign In'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {mode === 'signup' ? (
              <>Already have an account?{' '}<button onClick={() => setMode('login')} className="text-primary hover:underline">Sign In</button></>
            ) : mode === 'forgot' ? (
              <>Remember your password?{' '}<button onClick={() => setMode('login')} className="text-primary hover:underline">Sign In</button></>
            ) : (
              <>Don't have an account?{' '}<button onClick={() => setMode('signup')} className="text-primary hover:underline">Sign Up</button></>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
