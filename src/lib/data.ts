import { db } from "./supabase";

export type Row = Record<string, unknown>;

/* ------------------------------------------------------------------ */
/* Column detection — views come from Priority, names may vary slightly */
/* ------------------------------------------------------------------ */

const keyCache = new Map<string, Promise<string[]>>();

export function keysOf(view: string): Promise<string[]> {
  if (!keyCache.has(view)) {
    keyCache.set(
      view,
      (async () => {
        const { data, error } = await db.from(view).select("*").limit(1);
        if (error) throw new Error(error.message);
        return data && data[0] ? Object.keys(data[0]) : [];
      })(),
    );
  }
  return keyCache.get(view)!;
}

export function pickKey(keys: string[], candidates: string[]): string | null {
  for (const c of candidates) {
    const hit = keys.find((k) => k.toLowerCase() === c.toLowerCase());
    if (hit) return hit;
  }
  for (const c of candidates) {
    const hit = keys.find((k) => k.toLowerCase().includes(c.toLowerCase()));
    if (hit) return hit;
  }
  return null;
}

export const DATE_KEYS = [
  "doc_date",
  "date",
  "sale_date",
  "curdate",
  "invoice_date",
  "created_at",
  "day",
];

export function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
}

export function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

export function get(row: Row, candidates: string[]): unknown {
  const k = pickKey(Object.keys(row), candidates);
  return k ? row[k] : undefined;
}

/* ------------------------------------------------------------------ */
/* Time ranges                                                          */
/* ------------------------------------------------------------------ */

export type TimeKey = "today" | "yesterday" | "week" | "month" | "all";

export const TIME_LABELS: Record<TimeKey, string> = {
  today: "היום",
  yesterday: "אתמול",
  week: "השבוע",
  month: "החודש",
  all: "הכל",
};

const iso = (d: Date) => {
  const t = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return t.toISOString().slice(0, 10);
};

export function rangeFor(key: TimeKey, base = new Date()): { from: string; to: string } | null {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  switch (key) {
    case "today":
      return { from: iso(d), to: iso(d) };
    case "yesterday": {
      const y = new Date(d);
      y.setDate(y.getDate() - 1);
      return { from: iso(y), to: iso(y) };
    }
    case "week": {
      const s = new Date(d);
      s.setDate(s.getDate() - s.getDay()); // Sunday
      return { from: iso(s), to: iso(d) };
    }
    case "month": {
      const s = new Date(d.getFullYear(), d.getMonth(), 1);
      return { from: iso(s), to: iso(d) };
    }
    default:
      return null;
  }
}

/** The equivalent previous period, for comparison chips. */
export function previousRange(key: TimeKey): { from: string; to: string } | null {
  const now = new Date();
  switch (key) {
    case "today":
      return rangeFor("yesterday");
    case "yesterday": {
      const d = new Date(now);
      d.setDate(d.getDate() - 2);
      return rangeFor("today", d);
    }
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return rangeFor("week", d);
    }
    case "month": {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: iso(s), to: iso(e) };
    }
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Fetching                                                             */
/* ------------------------------------------------------------------ */

export type FetchOpts = {
  range?: { from: string; to: string } | null;
  dateKeys?: string[];
  order?: { key: string[]; asc?: boolean };
  limit?: number;
  eq?: Array<[string[], string | number]>;
};

export async function fetchRows(view: string, opts: FetchOpts = {}): Promise<Row[]> {
  const keys = await keysOf(view);
  let q = db.from(view).select("*");

  if (opts.range) {
    const dk = pickKey(keys, opts.dateKeys ?? DATE_KEYS);
    if (dk) {
      q = q.gte(dk, opts.range.from).lte(dk, `${opts.range.to}T23:59:59.999`);
    }
  }
  for (const [cands, val] of opts.eq ?? []) {
    const k = pickKey(keys, cands);
    if (k) q = q.eq(k, val);
  }
  if (opts.order) {
    const ok = pickKey(keys, opts.order.key);
    if (ok) q = q.order(ok, { ascending: opts.order.asc ?? false });
  }
  q = q.limit(opts.limit ?? 2000);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Row[];
}

/* ------------------------------------------------------------------ */
/* Domain helpers                                                       */
/* ------------------------------------------------------------------ */

export type Vat = "net" | "gross";

export function amountOf(row: Row, vat: Vat): number {
  const k =
    vat === "gross" ? ["amount_gross", "total_gross", "gross"] : ["amount_net", "total_net", "net"];
  const v = get(row, k);
  if (v !== undefined) return num(v);
  return num(get(row, ["amount", "total", "sum", "value"]));
}

export function customerName(row: Row): string {
  return (
    str(get(row, ["display_name", "cust_des", "customer_name", "cust_name", "custdes", "name"])) ||
    "לקוח לא מזוהה"
  );
}

export function vehicleClassOf(row: Row): string {
  return str(get(row, ["vehicle_class", "vehicletype", "class"]));
}

export const HEAVY = ["משא", "כבד", "heavy", "truck"];
export const PRIVATE = ["פרטי", "private", "car"];

export function isHeavy(row: Row) {
  const c = vehicleClassOf(row).toLowerCase();
  return HEAVY.some((h) => c.includes(h.toLowerCase()));
}
export function isPrivate(row: Row) {
  const c = vehicleClassOf(row).toLowerCase();
  return PRIVATE.some((h) => c.includes(h.toLowerCase()));
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function groupSum<T>(
  rows: T[],
  keyFn: (r: T) => string,
  valFn: (r: T) => number,
): Array<{ key: string; value: number; count: number }> {
  const m = new Map<string, { value: number; count: number }>();
  for (const r of rows) {
    const k = keyFn(r) || "אחר";
    const cur = m.get(k) ?? { value: 0, count: 0 };
    cur.value += valFn(r);
    cur.count += 1;
    m.set(k, cur);
  }
  return [...m.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.value - a.value);
}

export function uniqueCount<T>(rows: T[], keyFn: (r: T) => string): number {
  const s = new Set<string>();
  for (const r of rows) {
    const k = keyFn(r);
    if (k) s.add(k);
  }
  return s.size;
}
