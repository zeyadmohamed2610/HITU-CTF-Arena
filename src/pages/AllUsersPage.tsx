import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Users as UsersIcon, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function AllUsersPage() {
  const [search, setSearch] = useState('');

  const { data: users } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, total_points, avatar_url')
        .order('total_points', { ascending: false });
      if (error) console.error('Error fetching users:', error);
      return data ?? [];
    },
  });

  const { data: userTeams } = useQuery({
    queryKey: ['all-user-teams'],
    queryFn: async () => {
      const { data } = await supabase.from('team_members').select('user_id, teams(id, name)');
      const map: Record<string, { id: string; name: string }> = {};
      data?.forEach((m: any) => { if (m.teams?.name) map[m.user_id] = { id: m.teams.id, name: m.teams.name }; });
      return map;
    },
  });

  const { data: firstBloods } = useQuery({
    queryKey: ['all-user-first-bloods'],
    queryFn: async () => {
      const { data } = await supabase
        .from('challenges')
        .select('first_blood_user_id')
        .not('first_blood_user_id', 'is', null);
      const counts: Record<string, number> = {};
      data?.forEach((c) => {
        if (c.first_blood_user_id) counts[c.first_blood_user_id] = (counts[c.first_blood_user_id] || 0) + 1;
      });
      return counts;
    },
  });

  const filtered = users?.filter((u) =>
    !search || u.username?.toLowerCase().includes(search.toLowerCase()) || u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UsersIcon className="h-8 w-8 text-info" />
        <h1 className="text-3xl font-sans font-bold">All Users</h1>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-muted border-border" />
      </div>

      <Card className="gradient-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left p-4 font-medium">#</th>
                  <th className="text-left p-4 font-medium">Username</th>
                  <th className="text-left p-4 font-medium">Team</th>
                  <th className="text-center p-4 font-medium">🩸 1st Bloods</th>
                  <th className="text-right p-4 font-medium">Points</th>
                </tr>
              </thead>
              <tbody>
                {filtered?.map((user, i) => {
                  const team = userTeams?.[user.user_id];
                  return (
                    <tr key={user.user_id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-4 text-muted-foreground font-mono">{i + 1}</td>
                      <td className="p-4">
                        <Link to={`/user/${user.user_id}`} className="font-medium text-primary hover:underline">
                          {user.username || 'Anonymous'}
                        </Link>
                      </td>
                      <td className="p-4">
                        {team ? (
                          <Link to={`/team/${team.id}`} className="text-muted-foreground hover:text-primary hover:underline">
                            {team.name}
                          </Link>
                        ) : '—'}
                      </td>
                      <td className="p-4 text-center font-mono">{firstBloods?.[user.user_id] || 0}</td>
                      <td className="p-4 text-right font-mono font-bold text-primary">{user.total_points}</td>
                    </tr>
                  );
                })}
                {filtered?.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
