import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { User, Save, Users, Crown, Copy, Check, Trophy, Droplet } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function ProfilePage() {
  const { profile, user, roles } = useAuthStore();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [website, setWebsite] = useState('');
  const [copied, setCopied] = useState(false);

  // Sync local state when profile loads from store
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setFullName((profile as any).full_name || '');
      setWebsite(profile.website || '');
    }
  }, [profile]);

  const { data: userTeam } = useQuery({
    queryKey: ['user-team-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('team_members')
        .select('team_id, teams(id, name, invite_code, leader_id)')
        .eq('user_id', user!.id)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ['profile-stats', user?.id],
    queryFn: async () => {
      const [{ count: solveCount }, { count: firstBloodCount }] = await Promise.all([
        supabase.from('solves').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('challenges').select('*', { count: 'exact', head: true }).eq('first_blood_user_id', user!.id),
      ]);
      return { solveCount: solveCount ?? 0, firstBloodCount: firstBloodCount ?? 0 };
    },
    enabled: !!user,
  });

  const team = userTeam?.teams as any;
  const isLeader = team?.leader_id === user?.id;

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ username, website, full_name: fullName } as any)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Profile updated');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => toast.error('Failed to update profile'),
  });

  const copyInviteCode = () => {
    if (team?.invite_code) {
      navigator.clipboard.writeText(team.invite_code);
      setCopied(true);
      toast.success('Invite code copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-sans font-bold">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="gradient-card border-border">
          <CardContent className="p-4 text-center">
            <Trophy className="h-5 w-5 text-primary mx-auto mb-1" />
            <div className="text-2xl font-mono font-bold text-primary">{profile?.total_points ?? 0}</div>
            <div className="text-xs text-muted-foreground">Points</div>
          </CardContent>
        </Card>
        <Card className="gradient-card border-border">
          <CardContent className="p-4 text-center">
            <Check className="h-5 w-5 text-info mx-auto mb-1" />
            <div className="text-2xl font-mono font-bold text-info">{stats?.solveCount ?? 0}</div>
            <div className="text-xs text-muted-foreground">Solves</div>
          </CardContent>
        </Card>
        <Card className="gradient-card border-border">
          <CardContent className="p-4 text-center">
            <Droplet className="h-5 w-5 text-destructive mx-auto mb-1" />
            <div className="text-2xl font-mono font-bold text-destructive">{stats?.firstBloodCount ?? 0}</div>
            <div className="text-xs text-muted-foreground">First Bloods</div>
          </CardContent>
        </Card>
      </div>

      <Card className="gradient-card border-border">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="font-sans">{profile?.username || 'Player'}</CardTitle>
              <div className="flex gap-2 mt-1">
                {roles.map((role) => (
                  <Badge key={role} variant="outline" className="text-xs">{role}</Badge>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-muted border-border" />
          </div>
          <div className="space-y-2">
            <Label>Username (Security Name)</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} className="bg-muted border-border" />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} className="bg-muted border-border" placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ''} disabled className="bg-muted/50 border-border" />
          </div>
          <Button onClick={() => updateProfile.mutate()} className="gradient-primary text-primary-foreground">
            <Save className="h-4 w-4 mr-2" /> Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Team Info Card */}
      {team && (
        <Card className="gradient-card border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-warning" />
              <CardTitle className="font-sans text-lg">Team</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Link to={`/team/${team.id}`} className="text-lg font-medium text-primary hover:underline">
                  {team.name}
                </Link>
                {isLeader && (
                  <div className="flex items-center gap-1 mt-1">
                    <Crown className="h-4 w-4 text-warning" />
                    <span className="text-xs text-warning">Team Leader</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Invite Code</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded-md font-mono text-sm tracking-widest text-center">
                  {team.invite_code}
                </code>
                <Button size="sm" variant="outline" onClick={copyInviteCode}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Share this code with others so they can join your team</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
