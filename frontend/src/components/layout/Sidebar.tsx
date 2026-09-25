"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity } from "lucide-react";
import { GOVERNANCE_ITEMS, NAV_ITEMS } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-surface-border bg-white">
      <div className="border-b border-surface-border px-5 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-slate-900">FlowPilot</p>
            <p className="text-xs text-slate-500">AI-Powered Workflow Intelligence</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-surface-border px-4 py-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          AI Governance
        </p>
        <ul className="space-y-1.5">
          {GOVERNANCE_ITEMS.map((item) => (
            <li key={item.label} className="flex items-center justify-between text-xs text-slate-600">
              <span>{item.label}</span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                On
              </span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
