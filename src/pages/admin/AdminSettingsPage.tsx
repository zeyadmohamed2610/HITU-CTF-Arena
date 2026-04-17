import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminLog } from '@/lib/adminLog';

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['ctf-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('ctf_settings').select('*').limit(1).maybeSingle();
      return data;
    },
  });

  const [ctfName, setCtfName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [maxTeamSize, setMaxTeamSize] = useState('4');
  const [allowPostCtf, setAllowPostCtf] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (settings && !initialized) {
      setCtfName(settings.ctf_name || '');
      if (settings.start_time) setStartTime(toCairoInput(settings.start_time));
      if (settings.end_time) setEndTime(toCairoInput(settings.end_time));
      setMaxTeamSize(String((settings as any).max_team_size ?? 4));
      setAllowPostCtf(Boolean((settings as any).allow_post_ctf_submissions));
      setInitialized(true);
    }
  }, [settings, initialized]);

  const updateSettings = useMutation({
    mutationFn: async () => {
      const payload: any = {
        ctf_name: ctfName,
        start_time: startTime ? fromCairoInput(startTime) : null,
        end_time: endTime ? fromCairoInput(endTime) : null,
        max_team_size: Math.max(1, parseInt(maxTeamSize) || 4),
        allow_post_ctf_submissions: allowPostCtf,
        updated_at: new Date().toISOString(),
      };
      if (settings?.id) {
        const { error } = await supabase.from('ctf_settings').update(payload).eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ctf_settings').insert(payload);
        if (error) throw error;
      }
      await adminLog('update_ctf_settings', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ctf-settings'] });
      toast.success('Competition configuration saved');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to save'),
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-sans font-bold">Competition Configuration</h1>
      </div>

      <Card className="gradient-card border-border max-w-2xl">
        <CardHeader>
          <CardTitle className="font-sans">Competition Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>CTF Name</Label>
            <Input value={ctfName} onChange={(e) => setCtfName(e.target.value)} placeholder="My CTF Competition" className="bg-muted border-border" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time (Cairo/EET)</Label>
              <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-muted border-border" />
              {startTime && <p className="text-xs text-muted-foreground">{formatCairoTime(fromCairoInput(startTime))}</p>}
            </div>
            <div className="space-y-2">
              <Label>End Time (Cairo/EET)</Label>
              <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="bg-muted border-border" />
              {endTime && <p className="text-xs text-muted-foreground">{formatCairoTime(fromCairoInput(endTime))}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Max Team Size (members per team)</Label>
            <Input
              type="number"
              min="1"
              max="50"
              value={maxTeamSize}
              onChange={(e) => setMaxTeamSize(e.target.value)}
              className="bg-muted border-border max-w-xs"
            />
            <p className="text-xs text-muted-foreground">Maximum number of players allowed per team. New members will be blocked from joining once this limit is reached.</p>
          </div>

          <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-border bg-muted/30">
            <div className="space-y-1">
              <Label className="text-base">Allow submissions after CTF ends</Label>
              <p className="text-xs text-muted-foreground max-w-md">
                When ON, players can still submit flags after End Time but won't earn any points or appear on the scoreboard.
                When OFF, all submissions are blocked and a "CTF Ended" message is shown.
              </p>
            </div>
            <Switch checked={allowPostCtf} onCheckedChange={setAllowPostCtf} />
          </div>

          <p className="text-sm text-muted-foreground">
            All times are in <strong>Africa/Cairo (EET)</strong> timezone, 12-hour format. Challenges will be locked until the start time.
          </p>

          <Button onClick={() => updateSettings.mutate()} disabled={updateSettings.isPending} className="gradient-primary text-primary-foreground">
            {updateSettings.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function toCairoInput(isoStr: string): string {
  const d = new Date(isoStr);
  const cairo = new Date(d.toLocaleString('en-US', { timeZone: 'Africa/Cairo' }));
  const y = cairo.getFullYear();
  const m = String(cairo.getMonth() + 1).padStart(2, '0');
  const day = String(cairo.getDate()).padStart(2, '0');
  const h = String(cairo.getHours()).padStart(2, '0');
  const min = String(cairo.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

function fromCairoInput(localStr: string): string {
  return `${localStr}:00+02:00`;
}

function formatCairoTime(isoStr: string): string {
  return new Date(isoStr).toLocaleString('en-US', {
    timeZone: 'Africa/Cairo',
    hour: 'numeric', minute: '2-digit', hour12: true,
    year: 'numeric', month: 'short', day: 'numeric',
  });
}
