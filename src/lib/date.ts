/**
 * Dates are stored and transmitted as ISO 8601. The old admin form collected
 * `applicationDeadline` as strict mm/dd/yy, which is ambiguous, unsortable and
 * century-less — and the careers list has to sort on it and flag expiry.
 *
 * `toLegacyMmDdYy` exists only as the boundary adapter in case the backend
 * insists on the old format. It is not used anywhere yet. If it turns out to be
 * needed, it is called in lib/api/jobs.ts and nowhere else.
 */

export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === value;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDateShort(iso);
}

export function isPastDeadline(isoDate: string): boolean {
  if (!isValidIsoDate(isoDate)) return false;
  const todayIso = new Date().toISOString().slice(0, 10);
  return isoDate < todayIso;
}

export function daysUntil(isoDate: string): number | null {
  if (!isValidIsoDate(isoDate)) return null;
  const target = new Date(`${isoDate}T00:00:00Z`).getTime();
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z").getTime();
  return Math.round((target - today) / 86_400_000);
}

/** Legacy boundary adapter. Unused until the backend proves it needs mm/dd/yy. */
export function toLegacyMmDdYy(isoDate: string): string {
  if (!isValidIsoDate(isoDate)) return isoDate;
  const [year = "", month = "", day = ""] = isoDate.split("-");
  return `${month}/${day}/${year.slice(2)}`;
}

/** Legacy boundary adapter. Assumes 20xx, which is exactly why the format is bad. */
export function fromLegacyMmDdYy(value: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(value);
  if (!match) return value;
  const [, month = "", day = "", year = ""] = match;
  return `20${year}-${month}-${day}`;
}
