import {
  Activity,
  Bot,
  FileSearch,
  GitBranch,
  LayoutDashboard,
  LineChart,
  ScrollText,
  Settings,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Processes", href: "/processes", icon: Workflow },
  { label: "SOP Analyzer", href: "/sop-analyzer", icon: FileSearch },
  { label: "Workflow Designer", href: "/workflow-designer", icon: GitBranch },
  { label: "AI Agents", href: "/agents", icon: Bot },
  { label: "Approvals", href: "/approvals", icon: ShieldCheck },
  { label: "Analytics", href: "/analytics", icon: LineChart },
  { label: "Audit Log", href: "/audit-log", icon: ScrollText },
  { label: "Settings", href: "/settings", icon: Settings },
];

export const GOVERNANCE_ITEMS = [
  { label: "Explainability", active: true },
  { label: "Human oversight", active: true },
  { label: "Auditability", active: true },
  { label: "Permission boundaries", active: true },
  { label: "Escalation rules", active: true },
] as const;
