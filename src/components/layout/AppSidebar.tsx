import {
  Flag,
  Trophy,
  UsersRound,
  LayoutDashboard,
  Shield,
  FileText,
  MessageSquare,
  User,
  LogOut,
  Settings,
  Users,
  Bell,
  ScrollText,
  UserCircle,
  Info,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';

const playerItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Challenges', url: '/challenges', icon: Flag },
  { title: 'Scoreboard', url: '/scoreboard', icon: Trophy },
  { title: 'My Team', url: '/my-team', icon: UsersRound },
  { title: 'Users', url: '/users', icon: UserCircle },
  { title: 'Teams', url: '/teams', icon: Users },
  { title: 'Announcements', url: '/announcements', icon: Bell, showUnreadDot: true as const },
  { title: 'Info', url: '/info', icon: Info },
  { title: 'Rules', url: '/rules', icon: ScrollText },
  { title: 'Tickets', url: '/tickets', icon: MessageSquare },
  { title: 'Profile', url: '/profile', icon: User },
];

const authorItems = [
  { title: 'My Challenges', url: '/author/challenges', icon: FileText },
];

const adminItems = [
  { title: 'Admin Panel', url: '/admin', icon: Shield },
  { title: 'Manage Users', url: '/admin/users', icon: Users },
  { title: 'Manage Teams', url: '/admin/teams', icon: Users },
  { title: 'Categories', url: '/admin/categories', icon: Settings },
  { title: 'Announcements', url: '/admin/announcements', icon: Bell },
  { title: 'Logs', url: '/admin/logs', icon: ScrollText },
  { title: 'Competition Config', url: '/admin/settings', icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { isAdmin, isAuthor, signOut, profile } = useAuthStore();

  const { data: ctfSettings } = useQuery({
    queryKey: ['ctf-settings-sidebar'],
    queryFn: async () => {
      const { data } = await supabase.from('ctf_settings').select('ctf_name').limit(1).maybeSingle();
      return data;
    },
    staleTime: 60000,
  });

  const { data: latestAnnouncement } = useQuery({
    queryKey: ['announcements-unread'],
    queryFn: async () => {
      const { data } = await supabase
        .from('announcements')
        .select('created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    refetchInterval: 30000,
  });

  const lastSeen = typeof window !== 'undefined' ? localStorage.getItem('announcements_last_seen') : null;
  const hasUnread = !!latestAnnouncement?.created_at && (!lastSeen || latestAnnouncement.created_at > lastSeen);

  const ctfName = ctfSettings?.ctf_name || 'CTF Platform';

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent>
        {/* Only show the logo header when expanded */}
        <div
          className="border-b border-border overflow-hidden transition-all"
          style={{ height: collapsed ? 0 : 'auto', padding: collapsed ? 0 : undefined }}
        >
          {!collapsed && (
            <div className="p-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                  <Flag className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-sans font-bold text-lg text-gradient truncate">{ctfName}</span>
              </div>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {playerItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === '/'} className="hover:bg-muted/50" activeClassName="bg-accent/30 text-accent-foreground font-medium">
                      <span className="relative mr-2 inline-flex">
                        <item.icon className="h-4 w-4" />
                        {(item as any).showUnreadDot && hasUnread && (
                          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
                        )}
                      </span>
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(isAuthor() || isAdmin()) && (
          <SidebarGroup>
            <SidebarGroupLabel>Author</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {authorItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className="hover:bg-muted/50" activeClassName="bg-accent/30 text-accent-foreground font-medium">
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isAdmin() && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className="hover:bg-muted/50" activeClassName="bg-accent/30 text-accent-foreground font-medium">
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-3">
        {!collapsed && profile && (
          <div className="text-sm text-muted-foreground mb-2 truncate">
            {profile.username || 'Player'}
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start text-muted-foreground hover:text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          {!collapsed && 'Sign Out'}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
