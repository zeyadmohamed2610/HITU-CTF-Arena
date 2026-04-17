import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Link } from 'react-router-dom';

const rankIcons = [Trophy, Medal, Award];
const rankColors = ['text-warning', 'text-muted-foreground', 'text-orange-400'];
const chartColors = [
  'hsl(142,70%,45%)', 'hsl(200,80%,50%)', 'hsl(280,65%,60%)',
  'hsl(38,92%,50%)', 'hsl(0,72%,51%)', 'hsl(160,60%,45%)',
  'hsl(220,70%,60%)', 'hsl(330,65%,55%)', 'hsl(50,80%,50%)',
  'hsl(190,70%,45%)',
];

export default function ScoreboardPage() {
  // Freeze status — when frozen, we cut off all data at frozen_at
  const { data: freezeStatus } = useQuery({
    queryKey: ['scoreboard-freeze'],
    queryFn: async () => {
      const { data } = await supabase.from('scoreboard_freeze').select('*').limit(1).maybeSingle();
      return data;
    },
    refetchInterval: 15000,
  });

  const isFrozen = !!freezeStatus?.is_frozen;
  const cutoff = isFrozen && freezeStatus?.frozen_at ? freezeStatus.frozen_at : null;

  // Single source of truth: compute everything from solves + team_members.
  // This makes points and ranks ALWAYS real-time, and freezes correctly when needed.
  const { data: scoreboard } = useQuery({
    queryKey: ['scoreboard-computed', cutoff ?? 'live'],
    queryFn: async () => {
      // 1. All teams
      const { data: allTeams } = await supabase
        .from('teams')
        .select('id, name')
        .limit(500);
      if (!allTeams || allTeams.length === 0) return { teams: [], graph: null, firstBloods: {} };

      // 2. All members
      const { data: members } = await supabase
        .from('team_members')
        .select('user_id, team_id');
      const userToTeam: Record<string, string> = {};
      members?.forEach((m) => { userToTeam[m.user_id] = m.team_id; });

      // 3. All solves (filtered by cutoff if frozen)
      let solvesQuery = supabase
        .from('solves')
        .select('user_id, points_awarded, created_at, challenge_id')
        .order('created_at', { ascending: true });
      if (cutoff) solvesQuery = solvesQuery.lte('created_at', cutoff);
      const { data: solves } = await solvesQuery;

      // 4. Aggregate team points from solves
      const teamPoints: Record<string, number> = {};
      allTeams.forEach((t) => { teamPoints[t.id] = 0; });
      solves?.forEach((s) => {
        const tid = userToTeam[s.user_id];
        if (tid && teamPoints[tid] !== undefined) {
          teamPoints[tid] += s.points_awarded;
        }
      });

      // 5. Add admin bonuses (profile.total_points - sum of solve points for that user)
      // Only when NOT frozen — bonuses are applied in real time and we don't snapshot them.
      if (!cutoff) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, total_points');
        const userSolvePoints: Record<string, number> = {};
        solves?.forEach((s) => {
          userSolvePoints[s.user_id] = (userSolvePoints[s.user_id] || 0) + s.points_awarded;
        });
        profiles?.forEach((p) => {
          const tid = userToTeam[p.user_id];
          if (!tid || teamPoints[tid] === undefined) return;
          const solvePts = userSolvePoints[p.user_id] || 0;
          const bonus = (p.total_points || 0) - solvePts;
          if (bonus !== 0) teamPoints[tid] += bonus;
        });
      }

      // 6. Build ranked teams
      const teams = allTeams
        .map((t) => ({ id: t.id, name: t.name, total_points: teamPoints[t.id] || 0 }))
        .sort((a, b) => b.total_points - a.total_points);

      // 7. First bloods — filter by cutoff for frozen state
      const fbQuery = supabase
        .from('challenges')
        .select('first_blood_user_id')
        .not('first_blood_user_id', 'is', null);
      const { data: fbChallenges } = await fbQuery;
      const firstBloods: Record<string, number> = {};
      fbChallenges?.forEach((c) => {
        const tid = userToTeam[c.first_blood_user_id!];
        if (tid) firstBloods[tid] = (firstBloods[tid] || 0) + 1;
      });

      // 8. Graph data — top 10 cumulative score over time
      const top10 = teams.slice(0, 10);
      const teamNames: Record<string, string> = {};
      top10.forEach((t) => { teamNames[t.id] = t.name; });
      const top10Set = new Set(top10.map((t) => t.id));

      const cumulative: Record<string, number> = {};
      top10.forEach((t) => { cumulative[t.id] = 0; });

      const points: any[] = [];
      const startEntry: any = { label: 'Start' };
      top10.forEach((t) => { startEntry[t.name] = 0; });
      points.push(startEntry);

      solves?.forEach((s) => {
        const tid = userToTeam[s.user_id];
        if (!tid || !top10Set.has(tid)) return;
        cumulative[tid] += s.points_awarded;
        const entry: any = {
          label: new Date(s.created_at).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo',
          }),
        };
        top10.forEach((t) => { entry[t.name] = cumulative[t.id]; });
        points.push(entry);
      });

      const finalEntry: any = { label: cutoff ? 'Frozen' : 'Now' };
      top10.forEach((t) => { finalEntry[t.name] = cumulative[t.id]; });
      points.push(finalEntry);

      return {
        teams,
        firstBloods,
        graph: { points, names: top10.map((t) => t.name) },
      };
    },
    refetchInterval: isFrozen ? false : 15000,
  });

  const teams = scoreboard?.teams ?? [];
  const graphData = scoreboard?.graph;
  const firstBloods = scoreboard?.firstBloods ?? {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-sans font-bold">Scoreboard</h1>
          <p className="text-muted-foreground mt-1">
            {isFrozen ? 'Frozen — showing snapshot at freeze time' : 'Team rankings updated in real-time'}
          </p>
        </div>
        {isFrozen && (
          <Badge className="bg-info/20 text-info border-info/30">🧊 Scoreboard Frozen</Badge>
        )}
      </div>

      {graphData && graphData.names.length > 0 && (
        <Card className="gradient-card border-border">
          <CardHeader>
            <CardTitle className="font-sans">Top 10 Teams — Score Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full" style={{ height: 420 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={graphData.points} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                  <XAxis
                    dataKey="label"
                    stroke="hsl(215,15%,55%)"
                    tick={{ fontSize: 11 }}
                    interval="preserveStartEnd"
                    minTickGap={40}
                  />
                  <YAxis stroke="hsl(215,15%,55%)" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(220,18%,10%)',
                      border: '1px solid hsl(220,14%,18%)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  {graphData.names.map((name: string, i: number) => (
                    <Line
                      key={name}
                      type="stepAfter"
                      dataKey={name}
                      stroke={chartColors[i % chartColors.length]}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="gradient-card border-border">
        <CardHeader>
          <CardTitle className="font-sans">Team Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm text-muted-foreground font-medium">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Team</div>
              <div className="col-span-3 text-center">🩸 First Bloods</div>
              <div className="col-span-3 text-right">Score</div>
            </div>
            {teams.map((team, i) => {
              const Icon = rankIcons[i] ?? null;
              return (
                <Link
                  key={team.id}
                  to={`/team/${team.id}`}
                  className={`grid grid-cols-12 gap-4 px-4 py-3 rounded-lg items-center ${
                    i < 3 ? 'bg-muted/50' : 'hover:bg-muted/30'
                  } transition-colors`}
                >
                  <div className="col-span-1 font-mono text-sm">
                    {Icon ? <Icon className={`h-5 w-5 ${rankColors[i]}`} /> : <span className="text-muted-foreground">{i + 1}</span>}
                  </div>
                  <div className="col-span-5 font-medium text-sm truncate">{team.name}</div>
                  <div className="col-span-3 text-center">
                    <span className="text-sm font-mono">{firstBloods[team.id] || 0}</span>
                  </div>
                  <div className="col-span-3 text-right font-mono font-bold text-primary">{team.total_points}</div>
                </Link>
              );
            })}
            {teams.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No teams yet</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
