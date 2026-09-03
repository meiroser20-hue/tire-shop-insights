import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  IconSearch,
  IconAlertTriangle,
  IconBattery2,
  IconClockPause,
  IconCheck,
  IconChartDonut3,
  IconShoppingCart,
  IconListSearch,
  IconCategory2,
  IconChevronDown,
  IconX,
} from "@tabler/icons-react";
import { AppShell, Page, ScreenHeader } from "@/components/AppShell";
import {
  ColorCard,
  Donut,
  EmptyState,
  ErrorState,
  ExportButton,
  Plate,
  Section,
  SkeletonBlock,
} from "@/components/kit";
import { get, groupSum, num, str, type Row } from "@/lib/data";
import { useView } from "@/lib/hooks";
import { exportExcel } from "@/lib/export";
import { ils, int, shortDate } from "@/lib/format";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "מלאי · ברכת הדרך" },
      { name: "description", content: "יתרות צמיגים, תחזית אזילה, מלאי מת והצעת הזמנה שבועית." },
      { property: "og:title", content: "מלאי · ברכת הדרך" },
      { property: "og:description", content: "מה במלאי, מה נגמר ומה תקוע — בפנצ'ריית ברכת הדרך." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <Inventory />
    </AppShell>
  ),
});

const partK = ["part_name", "sku", "catalog"];
const desK = ["part_des", "description"];
const whK = ["warehouse", "wh"];
const balK = ["balance", "bal_now", "qty", "quantity", "on_hand"];
const daysK = ["days_to_zero", "days_left"];
const rateK = ["daily_burn", "rate", "avg_daily"];
const idleK = ["days_since_move"];
const famK = ["family_desc", "family_name"];

const itemKey = (r: Row) => `${str(get(r, partK))}|${str(get(r, whK))}`;
const itemTitle = (r: Row) => str(get(r, desK)) || str(get(r, partK)) || "פריט";
const DEAD_DAYS = 90;
const LOW_UNITS = 3;

type Status = "all" | "soon" | "low" | "dead" | "ok";
type SortBy = "balance" | "forecast" | "rate" | "idle";

const STATUS_LABEL: Record<Status, string> = {
  all: "הכל",
  soon: "עומד להיגמר",
  low: "נמוך",
  dead: "מלאי מת",
  ok: "תקין",
};

const SORT_LABEL: Record<SortBy, string> = {
  balance: "יתרה",
  forecast: "תחזית",
  rate: "קצב",
  idle: "ללא תנועה",
};

/** brand prefix from a sku like MAX-285-70R19.5 */
function brandOf(r: Row) {
  const des = str(get(r, desK));
  const m = des.match(/[A-Za-z]{3,}/);
  if (m) return m[0];
  const sku = str(get(r, partK));
  const p = sku.split("-")[0];
  return p && /[A-Za-z]/.test(p) ? p : "";
}

