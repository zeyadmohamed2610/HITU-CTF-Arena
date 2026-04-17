import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { UserPlus, Clock, CheckCircle } from 'lucide-react';

export default function CtfRegistration() {
  const { user, isCtfParticipant, ctfSettings, isCtfLive } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('ctf_participants')
        .insert({ user_id: user.id });

      if (error) throw error;

      toast.success('Successfully registered for CTF!');
      // Refresh auth state
      window.location.reload();
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Failed to register for CTF');
    } finally {
      setLoading(false);
    }
  };

  const handleUnregister = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('ctf_participants')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Successfully unregistered from CTF');
      window.location.reload();
    } catch (error) {
      console.error('Unregistration error:', error);
      toast.error('Failed to unregister from CTF');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Alert>
          <AlertDescription>Please log in to register for the CTF.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            CTF Registration
          </CardTitle>
          <CardDescription>
            Register to participate in the HITU CTF Arena competition
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm">
                CTF Status: {ctfSettings?.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            {ctfSettings?.start_time && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm">
                  Start: {new Date(ctfSettings.start_time).toLocaleString()}
                </span>
              </div>
            )}

            {ctfSettings?.end_time && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm">
                  End: {new Date(ctfSettings.end_time).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {isCtfParticipant() ? (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  You are registered as a CTF participant!
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleUnregister}
                disabled={loading}
                variant="destructive"
                className="w-full"
              >
                {loading ? 'Unregistering...' : 'Unregister from CTF'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Registration is required to participate in challenges and access the CTF platform.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleRegister}
                disabled={loading || !ctfSettings?.is_active}
                className="w-full"
              >
                {loading ? 'Registering...' : 'Register for CTF'}
              </Button>

              {!ctfSettings?.is_active && (
                <p className="text-sm text-muted-foreground text-center">
                  Registration is currently closed. The CTF is not active.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}