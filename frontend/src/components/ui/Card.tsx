export function Card({
  children,
  className = "",
  title,
  subtitle,
  actions,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className={`rounded-xl border border-surface-border bg-white p-5 shadow-card ${className}`}>
      {title || actions ? (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title ? <h2 className="text-sm font-semibold text-slate-900">{title}</h2> : null}
            {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}
