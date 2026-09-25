import { formatTime } from "@/lib/format";
import type { AuditEventRead } from "@/lib/types";

export function ActivityFeed({ events }: { events: AuditEventRead[] }) {
  if (!events.length) {
    return (
      <p className="text-sm text-slate-500">No recent activity yet. Run an analysis to populate the audit trail.</p>
    );
  }

  return (
    <ul className="divide-y divide-surface-border">
      {events.map((event) => (
        <li key={event.id} className="flex gap-4 py-3 first:pt-0 last:pb-0">
          <time suppressHydrationWarning className="w-20 shrink-0 font-mono text-xs text-slate-500">
            {formatTime(event.timestamp)}
          </time>
          <div className="min-w-0">
            <p className="text-sm text-slate-900">{event.action}</p>
            <p className="text-xs text-slate-500">
              {event.actor_name} · {event.actor_type}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
