import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Plus, LogIn, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface TeamGateProps {
  children: React.ReactNode;
}

export function TeamGate({ children }: TeamGateProps) {
  const { user, isAdmin, isAuthor } = useAuthStore();
  const queryClient = useQueryClient();
  const [newTeamName, setNewTeamName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const { data: userTeam, isLoading } = useQuery({
    queryKey: ['user-team', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('team_members')
        .select('team_id, teams(id, name, invite_code)')
        .eq('user_id', user!.id)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const createTeam = useMutation({
    mutationFn: async (name: string) => {
      // Create team with leader_id
      const { data: team, error: teamErr } = await supabase
        .from('teams')
        .insert({ name, leader_id: user!.id } as any)
        .select()
        .single();
      if (teamErr) throw teamErr;

      const { error: memberErr } = await supabase
        .from('team_members')
        .insert({ team_id: team.id, user_id: user!.id });
      if (memberErr) throw memberErr;

      return team;
    },
    onSuccess: () => {
      toast.success('Team created! You are the team leader.');
      queryClient.invalidateQueries({ queryKey: ['user-team'] });
    },
    onError: (e: any) => toast.error(e.message || 'Failed to create team'),
  });

  const joinTeam = useMutation({
    mutationFn: async (code: string) => {
      const { data: team, error: findErr } = await supabase
        .from('teams')
        .select('id')
        .eq('invite_code', code.toUpperCase().trim())
        .single();
      if (findErr || !team) throw new Error('Invalid invite code');

      // Enforce team size limit from competition configuration
      const { data: settings } = await supabase
        .from('ctf_settings')
        .select('max_team_size')
        .limit(1)
        .maybeSingle();
      const maxSize = (settings as any)?.max_team_size ?? 4;
      const { count } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', team.id);
      if ((count ?? 0) >= maxSize) {
        throw new Error(`This team is full (max ${maxSize} members)`);
      }

      const { error: joinErr } = await supabase
        .from('team_members')
        .insert({ team_id: team.id, user_id: user!.id });
      if (joinErr) throw joinErr;

      return team;
    },
    onSuccess: () => {
      toast.success('Joined team!');
      queryClient.invalidateQueries({ queryKey: ['user-team'] });
    },
    onError: (e: any) => toast.error(e.message || 'Failed to join team'),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Admin and CTF Author don't need a team
  // Players need a team to access the platform
  if (isAdmin() || isAuthor() || userTeam) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md gradient-card border-border">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full gradient-primary flex items-center justify-center mb-3">
            <Users className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl font-sans">Join or Create a Team</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            You need a team to compete. Create a new team or join with an invite code.
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create">
            <TabsList className="grid w-full grid-cols-2 bg-muted">
              <TabsTrigger value="create">Create Team</TabsTrigger>
              <TabsTrigger value="join">Join Team</TabsTrigger>
            </TabsList>
            <TabsContent value="create" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Team Name</Label>
                <Input
                  placeholder="Enter team name..."
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="bg-muted border-border"
                />
              </div>
              <Button
                className="w-full gradient-primary text-primary-foreground"
                disabled={!newTeamName.trim() || createTeam.isPending}
                onClick={() => createTeam.mutate(newTeamName.trim())}
              >
                {createTeam.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create Team
              </Button>
            </TabsContent>
            <TabsContent value="join" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Invite Code</Label>
                <Input
                  placeholder="Enter invite code (e.g. A1B2C3D4)"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="bg-muted border-border font-mono tracking-widest text-center"
                  maxLength={8}
                />
              </div>
              <Button
                className="w-full gradient-primary text-primary-foreground"
                disabled={!joinCode.trim() || joinTeam.isPending}
                onClick={() => joinTeam.mutate(joinCode.trim())}
              >
                {joinTeam.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <LogIn className="h-4 w-4 mr-2" />
                )}
                Join Team
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
