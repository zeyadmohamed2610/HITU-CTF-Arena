import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Search, Ban, Shield, UserCheck, Trash2, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { adminLog } from '@/lib/adminLog';
import type { AppRole } from '@/stores/authStore';
import { Link } from 'react-router-dom';

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [scoreDialog, setScoreDialog] = useState<{ userId: string; username: string; currentPoints: number; type: 'bonus' | 'minus' } | null>(null);
  const [scoreAmount, setScoreAmount] = useState('');

  const { data: users } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const { data: allRoles } = useQuery({
    queryKey: ['admin-all-roles'],
    queryFn: async () => {
      const { data } = await supabase.from('user_roles').select('*');
      const map: Record<string, string[]> = {};
      data?.forEach((r) => {
        if (!map[r.user_id]) map[r.user_id] = [];
        map[r.user_id].push(r.role);
      });
      return map;
    },
  });

  const toggleBan = useMutation({
    mutationFn: async ({ userId, banned, username }: { userId: string; banned: boolean; username?: string }) => {
      const { error } = await supabase.from('profiles').update({ is_banned: banned }).eq('user_id', userId);
      if (error) throw error;
      await adminLog(banned ? 'ban_user' : 'unban_user', { user_id: userId, username });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('User updated'); },
    onError: () => toast.error('Failed to update user'),
  });

  const deleteUser = useMutation({
    mutationFn: async ({ userId, username }: { userId: string; username?: string }) => {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { user_id: userId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      await adminLog('delete_user', { user_id: userId, username });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); setDeleteConfirm(null); toast.success('User permanently deleted'); },
    onError: (e: any) => toast.error(e?.message || 'Failed to delete user'),
  });

  const assignRole = useMutation({
    mutationFn: async ({ userId, role, username }: { userId: string; role: AppRole; username?: string }) => {
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role });
      if (error) throw error;
      await adminLog('assign_role', { user_id: userId, username, role });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-all-roles'] }); toast.success('Role assigned'); },
    onError: (e: any) => { if (e.code === '23505') toast.info('User already has this role'); else toast.error('Failed to assign role'); },
  });

  const removeRole = useMutation({
    mutationFn: async ({ userId, role, username }: { userId: string; role: AppRole; username?: string }) => {
      const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role);
      if (error) throw error;
      await adminLog('remove_role', { user_id: userId, username, role });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-all-roles'] }); toast.success('Role removed'); },
    onError: () => toast.error('Failed to remove role'),
  });

  const adjustUserScore = useMutation({
    mutationFn: async ({ userId, amount, username }: { userId: string; amount: number; username: string }) => {
      const user = users?.find(u => u.user_id === userId);
      if (!user) throw new Error('User not found');
      const newPoints = Math.max(0, user.total_points + amount);
      const { error } = await supabase.from('profiles').update({ total_points: newPoints }).eq('user_id', userId);
      if (error) throw error;
      await adminLog('adjust_user_score', { user: username, amount, new_total: newPoints });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setScoreDialog(null);
      setScoreAmount('');
      toast.success('Score adjusted');
    },
    onError: () => toast.error('Failed to adjust score'),
  });

  const filtered = users?.filter((u) =>
    !search || u.username?.toLowerCase().includes(search.toLowerCase()) || (u as any).full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const roleColors: Record<string, string> = {
    admin: 'bg-destructive/20 text-destructive',
    ctf_author: 'bg-info/20 text-info',
    player: 'bg-primary/20 text-primary',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-info" />
        <h1 className="text-3xl font-sans font-bold">User Management</h1>
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
                  <th className="text-left p-4 font-medium">Username</th>
                  <th className="text-left p-4 font-medium">Full Name</th>
                  <th className="text-left p-4 font-medium">Points</th>
                  <th className="text-left p-4 font-medium">IP</th>
                  <th className="text-left p-4 font-medium">Roles</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered?.map((user) => {
                  const roles = allRoles?.[user.user_id] ?? [];
                  return (
                    <tr key={user.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-4">
                        <Link to={`/user/${user.user_id}`} className="font-medium text-primary hover:underline">
                          {user.username || 'Anonymous'}
                        </Link>
                      </td>
                      <td className="p-4 text-muted-foreground">{(user as any).full_name || '—'}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-primary">{user.total_points}</span>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-primary hover:text-primary" onClick={() => setScoreDialog({ userId: user.user_id, username: user.username || 'Unknown', currentPoints: user.total_points, type: 'bonus' })}>
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => setScoreDialog({ userId: user.user_id, username: user.username || 'Unknown', currentPoints: user.total_points, type: 'minus' })}>
                            <Minus className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs text-muted-foreground">{user.ip_address || '—'}</td>
                      <td className="p-4">
                        <div className="flex gap-1 flex-wrap">
                          {roles.map((r) => (
                            <Badge key={r} variant="outline" className={roleColors[r] || ''}>{r}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        {user.is_banned ? (
                          <Badge variant="destructive">Banned</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-primary/20 text-primary">Active</Badge>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => setSelectedUser(user)} className="text-muted-foreground hover:text-foreground">
                            <Shield className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleBan.mutate({ userId: user.user_id, banned: !user.is_banned, username: user.username ?? undefined })}
                            className={user.is_banned ? 'text-primary hover:text-primary' : 'text-destructive hover:text-destructive'}
                          >
                            {user.is_banned ? <UserCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(user.user_id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="gradient-card border-border">
          <DialogHeader><DialogTitle>Delete User</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete the user and all their data.</p>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              if (!deleteConfirm) return;
              const u = users?.find(x => x.user_id === deleteConfirm);
              deleteUser.mutate({ userId: deleteConfirm, username: u?.username ?? undefined });
            }}>Delete User</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Role Management */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="gradient-card border-border">
          {selectedUser && (
            <>
              <DialogHeader><DialogTitle>Manage Roles — {selectedUser.username}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Current Roles</p>
                  <div className="flex gap-2 flex-wrap">
                    {(allRoles?.[selectedUser.user_id] ?? []).map((r) => (
                      <Badge key={r} variant="outline" className={`${roleColors[r] || ''} cursor-pointer`} onClick={() => removeRole.mutate({ userId: selectedUser.user_id, role: r as AppRole, username: selectedUser.username })}>
                        {r} ✕
                      </Badge>
                    ))}
                    {(allRoles?.[selectedUser.user_id] ?? []).length === 0 && <span className="text-sm text-muted-foreground">No roles</span>}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Add Role</p>
                  <div className="flex gap-2">
                    {(['player', 'ctf_author', 'admin'] as AppRole[]).map((role) => (
                      <Button key={role} size="sm" variant="outline" onClick={() => assignRole.mutate({ userId: selectedUser.user_id, role, username: selectedUser.username })} disabled={(allRoles?.[selectedUser.user_id] ?? []).includes(role)}>
                        + {role}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Score Adjustment */}
      <Dialog open={!!scoreDialog} onOpenChange={() => { setScoreDialog(null); setScoreAmount(''); }}>
        <DialogContent className="gradient-card border-border">
          <DialogHeader>
            <DialogTitle>
              {scoreDialog?.type === 'bonus' ? 'Add Bonus Points' : 'Deduct Points'} — {scoreDialog?.username}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Current: {scoreDialog?.currentPoints} pts</p>
          <Input type="number" min="1" placeholder="Points amount" value={scoreAmount} onChange={(e) => setScoreAmount(e.target.value)} className="bg-muted border-border" />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setScoreDialog(null); setScoreAmount(''); }}>Cancel</Button>
            <Button
              onClick={() => {
                const amt = parseInt(scoreAmount);
                if (!amt || amt <= 0 || !scoreDialog) return;
                adjustUserScore.mutate({ userId: scoreDialog.userId, amount: scoreDialog.type === 'bonus' ? amt : -amt, username: scoreDialog.username });
              }}
              disabled={!scoreAmount || parseInt(scoreAmount) <= 0}
              className={scoreDialog?.type === 'bonus' ? 'gradient-primary text-primary-foreground' : 'bg-destructive text-destructive-foreground'}
            >
              {scoreDialog?.type === 'bonus' ? 'Add Points' : 'Deduct Points'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
