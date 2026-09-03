export const ils = (n: number, decimals = 0) =>
  "₪" +
  (Number.isFinite(n) ? n : 0).toLocaleString("he-IL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

export const int = (n: number) => (Number.isFinite(n) ? n : 0).toLocaleString("he-IL");

export const pct = (n: number) => `${n > 0 ? "+" : ""}${Math.round(n)}%`;

export function change(current: number, prev: number): number | null {
  if (!prev) return null;
  return ((current - prev) / Math.abs(prev)) * 100;
}

const HE_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

export function longDate(d = new Date()) {
  return `יום ${HE_DAYS[d.getDay()]}, ${d.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })}`;
}

export function shortDate(v: unknown) {
  if (!v) return "";
  const d = new Date(String(v));
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export function timeOf(v: unknown) {
  if (!v) return "";
  const d = new Date(String(v));
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

export function agoText(v: unknown): string {
  if (!v) return "";
  const d = new Date(String(v));
  if (isNaN(d.getTime())) return "";
  const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (mins < 1) return "עודכן עכשיו";
  if (mins < 60) return `עודכן לפני ${mins} דקות`;
  const h = Math.round(mins / 60);
  if (h < 24) return `עודכן לפני ${h} שעות`;
  return `עודכן לפני ${Math.round(h / 24)} ימים`;
}

export function greeting(name?: string | null) {
  const h = new Date().getHours();
  const g = h < 12 ? "בוקר טוב" : h < 17 ? "צהריים טובים" : h < 21 ? "ערב טוב" : "לילה טוב";
  return name ? `${g}, ${name}` : g;
}

export const weekdayName = (i: number) => HE_DAYS[i] ?? "";
