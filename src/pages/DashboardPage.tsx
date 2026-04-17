import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flag, Trophy, Target, Zap, Settings, Users, Megaphone, UserPlus, Link } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';

export default function DashboardPage() {
  const { profile, user, isAdmin, isAuthor, isPlayer, isCtfParticipant, canAccessChallenges } = useAuthStore();

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async () => {
      if (isAdmin() || isAuthor()) {
        // Admin/Author stats
        const [challengesRes, teamsRes, usersRes, participantsRes] = await Promise.all([
          supabase.from('challenges').select('id', { count: 'exact', head: true }),
          supabase.from('teams').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('ctf_participants').select('id', { count: 'exact', head: true }),
        ]);
        return {
          challenges: challengesRes.count ?? 0,
          teams: teamsRes.count ?? 0,
          users: usersRes.count ?? 0,
          participants: participantsRes.count ?? 0,
        };
      } else {
        // Player stats
        const [solvesRes, challengesRes, recentSolvesRes] = await Promise.all([
          supabase.from('solves').select('id', { count: 'exact' }).eq('user_id', user!.id),
          supabase.from('challenges').select('id', { count: 'exact' }).eq('is_active', true),
          supabase.from('solves').select('*, challenges(title)').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(5),
        ]);
        return {
          solved: solvesRes.count ?? 0,
          total: challengesRes.count ?? 0,
          recentSolves: recentSolvesRes.data ?? [],
        };
      }
    },
    enabled: !!user,
  });

  const getStatCards = () => {
    if (isAdmin() || isAuthor()) {
      return [
        { title: 'Challenges', value: stats?.challenges ?? 0, icon: Flag, color: 'text-warning' },
        { title: 'Teams', value: stats?.teams ?? 0, icon: Users, color: 'text-info' },
        { title: 'Users', value: stats?.users ?? 0, icon: Trophy, color: 'text-primary' },
        { title: 'Participants', value: stats?.participants ?? 0, icon: UserPlus, color: 'text-success' },
      ];
    } else {
      return [
        { title: 'Your Points', value: profile?.total_points ?? 0, icon: Trophy, color: 'text-primary' },
        { title: 'Challenges Solved', value: stats?.solved ?? 0, icon: Target, color: 'text-info' },
        { title: 'Active Challenges', value: stats?.total ?? 0, icon: Flag, color: 'text-warning' },
        { title: 'Completion', value: stats ? `${Math.round((stats.solved / Math.max(stats.total, 1)) * 100)}%` : '0%', icon: Zap, color: 'text-success' },
      ];
    }
  };

  const statCards = getStatCards();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-sans font-bold">
          Welcome, <span className="text-gradient">{profile?.username || 'Player'}</span>
        </h1>
        <p className="text-muted-foreground mt-1">Your mission control center</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="gradient-card border-border card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Role-based Quick Actions */}
      {(isAdmin() || isAuthor()) && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Management Actions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" asChild>
              <RouterLink to="/challenges">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Manage Challenges</CardTitle>
                  <Flag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Create and edit challenges
                  </p>
                </CardContent>
              </RouterLink>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" asChild>
              <RouterLink to="/ctf-settings">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">CTF Settings</CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Manage CTF timing and status
                  </p>
                </CardContent>
              </RouterLink>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" asChild>
              <RouterLink to="/admin/users">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">User Management</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Manage users and roles
                  </p>
                </CardContent>
              </RouterLink>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" asChild>
              <RouterLink to="/announcements">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Announcements</CardTitle>
                  <Megaphone className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Post announcements
                  </p>
                </CardContent>
              </RouterLink>
            </Card>
          </div>
        </div>
      )}

      {/* Player Actions */}
      {isPlayer() && !isAdmin() && !isAuthor() && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Competition Actions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {!isCtfParticipant() ? (
              <Card className="cursor-pointer hover:shadow-md transition-shadow" asChild>
                <RouterLink to="/ctf-registration">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Register for CTF</CardTitle>
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      Join the competition
                    </p>
                  </CardContent>
                </RouterLink>
              </Card>
            ) : (
              <Card className="cursor-pointer hover:shadow-md transition-shadow" asChild>
                <RouterLink to="/challenges">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Challenges</CardTitle>
                    <Flag className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      View and solve challenges
                    </p>
                  </CardContent>
                </RouterLink>
              </Card>
            )}
            <Card className="cursor-pointer hover:shadow-md transition-shadow" asChild>
              <RouterLink to="/scoreboard">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Scoreboard</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Check rankings and scores
                  </p>
                </CardContent>
              </RouterLink>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" asChild>
              <RouterLink to="/profile">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Profile</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Manage your profile
                  </p>
                </CardContent>
              </RouterLink>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" asChild>
              <RouterLink to="/my-team">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Team</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    View team information
                  </p>
                </CardContent>
              </RouterLink>
            </Card>
          </div>
        </div>
      )}

      {/* Recent Solves for Players */}
      {isPlayer() && !isAdmin() && !isAuthor() && (
        <Card className="gradient-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-sans">Recent Solves</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentSolves?.length === 0 ? (
              <p className="text-muted-foreground text-sm">No solves yet. Start hacking!</p>
            ) : (
              <div className="space-y-2">
                {stats?.recentSolves?.map((solve: any) => (
                  <div key={solve.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">{solve.challenges?.title}</span>
                    <span className="text-sm text-primary font-mono">+{solve.points_awarded}pts</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
