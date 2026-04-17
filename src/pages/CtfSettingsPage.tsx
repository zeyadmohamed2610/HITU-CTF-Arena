import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Settings, Clock, Play, Pause } from 'lucide-react';
import { format } from 'date-fns';

interface CtfSettings {
  id: string;
  start_time: string | null;
  end_time: string | null;
  is_active: boolean;
}

export default function CtfSettingsPage() {
  const { isAdmin } = useAuthStore();
  const queryClient = useQueryClient();
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['ctf-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ctf_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return data as CtfSettings | null;
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<CtfSettings>) => {
      if (!settings?.id) {
        // Create new settings
        const { data, error } = await supabase
          .from('ctf_settings')
          .insert(updates)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        // Update existing settings
        const { data, error } = await supabase
          .from('ctf_settings')
          .update(updates)
          .eq('id', settings.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ctf-settings'] });
      toast.success('CTF settings updated successfully');
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast.error('Failed to update CTF settings');
    },
  });

  const handleSaveSettings = () => {
    const updates: Partial<CtfSettings> = {
      start_time: startTime || null,
      end_time: endTime || null,
    };

    updateSettingsMutation.mutate(updates);
  };

  const handleToggleActive = (active: boolean) => {
    updateSettingsMutation.mutate({ is_active: active });
  };

  if (!isAdmin()) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p>You must be an administrator to access this page.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            CTF Settings Management
          </CardTitle>
          <CardDescription>
            Configure the HITU CTF Arena competition parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Current Status</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {settings?.is_active ? (
                  <Play className="h-4 w-4 text-green-500" />
                ) : (
                  <Pause className="h-4 w-4 text-gray-500" />
                )}
                <span>CTF is {settings?.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <Switch
                checked={settings?.is_active || false}
                onCheckedChange={handleToggleActive}
                disabled={updateSettingsMutation.isPending}
              />
            </div>

            {settings?.start_time && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Start: {format(new Date(settings.start_time), 'PPP p')}</span>
              </div>
            )}

            {settings?.end_time && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>End: {format(new Date(settings.end_time), 'PPP p')}</span>
              </div>
            )}
          </div>

          {/* Settings Form */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Update Settings</h3>

            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="Set CTF start time"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <Input
                id="end-time"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="Set CTF end time"
              />
            </div>

            <Button
              onClick={handleSaveSettings}
              disabled={updateSettingsMutation.isPending}
              className="w-full"
            >
              {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Instructions:</h4>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>Set start and end times to schedule the CTF competition</li>
              <li>Toggle "Active" to enable/disable the CTF for participants</li>
              <li>Participants can only access challenges when CTF is active and within time bounds</li>
              <li>Leave times empty for no time restrictions (except active toggle)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}