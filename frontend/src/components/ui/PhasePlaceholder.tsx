interface PhasePlaceholderProps {
  title: string;
  description: string;
  phase: string;
}

export function PhasePlaceholder({ title, description, phase }: PhasePlaceholderProps) {
  return (
    <div className="rounded-xl border border-dashed border-surface-border bg-white p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{phase}</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">{description}</p>
    </div>
  );
}
