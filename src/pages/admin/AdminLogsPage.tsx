import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollText, Search, Filter, AlertTriangle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ACTION_OPTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'login', label: 'Login' },
  { value: 'login_failed', label: 'Login Failed' },
  { value: 'signup', label: 'Signup' },
  { value: 'flag_submit_correct', label: 'Correct Flag' },
  { value: 'flag_submit_wrong', label: 'Wrong Flag' },
  { value: 'page_visit', label: 'Page Visit' },
  { value: 'team_create', label: 'Team Create' },
  { value: 'team_join', label: 'Team Join' },
  { value: 'hint_unlock', label: 'Hint Unlock' },
  { value: 'profile_update', label: 'Profile Update' },
  { value: 'ticket_create', label: 'Ticket Create' },
];

const actionColors: Record<string, string> = {
  login: 'bg-info/20 text-info',
  login_failed: 'bg-destructive/20 text-destructive',
  signup: 'bg-primary/20 text-primary',
  flag_submit_correct: 'bg-primary/20 text-primary',
  flag_submit_wrong: 'bg-destructive/20 text-destructive',
  page_visit: 'bg-muted text-muted-foreground',
  team_create: 'bg-warning/20 text-warning',
  team_join: 'bg-warning/20 text-warning',
  team_leave: 'bg-warning/20 text-warning',
  hint_unlock: 'bg-accent/20 text-accent-foreground',
  profile_update: 'bg-muted text-muted-foreground',
  ticket_create: 'bg-info/20 text-info',
};

