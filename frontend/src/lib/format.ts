export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatMinutes(minutes?: number | null): string {
  if (minutes == null) return "—";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  return `${hours % 1 === 0 ? hours : hours.toFixed(1)} hrs`;
}

export function formatDays(days?: number | null): string {
  if (days == null) return "—";
  if (days === 0) return "same day";
  return `${days % 1 === 0 ? days : days.toFixed(1)} days`;
}

export function formatPercent(value?: number | null, digits = 0): string {
  if (value == null) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

// Fixed locale so server-rendered and client-rendered output match (avoids hydration mismatches).
const LOCALE = "en-US";

export function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(LOCALE, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(LOCALE, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