function Inventory() {
  const stock = useView("v_stock_current", null, { limit: 3000 });
  const dead = useView("v_dead_stock", null, { limit: 2000 });
  const forecast = useView("v_stock_forecast", null, { limit: 3000 });

  const [term, setTerm] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [family, setFamily] = useState("");
  const [brand, setBrand] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("balance");
  const [openMenu, setOpenMenu] = useState<"family" | "brand" | "sort" | null>(null);
  const [orderDays, setOrderDays] = useState(7);

  const fMap = useMemo(() => {
    const m = new Map<string, Row>();
    for (const r of forecast.data ?? []) m.set(itemKey(r), r);
    return m;
  }, [forecast.data]);

  const deadRows = useMemo(() => {
    const explicit = dead.data ?? [];
    if (explicit.length) return explicit;
    return (stock.data ?? []).filter((r) => num(get(r, idleK)) >= DEAD_DAYS);
  }, [dead.data, stock.data]);

  const deadKeys = useMemo(() => new Set(deadRows.map(itemKey)), [deadRows]);

  const statusOf = (r: Row): Exclude<Status, "all"> => {
    if (deadKeys.has(itemKey(r))) return "dead";
    const f = fMap.get(itemKey(r));
    const d = f ? num(get(f, daysK)) : 0;
    if (d > 0 && d <= 7) return "soon";
    if (num(get(r, balK)) <= LOW_UNITS) return "low";
    return "ok";
  };

  const all = stock.data ?? [];
  const counts = useMemo(() => {
    const c = { soon: 0, low: 0, dead: 0, ok: 0 };
    for (const r of all) c[statusOf(r)] += 1;
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, deadKeys, fMap]);

  const totalUnits = all.reduce((s, r) => s + num(get(r, balK)), 0);
  const stuckUnits = deadRows.reduce((s, r) => s + num(get(r, balK)), 0);

  const families = useMemo(
    () => [...new Set(all.map((r) => str(get(r, famK))).filter(Boolean))],
    [all],
  );
  const brands = useMemo(
    () => [...new Set(all.map(brandOf).filter(Boolean))].slice(0, 12),
    [all],
  );

  const rows = useMemo(() => {
    let list = all;
    if (status !== "all") list = list.filter((r) => statusOf(r) === status);
    if (family) list = list.filter((r) => str(get(r, famK)) === family);
    if (brand) list = list.filter((r) => brandOf(r) === brand);
    const t = term.trim();
    if (t)
      list = list.filter((r) =>
        [itemTitle(r), str(get(r, partK)), str(get(r, famK)), brandOf(r)].join(" ").includes(t),
      );
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortBy === "balance") return num(get(a, balK)) - num(get(b, balK));
      if (sortBy === "idle") return num(get(b, idleK)) - num(get(a, idleK));
      const fa = fMap.get(itemKey(a));
      const fb = fMap.get(itemKey(b));
      if (sortBy === "rate") return num(get(fb, rateK)) - num(get(fa, rateK));
      const da = fa ? num(get(fa, daysK)) : Infinity;
      const db = fb ? num(get(fb, daysK)) : Infinity;
      return (da || Infinity) - (db || Infinity);
    });
    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, status, family, brand, term, sortBy, deadKeys, fMap]);

  const suggestions = useMemo(
    () =>
      (forecast.data ?? [])
        .filter((r) => {
          const d = num(get(r, daysK));
          return d > 0 && d <= orderDays;
        })
        .sort((a, b) => num(get(a, daysK)) - num(get(b, daysK)))
        .slice(0, 6),
    [forecast.data, orderDays],
  );

  const famGroups = useMemo(
    () => groupSum(all, (r) => str(get(r, famK)) || "ללא משפחה", (r) => num(get(r, balK))),
    [all],
  );

  const doExport = () =>
    exportExcel(
      "מלאי",
      rows.map((r) => ({
        "מק״ט": str(get(r, partK)),
        תיאור: str(get(r, desK)),
        מחסן: str(get(r, whK)),
        משפחה: str(get(r, famK)),
        מותג: brandOf(r),
        יתרה: num(get(r, balK)),
        "תנועה אחרונה": shortDate(get(r, ["last_move"])),
      })),
      "מלאי",
    );

  const hasFilters = !!family || !!brand;

  return (
    <>
      <ScreenHeader
        title="מלאי"
        subtitle={`${int(totalUnits)} יחידות · ${int(all.length)} מק״טים`}
      />
      <Page>
        {stock.isError ? (
          <div className="py-6">
            <ErrorState onRetry={() => void stock.refetch()} />
          </div>
        ) : stock.isLoading ? (
          <div className="py-6">
            <SkeletonBlock rows={6} />
          </div>
        ) : (
          <>
            <Section first>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <button onClick={() => setStatus("soon")} className="text-right">
                  <ColorCard
                    label="עומד להיגמר"
                    value={int(counts.soon)}
                    numericValue={undefined}
                    sub="בשבוע הקרוב"
                    bg="196,68,75"
                    fg="#9A3239"
                  />
                </button>
                <button onClick={() => setStatus("low")} className="text-right">
                  <ColorCard
                    label="מלאי נמוך"
                    value={int(counts.low)}
                    sub={`${LOW_UNITS} יחידות ומטה`}
                    bg="192,138,46"
                    fg="#8A6119"
                  />
                </button>
                <button onClick={() => setStatus("dead")} className="text-right">
                  <ColorCard
                    label="מלאי מת"
                    value={int(counts.dead)}
                    sub={`${int(stuckUnits)} יח׳ · ${DEAD_DAYS}+ יום`}
                    bg="126,90,150"
                    fg="#5E4275"
                  />
                </button>
                <button onClick={() => setStatus("ok")} className="text-right">
                  <ColorCard
                    label="תקין"
                    value={int(counts.ok)}
                    sub={`מתוך ${int(all.length)} מק״טים`}
                    bg="62,142,114"
                    fg="#276A54"
                  />
                </button>
              </div>
            </Section>

            <div className="grid gap-x-8 lg:grid-cols-2">
              <Section title="תמונת מלאי" icon={<IconChartDonut3 size={15} stroke={1.6} />}>
                <div className="flex flex-wrap items-center gap-6">
                  <Donut
                    slices={[
                      { key: "תקין", value: counts.ok, color: "#3E8E72" },
                      { key: "נמוך", value: counts.low, color: "#C08A2E" },
                      { key: "עומד להיגמר", value: counts.soon, color: "#C4444B" },
                      { key: "מלאי מת", value: counts.dead, color: "#7E5A96" },
                    ].filter((x) => x.value > 0)}
                    center={int(all.length)}
                    sub="מק״טים"
                  />
                  <div className="min-w-[200px] flex-1">
                    {(
                      [
                        ["תקין", counts.ok, "#3E8E72"],
                        ["נמוך", counts.low, "#C08A2E"],
                        ["עומד להיגמר", counts.soon, "#C4444B"],
                        ["מלאי מת", counts.dead, "#7E5A96"],
                      ] as Array<[string, number, string]>
                    ).map(([label, n, color]) => (
                      <div
                        key={label}
                        className="flex items-center gap-3 border-t border-line py-2.5 first:border-0"
                      >
                        <span
                          className="size-2.5 shrink-0 rounded-[3px]"
                          style={{ background: color }}
                        />
                        <span className="w-[86px] shrink-0 text-[12.5px] text-ink-2">{label}</span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#F4F4F7]">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${all.length ? (n / all.length) * 100 : 0}%`,
                              background: color,
                            }}
                          />
                        </span>
                        <span className="tnum w-7 text-left text-[14px] font-500">{int(n)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>

              <Section
                title="מומלץ להזמין"
                icon={<IconShoppingCart size={15} stroke={1.6} />}
                action={
                  <div className="inline-flex rounded-full bg-[#F4F4F7] p-[3px]">
                    {[7, 14, 30].map((d) => (
                      <button
                        key={d}
                        onClick={() => setOrderDays(d)}
                        className={`rounded-full px-2.5 py-1 text-[10.5px] transition-all ${
                          orderDays === d
                            ? "red-grad font-500 text-white"
                            : "text-ink-3 hover:text-ink-2"
                        }`}
                      >
                        {d} ימים
                      </button>
                    ))}
                  </div>
                }
              >
                {suggestions.length === 0 ? (
                  <EmptyState text="אין פריטים שצפויים להיגמר בטווח שנבחר" />
                ) : (
                  <div className="space-y-2.5">
                    {suggestions.map((r, i) => {
                      const days = num(get(r, daysK));
                      const rate = num(get(r, rateK));
                      const bal = num(get(r, balK));
                      const urgent = days <= 7;
                      const suggest = Math.max(4, Math.ceil(rate * 21));
                      return (
                        <div
                          key={i}
                          className="rounded-[16px] border px-4 py-3"
                          style={
                            urgent
                              ? {
                                  borderColor: "rgba(196,68,75,.18)",
                                  background:
                                    "linear-gradient(270deg,rgba(196,68,75,.13) 0%,rgba(196,68,75,.05) 40%,#fff 82%)",
                                }
                              : { borderColor: "var(--line)", background: "#fff" }
                          }
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-[13.5px] font-500 text-ink">
                                {itemTitle(r)}
                              </div>
                              <div className="tnum mt-1 text-[10.5px] text-ink-3">
                                נותרו {int(bal)} יח׳
                                {rate > 0 ? ` · ${rate.toFixed(1)} ליום` : ""}
                              </div>
                            </div>
                            <div className="shrink-0 text-left">
                              <div className="tnum text-[20px] font-500 text-ink">
                                {int(suggest)}
                                <span className="mr-1 text-[10.5px] font-400 text-ink-3">יח׳</span>
                              </div>
                            </div>
                          </div>
                          <span
                            className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] ${
                              urgent ? "bg-[#FBEDED] text-down" : "bg-[#FBF3E2] text-[#8A6119]"
                            }`}
                          >
                            נגמר בעוד {int(days)} ימים
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Section>
            </div>

            <Section
              title="פריטים"
              icon={<IconListSearch size={15} stroke={1.6} />}
              action={<ExportButton onClick={doExport} />}
            >
              <div className="relative mb-3.5">
                <IconSearch
                  size={16}
                  stroke={1.5}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3"
                />
                <input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="חיפוש מק״ט, מידה, מותג או משפחה"
                  className="h-12 w-full rounded-[14px] border border-line bg-white pr-10 pl-3 text-[14px] outline-none focus:border-red-400"
                />
              </div>

              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-full bg-[#F4F4F7] p-[3px]">
                  {(["all", "soon", "low", "dead", "ok"] as Status[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setStatus(v)}
                      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] transition-all ${
                        status === v
                          ? "red-grad font-500 text-white"
                          : "text-ink-3 hover:text-ink-2"
                      }`}
                    >
                      {STATUS_LABEL[v]}
                    </button>
                  ))}
                </div>

                <span className="hidden h-5 w-px bg-line lg:block" />

                <DropFilter
                  label={family || "משפחה"}
                  open={openMenu === "family"}
                  onToggle={() => setOpenMenu(openMenu === "family" ? null : "family")}
                  options={families}
                  onPick={(v) => {
                    setFamily(v);
                    setOpenMenu(null);
                  }}
                />
                <DropFilter
                  label={brand || "מותג"}
                  open={openMenu === "brand"}
                  onToggle={() => setOpenMenu(openMenu === "brand" ? null : "brand")}
                  options={brands}
                  onPick={(v) => {
                    setBrand(v);
                    setOpenMenu(null);
                  }}
                />
                <DropFilter
                  label={`מיון: ${SORT_LABEL[sortBy]}`}
                  open={openMenu === "sort"}
                  onToggle={() => setOpenMenu(openMenu === "sort" ? null : "sort")}
                  options={Object.values(SORT_LABEL)}
                  onPick={(v) => {
                    const k = (Object.keys(SORT_LABEL) as SortBy[]).find(
                      (x) => SORT_LABEL[x] === v,
                    );
                    if (k) setSortBy(k);
                    setOpenMenu(null);
                  }}
                />

                <span className="tnum mr-auto whitespace-nowrap text-[11px] text-ink-3">
                  {int(rows.length)} פריטים
                </span>
              </div>

              {hasFilters && (
                <div className="mb-3.5 flex flex-wrap items-center gap-1.5">
                  {family && (
                    <FilterChip label={family} onClear={() => setFamily("")} />
                  )}
                  {brand && <FilterChip label={brand} onClear={() => setBrand("")} />}
                  <button
                    onClick={() => {
                      setFamily("");
                      setBrand("");
                    }}
                    className="text-[11px] text-ink-3 underline underline-offset-[3px]"
                  >
                    נקה הכל
                  </button>
                </div>
              )}

              {rows.length === 0 ? (
                <EmptyState text="אין פריטים שתואמים לסינון" />
              ) : (
                <div className="-mx-1 overflow-x-auto">
                  <table className="w-full min-w-[620px] border-collapse">
                    <thead>
                      <tr>
                        {["מק״ט", "תיאור", "משפחה", "יתרה", "קצב", "תחזית", "תנועה אחרונה"].map(
                          (h) => (
                            <th
                              key={h}
                              className="whitespace-nowrap border-b border-line px-2.5 pb-2.5 text-right text-[10.5px] font-400 text-ink-3"
                            >
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 150).map((r, i) => {
                        const bal = num(get(r, balK));
                        const f = fMap.get(itemKey(r));
                        const days = f ? num(get(f, daysK)) : 0;
                        const rate = f ? num(get(f, rateK)) : 0;
                        const st = statusOf(r);
                        const tone =
                          st === "soon"
                            ? "#C4444B"
                            : st === "low"
                              ? "#C08A2E"
                              : st === "dead"
                                ? "#7E5A96"
                                : "#3E8E72";
                        return (
                          <tr key={i} className="hover:bg-[#FCFCFD]">
                            <td className="border-b border-line px-2.5 py-3">
                              <Plate>{str(get(r, partK))}</Plate>
                            </td>
                            <td className="max-w-[190px] truncate border-b border-line px-2.5 py-3 text-[13px]">
                              {itemTitle(r)}
                            </td>
                            <td className="border-b border-line px-2.5 py-3 text-[12px] text-ink-2">
                              {str(get(r, famK))}
                            </td>
                            <td className="border-b border-line px-2.5 py-3">
                              <span
                                className="tnum text-[16px] font-500"
                                style={{ color: st === "ok" ? "var(--ink)" : tone }}
                              >
                                {int(bal)}
                              </span>
                              <span className="mt-1 flex gap-[2px]">
                                {Array.from({ length: 6 }).map((_, k) => (
                                  <i
                                    key={k}
                                    className="size-[5px] rounded-[1.5px]"
                                    style={{
                                      background:
                                        k < Math.min(6, Math.ceil(bal / 8)) ? tone : "#E9E9EE",
                                    }}
                                  />
                                ))}
                              </span>
                            </td>
                            <td className="tnum whitespace-nowrap border-b border-line px-2.5 py-3 text-[12px] text-ink-2">
                              {rate > 0 ? `${rate.toFixed(1)} ליום` : "—"}
                            </td>
                            <td className="border-b border-line px-2.5 py-3">
                              <span
                                className="tnum whitespace-nowrap rounded-full px-2 py-0.5 text-[10px]"
                                style={{
                                  background:
                                    st === "dead"
                                      ? "var(--surf)"
                                      : st === "soon"
                                        ? "#FBEDED"
                                        : st === "low"
                                          ? "#FBF3E2"
                                          : "#EAF4EF",
                                  color: st === "dead" ? "var(--ink-3)" : tone,
                                }}
                              >
                                {st === "dead"
                                  ? `${int(num(get(r, idleK)))} יום ללא תנועה`
                                  : days > 0
                                    ? `${int(days)} ימים`
                                    : "נדרשים עוד נתונים"}
                              </span>
                            </td>
                            <td className="tnum whitespace-nowrap border-b border-line px-2.5 py-3 text-[11.5px] text-ink-3">
                              {shortDate(get(r, ["last_move"]))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            <Section title="יתרות לפי משפחה" icon={<IconCategory2 size={15} stroke={1.6} />}>
              <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-6">
                {famGroups.slice(0, 6).map((g, i) => {
                  const max = famGroups[0]?.value ?? 1;
                  const r = g.value / max;
                  return (
                    <div
                      key={g.key}
                      className="flex min-h-[78px] flex-col justify-between rounded-[14px] px-3.5 py-3"
                      style={{ background: `rgba(196,43,78,${0.03 + r * 0.11})` }}
                    >
                      <span className="text-[12px] text-red-800">{g.key}</span>
                      <span className="tnum text-[17px] font-500 text-red-900">
                        {int(g.value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Section>
          </>
        )}
      </Page>
    </>
  );
}

function DropFilter({
  label,
  open,
  onToggle,
  options,
  onPick,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  options: string[];
  onPick: (v: string) => void;
}) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-white px-3 py-1.5 text-[11px] text-ink-2 hover:bg-[#FCFCFD]"
      >
        {label}
        <IconChevronDown size={12} stroke={1.6} className="opacity-50" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={onToggle} />
          <div className="absolute right-0 top-9 z-30 max-h-64 w-44 overflow-auto rounded-[14px] border border-line bg-white py-1 shadow-[0_10px_30px_rgba(0,0,0,.14)]">
            <button
              onClick={() => onPick("")}
              className="w-full px-3 py-2 text-right text-[12px] text-ink-3 hover:bg-red-050"
            >
              הכל
            </button>
            {options.map((o) => (
              <button
                key={o}
                onClick={() => onPick(o)}
                className="w-full truncate px-3 py-2 text-right text-[12.5px] text-ink hover:bg-red-050"
              >
                {o}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-050 px-2.5 py-1 text-[11px] text-red-700">
      {label}
      <button onClick={onClear} className="opacity-55 hover:opacity-100">
        <IconX size={11} stroke={2} />
      </button>
    </span>
  );
}

export function BarList({
  items,
}: {
  items: Array<{ key: string; value: number; count: number }>;
}) {
  if (!items.length) return <EmptyState text="אין נתונים להצגה בטווח שנבחר" />;
  const max = Math.max(...items.map((i) => i.value));
  return (
    <div className="space-y-3">
      {items.map((g) => (
        <div key={g.key}>
          <div className="mb-1.5 flex justify-between text-[12.5px]">
            <span className="text-ink-2">{g.key}</span>
            <span className="tnum font-500 text-ink">{ils(g.value)}</span>
          </div>
          <span className="block h-1.5 overflow-hidden rounded-full bg-[#F4F4F7]">
            <span
              className="block h-full rounded-full bg-red-600"
              style={{ width: `${max ? (g.value / max) * 100 : 0}%` }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}
