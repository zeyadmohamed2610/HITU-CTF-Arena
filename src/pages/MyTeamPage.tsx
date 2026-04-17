import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent } from '@/components/ui/card';

/**
 * MyTeam route — resolves the current user's team and redirects to
 * the full team profile page (/team/:teamId) so the user sees the
 * same rich profile (members, charts, stats) as any other team.
 */
export default function MyTeamPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: membership, isLoading } = useQuery({
    queryKey: ['my-team-redirect', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user!.id)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (membership?.team_id) {
      navigate(`/team/${membership.team_id}`, { replace: true });
    }
  }, [membership?.team_id, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading your team…
      </div>
    );
  }

  if (!membership?.team_id) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-sans font-bold">My Team</h1>
        <Card className="gradient-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            You are not in a team yet. Go to your{' '}
            <Link to="/profile" className="text-primary hover:underline">profile</Link>{' '}
            to create or join a team.
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
