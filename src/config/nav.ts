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
  Monitor,
  Package,
  AlertTriangle,
  BarChart3,
  User,
  PieChart
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
  // 1) My Work
  {
    label: "My Work",
    iconName: "User",
    to: "/app/my-work",
    roles: ["internal_admin", "internal_user", "external_admin", "external_user"],
    matchPaths: ["/app/my-work"]
  },

  // 2) Global Dashboards
  {
    label: "Global Dashboards",
    iconName: "BarChart3",
    roles: ["internal_admin", "internal_user", "external_admin", "external_user"],
    children: [
      {
        label: "Expansion Report",
        to: "/app/global-dashboards/expansion-report",
        matchPaths: ["/app/global-dashboards/expansion-report"],
      }
    ]
  },

  // 3) BAU
  {
    label: "BAU",
    iconName: "Headphones",
    roles: ["internal_admin", "internal_user", "external_admin", "external_user"],
    children: [
      {
        label: "Board Summary",
        to: "/app/bau/board-summary",
        matchPaths: ["/app/bau/board-summary"],
      },
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

  // 4) Project Implementation
  {
    label: "Project Implementation",
    iconName: "Settings",
    roles: ["internal_admin", "internal_user", "external_admin", "external_user"],
    children: [
      { 
        label: "Dashboard", 
        to: "/app/dashboard", 
        matchPaths: ["/app/dashboard"] 
      },
      { 
        label: "Executive Summary", 
        to: "/app/implementation/executive-summary", 
        iconName: "BarChart3",
        matchPaths: ["/app/implementation/executive-summary"],
        roles: ["internal_admin", "internal_user"]
      },
      { 
        label: "Board Summary", 
        to: "/app/implementation/board-summary", 
        iconName: "PieChart",
        matchPaths: ["/app/implementation/board-summary"],
        roles: ["internal_admin", "internal_user"]
      },
      {
        label: "Projects",
        to: "/app/projects",
        matchPaths: ["/app/projects"],
      },
      {
        label: "Work Breakdown Structure",
        to: "/app/implementation/wbs",
        matchPaths: ["/app/implementation/wbs"],
      },
      {
        label: "Reports",
        children: [
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
          {
            label: "View All Escalations",
            to: "/app/implementation/blockers",
            matchPaths: ["/app/implementation/blockers"],
            roles: ["internal_admin", "internal_user"]
          },
          {
            label: "View All Product Gaps",
            to: "/app/product-gaps",
            iconName: "Package",
            matchPaths: ["/app/product-gaps"],
            roles: ["internal_admin", "internal_user"]
          },
        ]
      },
      {
        label: "Weekly Review",
        to: "/app/implementation/weekly-review",
        matchPaths: ["/app/implementation/weekly-review"],
        roles: ["internal_admin", "internal_user"]
      },
    ]
  },

  // 5) Solutions Consulting
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

  // 6) Expenses
  {
    label: "Expenses",
    iconName: "Receipt",
    to: "/app/expenses",
    roles: ["internal_admin", "internal_user"], 
    matchPaths: ["/app/expenses"]
  },

  // 7) Master Data (consolidate prior Master Data + Hardware MasterData children)
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
        label: "Hardware Catalog", 
        to: "/app/admin/hardware",
        iconName: "Package",
        matchPaths: ["/app/admin/hardware"]
      },
      { 
        label: "Vision Use Cases", 
        to: "/app/admin/vision-use-cases",
        iconName: "Eye",
        matchPaths: ["/app/admin/vision-use-cases"]
      },
    ]
  },

  // 8) User Management
  {
    label: "User Management",
    iconName: "UserCog",
    to: "/app/admin/users",
    roles: ["internal_admin"],
    matchPaths: ["/app/admin/users"]
  },

  // 9) Feature Requests
  {
    label: "Feature Requests",
    iconName: "Lightbulb",
    roles: ["internal_user", "internal_admin"],
    children: [
      {
        label: "Feature Dashboard",
        to: "/app/feature-dashboard",
        iconName: "BarChart3",
        matchPaths: ["/app/feature-dashboard"]
      },
      {
        label: "All Requests",
        to: "/app/feature-requests",
        matchPaths: ["/app/feature-requests"]
      }
    ]
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
  Package,
  AlertTriangle,
  BarChart3,
  User,
  PieChart
} as const;

export function visibleItemsForRole(role: Role | null | undefined): NavItem[] {
  // Default unknown/undefined roles to the most permissive non-internal role
  const effectiveRole: Role = (role as Role) ?? 'external_user';

  const canSee = (item: NavItem) =>
    !item.roles || item.roles.includes(effectiveRole);

  const filterRecursive = (items: NavItem[]): NavItem[] =>
    items
      .filter(canSee)
      .map((i) => (i.children ? { ...i, children: filterRecursive(i.children) } : i))
      .filter((i) => (i.children ? i.children.length > 0 : true));

  return filterRecursive(NAV);
}