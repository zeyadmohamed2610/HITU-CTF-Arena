import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ArrowLeft, Trophy, Target, Crosshair, Globe, Crown, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid, Legend } from 'recharts';

const difficultyColors: Record<string, string> = {
  easy: '#22c55e', medium: '#eab308', hard: '#ef4444', insane: '#dc2626',
};
const catColors = [
  'hsl(142,70%,45%)', 'hsl(200,80%,50%)', 'hsl(280,65%,60%)',
  'hsl(38,92%,50%)', 'hsl(0,72%,51%)', 'hsl(160,60%,45%)',
];

export default function TeamProfilePage() {
  const { teamId } = useParams<{ teamId: string }>();

  const { data: team } = useQuery({
    queryKey: ['team-profile', teamId],
    queryFn: async () => {
      const { data } = await supabase.from('teams').select('*').eq('id', teamId!).maybeSingle();
      return data;
    },
    enabled: !!teamId,
  });

  const { data: members } = useQuery({
    queryKey: ['team-members-profiles', teamId],
    queryFn: async () => {
      const { data: tmRows } = await supabase.from('team_members').select('id, user_id, team_id').eq('team_id', teamId!);
      if (!tmRows || tmRows.length === 0) return [];
      const userIds = tmRows.map((r) => r.user_id);
      const { data: profileRows } = await supabase.from('profiles').select('user_id, username, total_points, website, full_name').in('user_id', userIds);
      const profileMap = new Map((profileRows ?? []).map((p) => [p.user_id, p]));
      return tmRows.map((tm) => ({ user_id: tm.user_id, profile: profileMap.get(tm.user_id) ?? null }));
    },
    enabled: !!teamId,
  });

  const { data: firstBloodCount } = useQuery({
    queryKey: ['team-first-bloods', teamId],
    queryFn: async () => {
      const memberIds = members?.map((m) => m.user_id) ?? [];
      if (memberIds.length === 0) return 0;
      const { data } = await supabase.from('challenges').select('id').in('first_blood_user_id', memberIds);
      return data?.length ?? 0;
    },
    enabled: !!members && members.length > 0,
  });

  const { data: totalSolves } = useQuery({
    queryKey: ['team-solves-count', teamId],
    queryFn: async () => {
      const memberIds = members?.map((m) => m.user_id) ?? [];
      if (memberIds.length === 0) return 0;
      const { count } = await supabase.from('solves').select('id', { count: 'exact' }).in('user_id', memberIds);
      return count ?? 0;
    },
    enabled: !!members && members.length > 0,
  });

  const { data: teamSolves } = useQuery({
    queryKey: ['team-solves-detail', teamId],
    queryFn: async () => {
      const memberIds = members?.map((m) => m.user_id) ?? [];
      if (memberIds.length === 0) return [];
      const { data } = await supabase
        .from('solves')
        .select('id, user_id, points_awarded, created_at, challenges(difficulty, category_id, categories(name))')
        .in('user_id', memberIds)
        .order('created_at', { ascending: true });
      return data ?? [];
    },
    enabled: !!members && members.length > 0,
  });

  if (!team) return null;

  // Difficulty distribution
  const diffDist: Record<string, number> = {};
  teamSolves?.forEach((s: any) => {
    const diff = s.challenges?.difficulty || 'unknown';
    diffDist[diff] = (diffDist[diff] || 0) + 1;
  });
  const pieData = Object.entries(diffDist).map(([name, value]) => ({ name, value }));

  // Category distribution
  const catDist: Record<string, number> = {};
  teamSolves?.forEach((s: any) => {
    const cat = (s.challenges?.categories as any)?.name || 'Uncategorized';
    catDist[cat] = (catDist[cat] || 0) + 1;
  });
  const barData = Object.entries(catDist).map(([name, value]) => ({ name, value }));

  // Score over time
  let cumulative = 0;
  const scoreTimeline = teamSolves?.map((s: any) => {
    cumulative += s.points_awarded;
    return {
      time: new Date(s.created_at).toLocaleString('en-US', { timeZone: 'Africa/Cairo', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      score: cumulative,
    };
  }) ?? [];

  // Member contribution
  const memberPoints: Record<string, number> = {};
  teamSolves?.forEach((s: any) => {
    const name = members?.find(m => m.user_id === s.user_id)?.profile?.username || 'Unknown';
    memberPoints[name] = (memberPoints[name] || 0) + s.points_awarded;
  });
  const memberBarData = Object.entries(memberPoints).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const isLeader = (userId: string) => (team as any).leader_id === userId;

  return (
    <div className="space-y-6 max-w-4xl">
      <Button variant="ghost" asChild>
        <Link to="/teams"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Teams</Link>
      </Button>

      <Card className="gradient-card border-border">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              <Users className="h-7 w-7 text-warning" />
            </div>
            <div>
              <CardTitle className="font-sans text-xl">{team.name}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Created {new Date(team.created_at).toLocaleDateString('en-US', { timeZone: 'Africa/Cairo' })}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <Trophy className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-mono font-bold text-primary">{team.total_points}</p>
              <p className="text-xs text-muted-foreground">Score</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <Target className="h-5 w-5 text-info mx-auto mb-1" />
              <p className="text-lg font-mono font-bold">{totalSolves ?? 0}</p>
              <p className="text-xs text-muted-foreground">Solves</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <Crosshair className="h-5 w-5 text-destructive mx-auto mb-1" />
              <p className="text-lg font-mono font-bold">{firstBloodCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">1st Bloods</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-3">Members ({members?.length ?? 0})</p>
          <div className="space-y-2">
            {(!members || members.length === 0) && <p className="text-sm text-muted-foreground">No members found</p>}
            {members?.map((m) => {
              const p = m.profile;
              return (
                <Link
                  key={m.user_id}
                  to={`/user/${m.user_id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{p?.username || (p as any)?.full_name || 'Anonymous'}</span>
                    {(p as any)?.full_name && p?.username && <span className="text-xs text-muted-foreground">({(p as any).full_name})</span>}
                    {isLeader(m.user_id) && <Crown className="h-3.5 w-3.5 text-warning" />}
                  </div>
                  <div className="flex items-center gap-3">
                    {p?.website && <Globe className="h-3.5 w-3.5 text-primary" />}
                    <span className="text-sm font-mono text-primary">{p?.total_points ?? 0} pts</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      {pieData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="gradient-card border-border">
            <CardHeader><CardTitle className="text-sm font-sans">Difficulty Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {pieData.map((entry) => <Cell key={entry.name} fill={difficultyColors[entry.name] || '#6b7280'} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(220,18%,10%)', border: '1px solid hsl(220,14%,18%)', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="gradient-card border-border">
            <CardHeader><CardTitle className="text-sm font-sans">Categories Solved</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} layout="vertical">
                  <XAxis type="number" stroke="hsl(215,15%,55%)" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" stroke="hsl(215,15%,55%)" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip contentStyle={{ background: 'hsl(220,18%,10%)', border: '1px solid hsl(220,14%,18%)', borderRadius: '8px' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {barData.map((_, i) => <Cell key={i} fill={catColors[i % catColors.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Score Timeline + Member Contribution */}
      {scoreTimeline.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="gradient-card border-border">
            <CardHeader><CardTitle className="text-sm font-sans flex items-center gap-2"><Clock className="h-4 w-4" /> Score Over Time</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={scoreTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,18%)" />
                  <XAxis dataKey="time" stroke="hsl(215,15%,55%)" tick={{ fontSize: 10 }} />
                  <YAxis stroke="hsl(215,15%,55%)" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'hsl(220,18%,10%)', border: '1px solid hsl(220,14%,18%)', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="score" stroke="hsl(142,70%,45%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="gradient-card border-border">
            <CardHeader><CardTitle className="text-sm font-sans">Member Contributions</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={memberBarData}>
                  <XAxis dataKey="name" stroke="hsl(215,15%,55%)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="hsl(215,15%,55%)" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'hsl(220,18%,10%)', border: '1px solid hsl(220,14%,18%)', borderRadius: '8px' }} />
                  <Bar dataKey="value" fill="hsl(200,80%,50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