// Heuristics to flag possible attack signatures in request fingerprints
const SUSPICIOUS_UA_PATTERNS = /bot|crawl|spider|wget|curl|python|scan|sqlmap|nikto|nmap|burp|hydra|ffuf|gobuster|dirb|nuclei|httpx/i;
const SUSPICIOUS_PATH_PATTERNS = /\.\.|\/etc\/|\/admin\.php|wp-admin|\.env|\.git|<script|union\s+select|or\s+1=1|alert\(/i;

function getRiskFlags(log: any): string[] {
  const flags: string[] = [];
  const d = log.details || {};
  const ua = String(d.user_agent || '');
  const path = String(d.path || '');
  if (ua && SUSPICIOUS_UA_PATTERNS.test(ua)) flags.push('Bot/Scanner UA');
  if (path && SUSPICIOUS_PATH_PATTERNS.test(path)) flags.push('Suspicious path');
  if (log.action === 'login_failed') flags.push('Failed login');
  if (log.action === 'flag_submit_wrong') flags.push('Wrong flag');
  return flags;
}

export default function AdminLogsPage() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [riskOnly, setRiskOnly] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const { data: logs } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  const { data: profileMap } = useQuery({
    queryKey: ['logs-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_id, username');
      const map: Record<string, string> = {};
      data?.forEach((p) => { if (p.user_id && p.username) map[p.user_id] = p.username; });
      return map;
    },
  });

  const { data: adminLogs } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      return (data ?? []).map((l: any) => ({
        ...l,
        user_id: l.admin_id,
        action: `admin:${l.action}`,
      }));
    },
  });

  const allLogs = [...(logs ?? []), ...(adminLogs ?? [])].sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Compute attack stats: rapid wrong-flag bursts and bot UAs
  const attackStats = (() => {
    const wrongFlagPerUser: Record<string, number> = {};
    let botUaCount = 0;
    let suspiciousPathCount = 0;
    let failedLogins = 0;
    logs?.forEach((l: any) => {
      const flags = getRiskFlags(l);
      if (l.action === 'flag_submit_wrong' && l.user_id) {
        wrongFlagPerUser[l.user_id] = (wrongFlagPerUser[l.user_id] || 0) + 1;
      }
      if (flags.includes('Bot/Scanner UA')) botUaCount++;
      if (flags.includes('Suspicious path')) suspiciousPathCount++;
      if (l.action === 'login_failed') failedLogins++;
    });
    const flagBruteforcers = Object.entries(wrongFlagPerUser)
      .filter(([, n]) => n >= 10)
      .map(([uid, n]) => ({ uid, n }));
    return { botUaCount, suspiciousPathCount, failedLogins, flagBruteforcers };
  })();

  const filtered = allLogs.filter((log: any) => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;
    if (riskOnly && getRiskFlags(log).length === 0) return false;
    if (search) {
      const username = profileMap?.[log.user_id] || '';
      const detailStr = JSON.stringify(log.details || {});
      const combined = `${username} ${log.action} ${detailStr}`.toLowerCase();
      if (!combined.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const hasAlerts =
    attackStats.botUaCount > 0 ||
    attackStats.suspiciousPathCount > 0 ||
    attackStats.failedLogins > 5 ||
    attackStats.flagBruteforcers.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ScrollText className="h-8 w-8 text-muted-foreground" />
        <h1 className="text-3xl font-sans font-bold">Activity Logs</h1>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search user, action, UA, path..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted border-border"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[180px] bg-muted border-border">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge
          variant={riskOnly ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setRiskOnly((v) => !v)}
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          Risk only
        </Badge>
      </div>

      {hasAlerts && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="py-3 px-4 space-y-1">
            <p className="text-sm text-destructive font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Possible attack activity detected
            </p>
            <ul className="text-xs text-destructive/90 list-disc pl-5 space-y-0.5">
              {attackStats.botUaCount > 0 && <li>{attackStats.botUaCount} request(s) from bot/scanner user agents</li>}
              {attackStats.suspiciousPathCount > 0 && <li>{attackStats.suspiciousPathCount} suspicious path(s) accessed (LFI/SQLi/XSS patterns)</li>}
              {attackStats.failedLogins > 5 && <li>{attackStats.failedLogins} failed login attempts</li>}
              {attackStats.flagBruteforcers.length > 0 && (
                <li>
                  {attackStats.flagBruteforcers.length} user(s) bruteforcing flags:{' '}
                  {attackStats.flagBruteforcers.slice(0, 5).map((b) => `${profileMap?.[b.uid] || b.uid.slice(0, 6)} (${b.n})`).join(', ')}
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="gradient-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left p-3 font-medium">Time</th>
                  <th className="text-left p-3 font-medium">User</th>
                  <th className="text-left p-3 font-medium">Action</th>
                  <th className="text-left p-3 font-medium">Path</th>
                  <th className="text-left p-3 font-medium">User Agent</th>
                  <th className="text-left p-3 font-medium">Risk</th>
                  <th className="text-left p-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 300).map((log: any) => {
                  const flags = getRiskFlags(log);
                  const d = log.details || {};
                  const ua = String(d.user_agent || '');
                  const path = String(d.path || '');
                  return (
                    <tr key={log.id} className={`border-b border-border/50 hover:bg-muted/30 ${flags.length ? 'bg-destructive/5' : ''}`}>
                      <td className="p-3 text-muted-foreground whitespace-nowrap text-xs">
                        {new Date(log.created_at).toLocaleString('en-US', {
                          timeZone: 'Africa/Cairo',
                          hour12: true,
                          month: 'short', day: 'numeric',
                          hour: 'numeric', minute: '2-digit', second: '2-digit',
                        })}
                      </td>
                      <td className="p-3 font-medium text-xs">
                        {profileMap?.[log.user_id] || (log.user_id ? log.user_id.slice(0, 8) : 'Anonymous')}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={`text-xs ${actionColors[log.action] || ''}`}>
                          {log.action}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground max-w-[180px] truncate" title={path}>
                        {path || '—'}
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground max-w-[220px] truncate" title={ua}>
                        {ua || '—'}
                      </td>
                      <td className="p-3 text-xs">
                        {flags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {flags.map((f) => (
                              <Badge key={f} variant="outline" className="bg-destructive/20 text-destructive text-[10px] px-1.5 py-0">
                                {f}
                              </Badge>
                            ))}
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-3 w-3 mr-1" /> View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No logs found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {filtered.length > 300 && (
            <div className="text-center py-3 text-xs text-muted-foreground">Showing 300 of {filtered.length} logs</div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={(o) => !o && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="outline" className={actionColors[selectedLog?.action] || ''}>
                {selectedLog?.action}
              </Badge>
              <span className="text-sm text-muted-foreground font-normal">
                {selectedLog && new Date(selectedLog.created_at).toLocaleString('en-US', {
                  timeZone: 'Africa/Cairo', hour12: true,
                })}
              </span>
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">User</span>
                <span className="font-mono">{profileMap?.[selectedLog.user_id] || selectedLog.user_id || 'Anonymous'}</span>
                <span className="text-muted-foreground">Log ID</span>
                <span className="font-mono text-xs break-all">{selectedLog.id}</span>
                {getRiskFlags(selectedLog).length > 0 && (
                  <>
                    <span className="text-muted-foreground">Risk</span>
                    <div className="flex flex-wrap gap-1">
                      {getRiskFlags(selectedLog).map((f) => (
                        <Badge key={f} variant="outline" className="bg-destructive/20 text-destructive text-xs">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Full details (JSON)</p>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(selectedLog.details || {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
