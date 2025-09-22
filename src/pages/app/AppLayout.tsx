import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
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
import { LogOut, ChevronRight } from 'lucide-react';
import React from 'react';
import { NAV, visibleItemsForRole, ICON_MAP, type Role, type NavItem } from '@/config/nav';
import { useExpenseAccess } from '@/hooks/useExpenseAccess';
import { useState, useEffect } from 'react';
import InstallButton from '@/components/pwa/InstallButton';
import InstallHelpModal from '@/components/pwa/InstallHelpModal';

export const AppLayout = () => {
  const { user, profile, signOut } = useAuth();
  const { hasAccess: hasExpenseAccess } = useExpenseAccess();
  const navigate = useNavigate();
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  // Load open groups from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('nav:openGroups');
    if (saved) {
      setOpenGroups(JSON.parse(saved));
    } else {
      // Auto-open group containing active route
      const currentPath = location.pathname;
      const autoOpenGroup = NAV.find(item => 
        item.children?.some(child => 
          child.to === currentPath || 
          child.matchPaths?.some(path => currentPath.startsWith(path))
        )
      );
      if (autoOpenGroup) {
        setOpenGroups([autoOpenGroup.label]);
      }
    }
  }, [location.pathname]);

  // Save open groups to localStorage
  useEffect(() => {
    localStorage.setItem('nav:openGroups', JSON.stringify(openGroups));
  }, [openGroups]);

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

  const toggleGroup = (groupLabel: string) => {
    setOpenGroups(prev => 
      prev.includes(groupLabel)
        ? prev.filter(g => g !== groupLabel)
        : [...prev, groupLabel]
    );
  };

  const isActiveRoute = (item: NavItem) => {
    if (item.to && location.pathname === item.to) return true;
    return item.matchPaths?.some(path => location.pathname.startsWith(path)) || false;
  };

  const getIcon = (iconName?: string) => {
    if (!iconName) return null;
    const IconComponent = ICON_MAP[iconName as keyof typeof ICON_MAP];
    return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
  };

  const renderNavItem = (item: NavItem, level = 0) => {
    if (item.children) {
      const isOpen = openGroups.includes(item.label);
      
      return (
        <Collapsible key={item.label} open={isOpen} onOpenChange={() => toggleGroup(item.label)}>
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton className="w-full justify-start">
                {getIcon(item.iconName)}
                <span className={level === 0 ? "uppercase text-xs tracking-wide font-medium" : "text-sm"}>{item.label}</span>
                <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.children.map((child) => renderNavItem(child, level + 1))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );
    } else {
      if (level === 0) {
        return (
          <SidebarMenuItem key={item.to || item.label}>
            <SidebarMenuButton
              onClick={() => item.to && handleNavigation(item.to)}
              isActive={isActiveRoute(item)}
              className="w-full justify-start"
            >
              {getIcon(item.iconName)}
              <span>{item.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      } else {
        return (
          <SidebarMenuSubItem key={item.to || item.label}>
            <SidebarMenuSubButton
              onClick={() => item.to && handleNavigation(item.to)}
              isActive={isActiveRoute(item)}
              className="text-sm rounded-xl"
            >
              {getIcon(item.iconName)}
              <span>{item.label}</span>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        );
      }
    }
  };

  const currentRole = profile?.role as Role;
  let visibleItems = visibleItemsForRole(currentRole);
  
  // Filter out expenses if user doesn't have expense access
  visibleItems = visibleItems.filter(item => {
    if (item.label === 'Expenses' && !hasExpenseAccess) {
      return false;
    }
    return true;
  });

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
              {visibleItems.map(item => renderNavItem(item))}
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
            <div className="flex h-14 items-center justify-between px-4">
              <SidebarTrigger />
              <div className="flex items-center gap-2">
                <InstallButton />
              </div>
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