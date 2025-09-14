import { ReactNode } from "react";
import { 
  Settings, 
  Receipt, 
  Database, 
  UserCog, 
  Briefcase, 
  Eye,
  Lightbulb,
  Headphones,
  Server,
  Wifi,
  Radio,
  Monitor
} from "lucide-react";

export type Role = "internal_admin" | "internal_user" | "external_admin" | "external_user";

export type NavItem = {
  label: string;
  to?: string;                 // route path
  iconName?: string;           // lucide icon name 
  children?: NavItem[];        // collapsible group
  roles?: Role[];              // allowed roles (omit = all)
  matchPaths?: string[];       // extra paths that should count as active for highlighting
};

export const NAV: NavItem[] = [
  // 1) Solutions Consulting
  {
    label: "Solutions Consulting",
    iconName: "Briefcase",
    roles: ["internal_admin", "internal_user", "external_admin", "external_user"],
    children: [
      {
        label: "Projects",
        to: "/app/solutions",
        matchPaths: ["/app/solutions"],
      }
    ]
  },

  // 2) Project Implementation
  {
    label: "Project Implementation",
    iconName: "Settings",
    roles: ["internal_admin", "internal_user", "external_admin", "external_user"],
    children: [
      {
        label: "Projects",
        to: "/app/projects",
        matchPaths: ["/app/projects"],
      },
      { 
        label: "Dashboard", 
        to: "/app", 
        matchPaths: ["/app", "/app/dashboard"] 
      },
      { 
        label: "Actions", 
        to: "/app/actions", 
        matchPaths: ["/app/actions"] 
      },
      { 
        label: "Tasks", 
        to: "/app/tasks", 
        matchPaths: ["/app/tasks"] 
      },
      { 
        label: "Calendar", 
        to: "/app/calendar", 
        matchPaths: ["/app/calendar"] 
      },
      { 
        label: "Models", 
        to: "/app/models", 
        matchPaths: ["/app/models"] 
      },
    ]
  },

  // 3) BAU
  {
    label: "BAU",
    iconName: "Headphones",
    roles: ["internal_admin", "internal_user", "external_admin", "external_user"],
    children: [
      {
        label: "Projects",
        to: "/app/bau",
        matchPaths: ["/app/bau"],
      },
      {
        label: "Weekly Review",
        to: "/app/bau/weekly-review-page",
        matchPaths: ["/app/bau/weekly-review-page"],
      }
    ]
  },

  // 4) Expenses
  {
    label: "Expenses",
    iconName: "Receipt",
    to: "/app/expenses",
    roles: ["internal_admin", "internal_user"], 
    matchPaths: ["/app/expenses"]
  },

  // 5) Master Data (consolidate prior Master Data + Hardware MasterData children)
  {
    label: "Master Data",
    iconName: "Database",
    roles: ["internal_admin"], 
    children: [
      { 
        label: "Project Templates", 
        to: "/app/admin/masterdata",
        matchPaths: ["/app/admin/masterdata"]
      },
      { 
        label: "Cameras", 
        to: "/app/admin/cameras",
        iconName: "Eye",
        matchPaths: ["/app/admin/cameras"]
      },
      { 
        label: "Lenses", 
        to: "/app/admin/lenses",
        iconName: "Settings",
        matchPaths: ["/app/admin/lenses"]
      },
      { 
        label: "Lights", 
        to: "/app/admin/lights",
        iconName: "Lightbulb",
        matchPaths: ["/app/admin/lights"]
      },
      { 
        label: "Gateways", 
        to: "/app/admin/gateways",
        iconName: "Wifi",
        matchPaths: ["/app/admin/gateways"]
      },
      { 
        label: "Receivers", 
        to: "/app/admin/receivers",
        iconName: "Radio",
        matchPaths: ["/app/admin/receivers"]
      },
      { 
        label: "Servers", 
        to: "/app/admin/servers",
        iconName: "Server",
        matchPaths: ["/app/admin/servers"]
      },
      { 
        label: "PLCs", 
        to: "/app/admin/plcs",
        iconName: "Settings",
        matchPaths: ["/app/admin/plcs"]
      },
      { 
        label: "TV Displays", 
        to: "/app/admin/tv-displays",
        iconName: "Monitor",
        matchPaths: ["/app/admin/tv-displays"]
      },
    ]
  },

  // 6) User Management
  {
    label: "User Management",
    iconName: "UserCog",
    to: "/app/admin/users",
    roles: ["internal_admin"],
    matchPaths: ["/app/admin/users"]
  },
];

// Icon mapping for dynamic rendering
export const ICON_MAP = {
  Briefcase,
  Settings,
  Receipt,
  Database,
  UserCog,
  Eye,
  Lightbulb,
  Headphones,
  Server,
  Wifi,
  Radio,
  Monitor,
};

export function visibleItemsForRole(role: Role | null | undefined): NavItem[] {
  const canSee = (item: NavItem) =>
    !item.roles || (role && item.roles.includes(role as Role));

  const filterRecursive = (items: NavItem[]): NavItem[] =>
    items
      .filter(canSee)
      .map(i => i.children ? ({ ...i, children: filterRecursive(i.children) }) : i)
      .filter(i => (i.children ? i.children.length > 0 : true));

  return filterRecursive(NAV);
}