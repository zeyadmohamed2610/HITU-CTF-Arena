import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Trophy, Target, Users, ArrowLeft, Globe, Flag, Crosshair, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid } from 'recharts';

const difficultyColors: Record<string, string> = {
  easy: '#22c55e', medium: '#eab308', hard: '#ef4444', insane: '#dc2626',
};
const catColors = [
  'hsl(142,70%,45%)', 'hsl(200,80%,50%)', 'hsl(280,65%,60%)',
  'hsl(38,92%,50%)', 'hsl(0,72%,51%)', 'hsl(160,60%,45%)',
  'hsl(220,70%,60%)', 'hsl(330,65%,55%)',
];

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();

  const { data: profile } = useQuery({
    queryKey: ['public-profile', userId],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('user_id', userId!).single();
      return data;
    },
    enabled: !!userId,
  });

  const { data: team } = useQuery({
    queryKey: ['user-team-public', userId],
    queryFn: async () => {
      const { data } = await supabase.from('team_members').select('team_id, teams(id, name)').eq('user_id', userId!).maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  const { data: solves } = useQuery({
    queryKey: ['user-solves-detail', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('solves')
        .select('id, points_awarded, created_at, challenges(title, difficulty, category_id, categories(name))')
        .eq('user_id', userId!)
        .order('created_at', { ascending: true });
      return data ?? [];
    },
    enabled: !!userId,
  });

  const { data: firstBloodCount } = useQuery({
    queryKey: ['user-first-bloods', userId],
    queryFn: async () => {
      const { data } = await supabase.from('challenges').select('id').eq('first_blood_user_id', userId!);
      return data?.length ?? 0;
    },
    enabled: !!userId,
  });

  if (!profile) return null;

  // Difficulty distribution
  const diffDist: Record<string, number> = {};
  solves?.forEach((s: any) => { const diff = s.challenges?.difficulty || 'unknown'; diffDist[diff] = (diffDist[diff] || 0) + 1; });
  const pieData = Object.entries(diffDist).map(([name, value]) => ({ name, value }));

  // Category distribution
  const catDist: Record<string, number> = {};
  solves?.forEach((s: any) => { const cat = (s.challenges?.categories as any)?.name || 'Uncategorized'; catDist[cat] = (catDist[cat] || 0) + 1; });
  const barData = Object.entries(catDist).map(([name, value]) => ({ name, value }));

  // Score over time
  let cumulative = 0;
  const scoreTimeline = solves?.map((s: any) => {
    cumulative += s.points_awarded;
    return {
      time: new Date(s.created_at).toLocaleString('en-US', { timeZone: 'Africa/Cairo', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      score: cumulative,
    };
  }) ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      <Button variant="ghost" asChild>
        <Link to="/users"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Link>
      </Button>

      <Card className="gradient-card border-border">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="font-sans text-xl">{profile.username || 'Anonymous'}</CardTitle>
              {(profile as any).full_name && <p className="text-sm text-muted-foreground">{(profile as any).full_name}</p>}
              <p className="text-xs text-muted-foreground mt-1">
                Joined {new Date(profile.created_at).toLocaleDateString('en-US', { timeZone: 'Africa/Cairo' })}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Trophy className="h-5 w-5 text-primary" />
              <div><p className="text-xs text-muted-foreground">Points</p><p className="text-lg font-mono font-bold text-primary">{profile.total_points}</p></div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Target className="h-5 w-5 text-info" />
              <div><p className="text-xs text-muted-foreground">Solved</p><p className="text-lg font-mono font-bold">{solves?.length ?? 0}</p></div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Crosshair className="h-5 w-5 text-destructive" />
              <div><p className="text-xs text-muted-foreground">1st Bloods</p><p className="text-lg font-mono font-bold">{firstBloodCount ?? 0}</p></div>
            </div>
          </div>

          {team && (
            <Link to={`/team/${(team.teams as any)?.id}`} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors">
              <Users className="h-5 w-5 text-warning" />
              <div><p className="text-xs text-muted-foreground">Team</p><p className="text-sm font-medium">{(team.teams as any)?.name}</p></div>
            </Link>
          )}

          {profile.website && (
            <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors">
              <Globe className="h-5 w-5 text-primary" />
              <div><p className="text-xs text-muted-foreground">Website</p><p className="text-sm text-primary">{profile.website}</p></div>
            </a>
          )}
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

      {/* Score Timeline */}
      {scoreTimeline.length > 0 && (
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
      )}

      {/* Recent Solves */}
      <Card className="gradient-card border-border">
        <CardHeader><CardTitle className="text-sm font-sans">Solve History</CardTitle></CardHeader>
        <CardContent>
          {solves?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No solves yet.</p>
          ) : (
            <div className="space-y-2">
              {[...(solves ?? [])].reverse().map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Flag className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm">{s.challenges?.title}</span>
                    <Badge variant="outline" className="text-xs capitalize">{s.challenges?.difficulty}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleString('en-US', { timeZone: 'Africa/Cairo', hour12: true, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                    <span className="text-sm font-mono text-primary">+{s.points_awarded}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
