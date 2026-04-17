import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Users, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function AllTeamsPage() {
  const [search, setSearch] = useState('');

  const { data: teams } = useQuery({
    queryKey: ['all-teams'],
    queryFn: async () => {
      const { data } = await supabase
        .from('teams')
        .select('id, name, total_points')
        .order('total_points', { ascending: false });
      return data ?? [];
    },
  });

  const { data: allMembers } = useQuery({
    queryKey: ['all-team-members'],
    queryFn: async () => {
      const { data } = await supabase.from('team_members').select('team_id');
      return data ?? [];
    },
  });

  const memberCounts: Record<string, number> = {};
  allMembers?.forEach((m) => { memberCounts[m.team_id] = (memberCounts[m.team_id] || 0) + 1; });

  const { data: firstBloods } = useQuery({
    queryKey: ['first-bloods-by-team-all'],
    queryFn: async () => {
      const { data: challenges } = await supabase
        .from('challenges')
        .select('first_blood_user_id')
        .not('first_blood_user_id', 'is', null);
      if (!challenges || challenges.length === 0) return {};
      const fbUserIds = challenges.map((c) => c.first_blood_user_id!);
      const { data: members } = await supabase
        .from('team_members')
        .select('user_id, team_id')
        .in('user_id', fbUserIds);
      const teamFbCount: Record<string, number> = {};
      members?.forEach((m) => {
        teamFbCount[m.team_id] = (teamFbCount[m.team_id] || 0) + 1;
      });
      return teamFbCount;
    },
  });

  const filtered = teams?.filter((t) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-warning" />
        <h1 className="text-3xl font-sans font-bold">All Teams</h1>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search teams..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-muted border-border" />
      </div>

      <Card className="gradient-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left p-4 font-medium">#</th>
                  <th className="text-left p-4 font-medium">Team</th>
                  <th className="text-center p-4 font-medium">Members</th>
                  <th className="text-center p-4 font-medium">🩸 1st Bloods</th>
                  <th className="text-right p-4 font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {filtered?.map((team, i) => (
                  <tr key={team.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-4 text-muted-foreground font-mono">{i + 1}</td>
                    <td className="p-4">
                      <Link to={`/team/${team.id}`} className="font-medium text-primary hover:underline">
                        {team.name}
                      </Link>
                    </td>
                    <td className="p-4 text-center text-muted-foreground">{memberCounts[team.id] || 0}</td>
                    <td className="p-4 text-center font-mono">{firstBloods?.[team.id] || 0}</td>
                    <td className="p-4 text-right font-mono font-bold text-primary">{team.total_points}</td>
                  </tr>
                ))}
                {filtered?.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No teams found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
