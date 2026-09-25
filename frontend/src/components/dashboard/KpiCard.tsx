import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
}

export function KpiCard({ title, value, subtitle, icon: Icon, trend }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-surface-border bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
          {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
          {trend ? (
            <p className="mt-2 text-xs font-medium text-emerald-700">{trend}</p>
          ) : null}
        </div>
        <div className="rounded-lg bg-slate-50 p-2 text-slate-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
