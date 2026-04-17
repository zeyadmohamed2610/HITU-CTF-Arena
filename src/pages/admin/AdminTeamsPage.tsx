import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Trash2, UserPlus, UserMinus, ChevronDown, ChevronRight, Plus, Minus, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { adminLog } from '@/lib/adminLog';
import { Link } from 'react-router-dom';

export default function AdminTeamsPage() {
  const queryClient = useQueryClient();
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [addUserId, setAddUserId] = useState<Record<string, string>>({});
  const [scoreDialog, setScoreDialog] = useState<{ teamId: string; teamName: string; type: 'bonus' | 'minus' } | null>(null);
  const [scoreAmount, setScoreAmount] = useState('');

  const { data: teams } = useQuery({
    queryKey: ['admin-teams'],
    queryFn: async () => {
      const { data } = await supabase.from('teams').select('*').order('total_points', { ascending: false });
      return data ?? [];
    },
  });

  const { data: allMembers } = useQuery({
    queryKey: ['admin-all-team-members'],
    queryFn: async () => {
      const { data } = await supabase.from('team_members').select('id, team_id, user_id');
      return data ?? [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ['admin-all-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_id, username, full_name');
      return data ?? [];
    },
  });

  const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);
  const membersByTeam = new Map<string, typeof allMembers>();
  allMembers?.forEach((m) => {
    const list = membersByTeam.get(m.team_id) ?? [];
    list.push(m);
    membersByTeam.set(m.team_id, list);
  });
  const memberCountByTeam = (teamId: string) => membersByTeam.get(teamId)?.length ?? 0;

  const usersInTeams = new Set(allMembers?.map((m) => m.user_id) ?? []);
  const availableUsers = profiles?.filter((p) => !usersInTeams.has(p.user_id)) ?? [];

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
    queryClient.invalidateQueries({ queryKey: ['admin-all-team-members'] });
  };

  const deleteTeam = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      await supabase.from('team_members').delete().eq('team_id', id);
      const { error } = await supabase.from('teams').delete().eq('id', id);
      if (error) throw error;
      await adminLog('delete_team', { team_id: id, name });
    },
    onSuccess: () => { invalidateAll(); toast.success('Team deleted'); },
    onError: () => toast.error('Failed to delete team'),
  });

  const removeMember = useMutation({
    mutationFn: async ({ memberId, teamName, username }: { memberId: string; teamName: string; username: string }) => {
      const { error } = await supabase.from('team_members').delete().eq('id', memberId);
      if (error) throw error;
      await adminLog('remove_team_member', { team: teamName, user: username });
    },
    onSuccess: () => { invalidateAll(); toast.success('Member removed'); },
    onError: () => toast.error('Failed to remove member'),
  });

  const addMember = useMutation({
    mutationFn: async ({ teamId, userId, teamName, username }: { teamId: string; userId: string; teamName: string; username: string }) => {
      const { error } = await supabase.from('team_members').insert({ team_id: teamId, user_id: userId });
      if (error) throw error;
      await adminLog('add_team_member', { team: teamName, user: username });
    },
    onSuccess: (_, vars) => {
      invalidateAll();
      setAddUserId((prev) => ({ ...prev, [vars.teamId]: '' }));
      toast.success('Member added');
    },
    onError: () => toast.error('Failed to add member'),
  });

  const adjustScore = useMutation({
    mutationFn: async ({ teamId, amount, teamName }: { teamId: string; amount: number; teamName: string }) => {
      const team = teams?.find(t => t.id === teamId);
      if (!team) throw new Error('Team not found');
      const newPoints = Math.max(0, team.total_points + amount);
      const { error } = await supabase.from('teams').update({ total_points: newPoints }).eq('id', teamId);
      if (error) throw error;
      await adminLog('adjust_team_score', { team: teamName, amount, new_total: newPoints });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      setScoreDialog(null);
      setScoreAmount('');
      toast.success('Score adjusted');
    },
    onError: () => toast.error('Failed to adjust score'),
  });

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Invite code copied!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-warning" />
        <h1 className="text-3xl font-sans font-bold">Team Management</h1>
      </div>

      <Card className="gradient-card border-border">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left p-4 font-medium w-8"></th>
                <th className="text-left p-4 font-medium">Name</th>
                <th className="text-left p-4 font-medium">Code</th>
                <th className="text-left p-4 font-medium">Members</th>
                <th className="text-left p-4 font-medium">Points</th>
                <th className="text-right p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams?.map((team) => {
                const isExpanded = expandedTeam === team.id;
                const teamMembers = membersByTeam.get(team.id) ?? [];
                return (
                  <tr key={team.id} className="border-b border-border/50">
                    <td colSpan={6} className="p-0">
                      <div
                        className="grid hover:bg-muted/30 cursor-pointer"
                        style={{ gridTemplateColumns: '2rem 1fr 6rem 4rem 5rem 8rem' }}
                        onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                      >
                        <div className="p-4 flex items-center">
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="p-4">
                          <Link to={`/team/${team.id}`} className="font-medium text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{team.name}</Link>
                        </div>
                        <div className="p-4 flex items-center gap-1">
                          <code className="text-xs font-mono text-muted-foreground">{(team as any).invite_code}</code>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); copyInviteCode((team as any).invite_code); }}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="p-4 text-muted-foreground">{memberCountByTeam(team.id)}</div>
                        <div className="p-4 font-mono text-primary">{team.total_points}</div>
                        <div className="p-4 text-right flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setScoreDialog({ teamId: team.id, teamName: team.name, type: 'bonus' }); }} className="text-primary hover:text-primary h-7">
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setScoreDialog({ teamId: team.id, teamName: team.name, type: 'minus' }); }} className="text-destructive hover:text-destructive h-7">
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); deleteTeam.mutate({ id: team.id, name: team.name }); }} className="text-destructive hover:text-destructive h-7">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-6 pb-4 space-y-2">
                          <p className="text-xs text-muted-foreground font-medium mb-2">Members</p>
                          {teamMembers.length === 0 && <p className="text-xs text-muted-foreground">No members</p>}
                          {teamMembers.map((m) => {
                            const p = profileMap.get(m.user_id);
                            return (
                              <div key={m.id} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
                                <Link to={`/user/${m.user_id}`} className="text-sm text-primary hover:underline">
                                  {p?.username || p?.full_name || m.user_id.slice(0, 8)}
                                </Link>
                                <Button size="sm" variant="ghost" onClick={() => removeMember.mutate({ memberId: m.id, teamName: team.name, username: p?.username || 'unknown' })} className="text-destructive hover:text-destructive h-7">
                                  <UserMinus className="h-3.5 w-3.5 mr-1" /> Remove
                                </Button>
                              </div>
                            );
                          })}

                          <div className="flex items-center gap-2 mt-3">
                            <select
                              className="flex-1 bg-muted border border-border rounded-md px-3 py-1.5 text-sm"
                              value={addUserId[team.id] || ''}
                              onChange={(e) => setAddUserId((prev) => ({ ...prev, [team.id]: e.target.value }))}
                            >
                              <option value="">Select user to add…</option>
                              {availableUsers.map((u) => (
                                <option key={u.user_id} value={u.user_id}>{u.username || u.full_name || u.user_id.slice(0, 8)}</option>
                              ))}
                            </select>
                            <Button
                              size="sm"
                              disabled={!addUserId[team.id]}
                              onClick={() => {
                                const uid = addUserId[team.id];
                                const p = profileMap.get(uid);
                                addMember.mutate({ teamId: team.id, userId: uid, teamName: team.name, username: p?.username || 'unknown' });
                              }}
                            >
                              <UserPlus className="h-3.5 w-3.5 mr-1" /> Add
                            </Button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {teams?.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No teams</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Score Adjustment Dialog */}
      <Dialog open={!!scoreDialog} onOpenChange={() => { setScoreDialog(null); setScoreAmount(''); }}>
        <DialogContent className="gradient-card border-border">
          <DialogHeader>
            <DialogTitle>
              {scoreDialog?.type === 'bonus' ? 'Add Bonus Points' : 'Deduct Points'} — {scoreDialog?.teamName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="number"
              min="1"
              placeholder="Points amount"
              value={scoreAmount}
              onChange={(e) => setScoreAmount(e.target.value)}
              className="bg-muted border-border"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setScoreDialog(null); setScoreAmount(''); }}>Cancel</Button>
              <Button
                onClick={() => {
                  const amt = parseInt(scoreAmount);
                  if (!amt || amt <= 0 || !scoreDialog) return;
                  adjustScore.mutate({
                    teamId: scoreDialog.teamId,
                    amount: scoreDialog.type === 'bonus' ? amt : -amt,
                    teamName: scoreDialog.teamName,
                  });
                }}
                disabled={!scoreAmount || parseInt(scoreAmount) <= 0}
                className={scoreDialog?.type === 'bonus' ? 'gradient-primary text-primary-foreground' : 'bg-destructive text-destructive-foreground'}
              >
                {scoreDialog?.type === 'bonus' ? 'Add Points' : 'Deduct Points'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
