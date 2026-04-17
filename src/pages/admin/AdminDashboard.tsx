import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Flag, Trophy, MessageSquare, Shield, FileText, Snowflake } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { adminLog } from '@/lib/adminLog';

export default function AdminDashboard() {
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [users, challenges, teams, tickets, submissions] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('challenges').select('id', { count: 'exact' }),
        supabase.from('teams').select('id', { count: 'exact' }),
        supabase.from('tickets').select('id', { count: 'exact' }).eq('status', 'open'),
        supabase.from('submissions').select('id', { count: 'exact' }),
      ]);
      return {
        users: users.count ?? 0,
        challenges: challenges.count ?? 0,
        teams: teams.count ?? 0,
        openTickets: tickets.count ?? 0,
        submissions: submissions.count ?? 0,
      };
    },
  });

  const { data: freeze } = useQuery({
    queryKey: ['scoreboard-freeze'],
    queryFn: async () => {
      const { data } = await supabase.from('scoreboard_freeze').select('*').limit(1).single();
      return data;
    },
  });

  const toggleFreeze = useMutation({
    mutationFn: async () => {
      const newFrozen = !freeze?.is_frozen;
      if (freeze?.id) {
        const { error } = await supabase.from('scoreboard_freeze').update({
          is_frozen: newFrozen,
          frozen_at: newFrozen ? new Date().toISOString() : freeze.frozen_at,
          unfrozen_at: !newFrozen ? new Date().toISOString() : null,
        }).eq('id', freeze.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('scoreboard_freeze').insert({
          is_frozen: true,
          frozen_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
      await adminLog(newFrozen ? 'freeze_scoreboard' : 'unfreeze_scoreboard');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scoreboard-freeze'] });
      toast.success(freeze?.is_frozen ? 'Scoreboard unfrozen' : 'Scoreboard frozen');
    },
    onError: () => toast.error('Failed to toggle freeze'),
  });

  const cards = [
    { title: 'Users', value: stats?.users, icon: Users, link: '/admin/users', color: 'text-info' },
    { title: 'Challenges', value: stats?.challenges, icon: Flag, link: '/admin/categories', color: 'text-primary' },
    { title: 'Teams', value: stats?.teams, icon: Trophy, link: '/admin/teams', color: 'text-warning' },
    { title: 'Open Tickets', value: stats?.openTickets, icon: MessageSquare, link: '/tickets', color: 'text-destructive' },
    { title: 'Total Submissions', value: stats?.submissions, icon: FileText, link: '/admin/logs', color: 'text-muted-foreground' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-sans font-bold">Admin Panel</h1>
        </div>
        <Button
          onClick={() => toggleFreeze.mutate()}
          variant={freeze?.is_frozen ? 'default' : 'outline'}
          className={freeze?.is_frozen ? 'bg-info/20 text-info hover:bg-info/30' : ''}
        >
          <Snowflake className="h-4 w-4 mr-2" />
          {freeze?.is_frozen ? 'Unfreeze Scoreboard' : 'Freeze Scoreboard'}
        </Button>
      </div>

      {freeze?.is_frozen && (
        <Badge className="bg-info/20 text-info border-info/30">
          🧊 Scoreboard is currently frozen — rankings are hidden from players
        </Badge>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link key={card.title} to={card.link}>
            <Card className="gradient-card border-border card-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm text-muted-foreground">{card.title}</CardTitle>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-mono font-bold">{card.value ?? '—'}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
