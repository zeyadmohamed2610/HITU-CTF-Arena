import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flag, Timer } from 'lucide-react';

interface CTFGateProps {
  children: React.ReactNode;
}

export function CTFGate({ children }: CTFGateProps) {
  const [now, setNow] = useState(new Date());

  const { data: settings, isLoading } = useQuery({
    queryKey: ['ctf-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('ctf_settings').select('*').limit(1).single();
      return data;
    },
  });

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) return null;

  // If no start time set, allow access
  if (!settings?.start_time) return <>{children}</>;

  const startTime = new Date(settings.start_time);
  const diff = startTime.getTime() - now.getTime();

  if (diff <= 0) return <>{children}</>;

  // Countdown
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="gradient-card border-border max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full gradient-primary flex items-center justify-center mb-4 glow-primary">
            <Flag className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-sans text-gradient">
            {settings.ctf_name || 'CTF'} Starts Soon
          </CardTitle>
          <p className="text-muted-foreground mt-2">Challenges will be available when the countdown reaches zero</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3 text-center">
            {[
              { label: 'Days', value: days },
              { label: 'Hours', value: hours },
              { label: 'Minutes', value: minutes },
              { label: 'Seconds', value: seconds },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-lg bg-muted/50">
                <p className="text-3xl font-mono font-bold text-primary">{String(item.value).padStart(2, '0')}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-4">
            Start: {startTime.toLocaleString('en-US', {
              timeZone: 'Africa/Cairo',
              hour12: true,
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })} (Cairo)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
