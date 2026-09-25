export function ScoreBar({
  label,
  value,
  tone = "brand",
}: {
  label: string;
  value?: number | null;
  tone?: "brand" | "violet" | "emerald";
}) {
  const pct = value == null ? 0 : Math.round(value * 100);
  const fill =
    tone === "violet" ? "bg-violet-500" : tone === "emerald" ? "bg-emerald-500" : "bg-brand-500";
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>{label}</span>
        <span className="font-medium text-slate-700">{value == null ? "—" : `${pct}%`}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
