import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  User, 
  Users, 
  Settings, 
  LogOut,
  Home,
  Eye,
  ChevronRight,
  Lightbulb,
  Receipt
} from 'lucide-react';

export const AppLayout = () => {
  const { user, profile, signOut, isInternalAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getRoleBadgeVariant = (role: string | null, isInternal: boolean) => {
    if (role === 'internal_admin') return 'default';
    if (isInternal) return 'secondary';
    return 'outline';
  };

  const menuItems = [
    {
      title: 'Global Dashboard',
      icon: Home,
      path: '/app',
      show: true
    },
    {
      title: 'Global Actions',
      icon: Settings,
      path: '/app/actions',
      show: true
    },
    {
      title: 'Global Tasks',
      icon: Settings,
      path: '/app/tasks',
      show: true
    },
    {
      title: 'Global Calendar',
      icon: Settings,
      path: '/app/calendar',
      show: true
    },
    {
      title: 'Global Models',
      icon: Eye,
      path: '/app/models',
      show: true
    },
    {
      title: 'Expenses',
      icon: Receipt,
      path: '/app/expenses',
      show: true
    },
    {
      title: 'Implementation Project',
      icon: Settings,
      path: '/app/projects',
      show: true
    },
    {
      title: 'Solutions Consulting',
      icon: Eye,
      path: '/app/solutions',
      show: true
    },
    {
      title: 'Profile',
      icon: User,
      path: '/app/profile',
      show: true
    },
    {
      title: 'User Management',
      icon: Users,
      path: '/app/admin/users',
      show: isInternalAdmin()
    },
    {
      title: 'Master Data',
      icon: Settings,
      path: '/app/admin/masterdata',
      show: isInternalAdmin()
    }
  ];

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader className="border-b border-sidebar-border p-4">
            <div className="flex items-center gap-3">
              <img src="/lovable-uploads/4fec4d14-a56e-4a44-8256-ac94aa43da5c.png" alt="Thingtrax" className="w-8 h-8" />
              <div>
                <h2 className="font-helvetica-display font-semibold text-sidebar-foreground text-lg">thingtrax</h2>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarMenu className="p-2">
              {menuItems.filter(item => item.show && item.title !== 'Master Data').map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => handleNavigation(item.path)}
                    isActive={location.pathname === item.path}
                    className="w-full justify-start"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {isInternalAdmin() && (
                <Collapsible>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="w-full justify-start">
                        <Settings className="h-4 w-4" />
                        <span>Master Data</span>
                        <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            onClick={() => handleNavigation('/app/admin/masterdata')}
                            isActive={location.pathname === '/app/admin/masterdata'}
                          >
                            Project Templates
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}
              
              {isInternalAdmin() && (
                <Collapsible>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="w-full justify-start">
                        <Settings className="h-4 w-4" />
                        <span>Hardware MasterData</span>
                        <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            onClick={() => handleNavigation('/app/admin/lights')}
                            isActive={location.pathname === '/app/admin/lights'}
                          >
                            <Lightbulb className="h-4 w-4" />
                            Lights
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            onClick={() => handleNavigation('/app/admin/cameras')}
                            isActive={location.pathname === '/app/admin/cameras'}
                          >
                            <Eye className="h-4 w-4" />
                            Cameras
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            onClick={() => handleNavigation('/app/admin/lenses')}
                            isActive={location.pathname === '/app/admin/lenses'}
                          >
                            <Settings className="h-4 w-4" />
                            Lenses
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            onClick={() => handleNavigation('/app/admin/plcs')}
                            isActive={location.pathname === '/app/admin/plcs'}
                          >
                            <Settings className="h-4 w-4" />
                            PLCs
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            onClick={() => handleNavigation('/app/admin/servers')}
                            isActive={location.pathname === '/app/admin/servers'}
                          >
                            <Settings className="h-4 w-4" />
                            Servers
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            onClick={() => handleNavigation('/app/admin/gateways')}
                            isActive={location.pathname === '/app/admin/gateways'}
                          >
                            <Settings className="h-4 w-4" />
                            Gateways
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            onClick={() => handleNavigation('/app/admin/receivers')}
                            isActive={location.pathname === '/app/admin/receivers'}
                          >
                            <Settings className="h-4 w-4" />
                            Receivers
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            onClick={() => handleNavigation('/app/admin/tv-displays')}
                            isActive={location.pathname === '/app/admin/tv-displays'}
                          >
                            <Settings className="h-4 w-4" />
                            TV Displays
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}
            </SidebarMenu>
          </SidebarContent>
          
          <SidebarFooter className="border-t border-sidebar-border p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url || ''} />
                  <AvatarFallback className="text-xs">
                    {getInitials(profile?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {profile?.name || 'User'}
                  </p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              
              {profile?.role && (
                <Badge 
                  variant={getRoleBadgeVariant(profile.role, profile.is_internal)}
                  className="text-xs"
                >
                  {profile.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              )}
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={signOut}
                className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        
        <main className="flex-1 overflow-auto">
          <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center px-4">
              <SidebarTrigger />
            </div>
          </div>
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;