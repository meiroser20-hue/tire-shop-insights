import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { IconMedal, IconRefresh } from "@tabler/icons-react";
import { AppShell, Page, ScreenHeader } from "@/components/AppShell";
import {
  Avatar,
  Bar,
  Chip,
  ColorCard,
  Delta,
  EmptyState,
  ErrorState,
  MetricCard,
  Pill,
  Section,
  Segmented,
  Skeleton,
  SkeletonBlock,
  TimeFilter,
} from "@/components/kit";
import {
  amountOf,
  customerName,
  get,
  groupSum,
  initials,
  isHeavy,
  isPrivate,
  num,
  str,
  uniqueCount,
  type Row,
  type TimeKey,
} from "@/lib/data";
import { useView, usePrevView } from "@/lib/hooks";
import { usePrefs } from "@/lib/prefs";
import { useAuth } from "@/lib/auth";
import { agoText, greeting, ils, int, timeOf, change } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "בית · ברכת הדרך" },
      { name: "description", content: "מבט יומי על ההכנסות, הרכבים, המלאי והכספים של פנצ'ריית ברכת הדרך." },
      { property: "og:title", content: "בית · ברכת הדרך" },
      { property: "og:description", content: "מבט יומי על ההכנסות, הרכבים והמלאי בפנצ'ריית ברכת הדרך." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <Home />
    </AppShell>
  ),
});

const vehicleKeys = ["car_num", "vehicle_no", "vehicle_number", "car_number", "regnum"];
const catKeys = ["category", "service_category", "cat"];
const qtyKeys = ["quantity", "qty", "units", "tquant"];
const sizeKeys = ["size", "tire_size", "measure"];

function Home() {
  const { profile } = useAuth();
  const { vat, setVat } = usePrefs();
  const [time, setTime] = useState<TimeKey>("today");

  const sales = useView("v_sales", time, { limit: 5000 });
  const prev = usePrevView("v_sales", time);
  const sync = useView("sync_log", null, { limit: 1, order: { key: ["finished_at", "started_at"] } });

  const rows = sales.data ?? [];
  const total = useMemo(() => rows.reduce((s, r) => s + amountOf(r, vat), 0), [rows, vat]);
  const prevTotal = useMemo(
    () => (prev.data ?? []).reduce((s, r) => s + amountOf(r, vat), 0),
    [prev.data, vat],
  );

  const lastSync = sync.data?.[0]
    ? agoText(get(sync.data[0], ["finished_at", "synced_at", "created_at", "updated_at"]))
    : "";

  return (
    <>
      <ScreenHeader title={greeting(profile?.full_name)} subtitle={lastSync || undefined}>
        <div className="space-y-3">
          <TimeFilter value={time} onChange={setTime} />
          <div className="flex justify-center">
            <Segmented
              value={vat}
              onChange={setVat}
              options={[
                { value: "net", label: "ללא מע״מ" },
                { value: "gross", label: "כולל מע״מ" },
              ]}
            />
          </div>
        </div>

        <div className="mt-6 text-center">
          {sales.isLoading ? (
            <Skeleton className="mx-auto h-12 w-48" />
          ) : (
            <>
              <div className="tnum text-[50px] font-500 leading-none text-coral-900">{ils(total)}</div>
              <div className="mt-2">
                <Delta value={change(total, prevTotal)} />
              </div>
            </>
          )}
        </div>
      </ScreenHeader>

      <Page>
        {sales.isError ? (
          <div className="py-6">
            <ErrorState onRetry={() => void sales.refetch()} />
          </div>
        ) : sales.isLoading ? (
          <div className="py-6">
            <SkeletonBlock rows={5} />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-6">
            <EmptyState
              text="עוד לא נרשמו רכבים היום"
              action={<Pill onClick={() => setTime("yesterday")}>הצג את אתמול</Pill>}
            />
          </div>
        ) : (
          <>
            <Metrics rows={rows} prevRows={prev.data ?? []} />
            <HourlySection rows={rows} />
            <ClassSplit rows={rows} />
            <ServiceMix rows={rows} />
            <TopCustomers />
            <TopSizes rows={rows} />
            <RecentVehicles rows={rows} />
          </>
        )}

        <FinanceStrip />
        <StockStrip />
        <Insights />
        <div className="hairline flex items-center justify-center gap-1.5 py-6 text-[11px] text-ink-3">
          <IconRefresh size={13} stroke={1.5} />
          {lastSync || "מסתנכרן מפריוריטי כל 3 דקות"}
        </div>
      </Page>
    </>
  );
}

/* ------------------------------- metrics ------------------------------- */

function Metrics({ rows, prevRows }: { rows: Row[]; prevRows: Row[] }) {
  const { vat } = usePrefs();
  const sum = (rs: Row[]) => rs.reduce((s, r) => s + amountOf(r, vat), 0);
  const veh = (rs: Row[]) => uniqueCount(rs, (r) => str(get(r, vehicleKeys)));
  const heavy = rows.filter(isHeavy);
  const priv = rows.filter(isPrivate);
  const vehicles = veh(rows) || rows.length;
  const catQty = (needle: string, rs = rows) =>
    rs
      .filter((r) =>
        [str(get(r, catKeys)), str(r["family_desc"]), str(r["family_name"]), str(r["part_des"])]
          .join(" ")
          .includes(needle),
      )
      .reduce((s, r) => s + (num(get(r, qtyKeys)) || 1), 0);

  return (
    <Section first>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
        <MetricCard
          label="משא כבד"
          value={ils(sum(heavy))}
          sub={`${int(veh(heavy))} רכבים`}
          delta={change(sum(heavy), sum(prevRows.filter(isHeavy)))}
        />
        <MetricCard
          label="רכב פרטי"
          value={ils(sum(priv))}
          sub={`${int(veh(priv))} רכבים`}
          delta={change(sum(priv), sum(prevRows.filter(isPrivate)))}
        />
        <MetricCard
          label="ממוצע לרכב"
          value={ils(vehicles ? sum(rows) / vehicles : 0)}
          sub={`${int(vehicles)} רכבים`}
        />
        <MetricCard label="צמיגים נמכרו" value={int(catQty("צמיג"))} sub="יחידות" />
        <MetricCard label="תקרים תוקנו" value={int(catQty("תקר"))} sub="יחידות" />
        <MetricCard label="איזונים" value={int(catQty("איזון"))} sub="יחידות" />
      </div>
    </Section>
  );
}

/* -------------------------------- hourly -------------------------------- */

function HourlySection({ rows }: { rows: Row[] }) {
  const { vat } = usePrefs();
  const data = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of rows) {
      const raw = get(r, ["signed_at", "doc_time", "created_at"]);
      const d = raw ? new Date(str(raw)) : null;
      if (!d || Number.isNaN(d.getTime())) continue;
      const h = d.getHours();
      m.set(h, (m.get(h) ?? 0) + amountOf(r, vat));
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [rows, vat]);

  if (!data.length) return null;

  const max = Math.max(...data.map((d) => d[1]));
  const peak = data.reduce((a, b) => (b[1] > a[1] ? b : a));
  const quiet = data.reduce((a, b) => (b[1] < a[1] ? b : a));

  return (
    <Section title="תנועה לפי שעה">
      <div className="flex h-28 items-end gap-1.5">
        {data.map(([h, v]) => {
          const ratio = max ? v / max : 0;
          return (
            <div key={h} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t-[6px]"
                style={{
                  height: `${Math.max(4, ratio * 88)}px`,
                  background: h === peak[0] ? "var(--coral-600)" : `rgba(232,115,74,${0.25 + ratio * 0.4})`,
                }}
              />
              <span className="tnum text-[10px] text-ink-3">{h}</span>
            </div>
          );
        })}
      </div>
      <p className="tnum mt-2 text-[11px] text-ink-3">
        שעת השיא {String(peak[0]).padStart(2, "0")}:00 · {String(quiet[0]).padStart(2, "0")}:00 שקטה
      </p>
    </Section>
  );
}

/* ------------------------------ class split ----------------------------- */

function ClassSplit({ rows }: { rows: Row[] }) {
  const { vat } = usePrefs();
  const groups = useMemo(
    () => groupSum(rows, (r) => str(r["vehicle_class"]) || "אחר", (r) => amountOf(r, vat)),
    [rows, vat],
  );
  const carsIn = (cls: string) =>
    uniqueCount(rows.filter((r) => (str(r["vehicle_class"]) || "אחר") === cls), (r) => str(get(r, vehicleKeys)));
  const total = groups.reduce((s, g) => s + g.value, 0);
  if (!groups.length || !total) return null;

  const colors = ["var(--coral-600)", "var(--coral-400)", "var(--coral-200)", "var(--coral-100)"];
  let acc = 0;
  const stops = groups
    .slice(0, 4)
    .map((g, i) => {
      const start = (acc / total) * 360;
      acc += g.value;
      const end = (acc / total) * 360;
      return `${colors[i]} ${start}deg ${end}deg`;
    })
    .join(", ");

  const vehicles = uniqueCount(rows, (r) => str(get(r, vehicleKeys))) || rows.length;

  return (
    <Section title="כבד מול פרטי">
      <div className="flex items-center gap-5">
        <div
          className="relative size-28 shrink-0 rounded-full"
          style={{ background: `conic-gradient(${stops})` }}
        >
          <div className="absolute inset-[14px] flex flex-col items-center justify-center rounded-full bg-white">
            <span className="tnum text-[14px] font-500 text-ink">{ils(total)}</span>
            <span className="tnum text-[10px] text-ink-3">{int(vehicles)} רכבים</span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {groups.slice(0, 4).map((g, i) => (
            <div key={g.key} className="flex items-center gap-2 text-[12.5px]">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: colors[i] }} />
              <span className="min-w-0 flex-1 truncate text-ink">{g.key}</span>
              <span className="tnum text-ink-3">{Math.round((g.value / total) * 100)}%</span>
              <span className="tnum text-ink-2">{carsIn(g.key)} רכבים</span>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ----------------------------- service mix ------------------------------ */

function ServiceMix({ rows }: { rows: Row[] }) {
  const { vat } = usePrefs();
  const groups = useMemo(
    () =>
      groupSum(
        rows,
        (r) => [str(r["category"]), str(r["family_desc"])].filter(Boolean).join(" · ") || "אחר",
        (r) => amountOf(r, vat),
      ).slice(0, 6),
    [rows, vat],
  );
  if (!groups.length) return null;
  const max = groups[0]?.value ?? 0;

  return (
    <Section title="מה נמכר">
      <div className="space-y-2.5">
        {groups.map((g) => (
          <div key={g.key}>
            <div className="mb-1 flex items-center justify-between text-[12.5px]">
              <span className="text-ink">{g.key}</span>
              <span className="tnum text-ink-2">{ils(g.value)}</span>
            </div>
            <Bar value={g.value} max={max} />
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------------------------- top customers ----------------------------- */

function TopCustomers() {
  const { vat } = usePrefs();
  const q = useView("v_customers_unified", null, { limit: 500 });
  const top = useMemo(() => {
    const rows = q.data ?? [];
    return [...rows]
      .sort((a, b) => amountOf(b, vat) - amountOf(a, vat))
      .slice(0, 3);
  }, [q.data, vat]);

  if (q.isLoading) return <Section title="לקוחות מובילים"><SkeletonBlock rows={3} /></Section>;
  if (!top.length) return null;

  return (
    <Section title="לקוחות מובילים">
      <div className="space-y-3">
        {top.map((c, i) => {
          const name = customerName(c);
          const life = num(get(c, ["lifetime_net", "lifetime_gross", "lifetime", "total_net"]));
          return (
            <div key={i} className="flex items-center gap-3">
              <Avatar initials={initials(name)} name={name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[14px] text-ink">{name}</span>
                  {i === 0 && <IconMedal size={15} stroke={1.5} className="text-[#C9A227]" />}
                </div>
                <div className="tnum text-[11px] text-ink-3">
                  {int(num(get(c, ["visits", "visit_count"])))} ביקורים ·{" "}
                  {int(num(get(c, ["vehicles", "vehicle_count"])))} רכבים
                </div>
              </div>
              <span className="tnum text-[14px] text-ink">{ils(life || amountOf(c, vat))}</span>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ------------------------------- top sizes ------------------------------ */

function TopSizes({ rows }: { rows: Row[] }) {
  const { vat } = usePrefs();
  const sizes = useMemo(
    () => groupSum(rows.filter((r) => str(get(r, sizeKeys))), (r) => str(get(r, sizeKeys)), (r) => amountOf(r, vat)).slice(0, 8),
    [rows, vat],
  );
  if (!sizes.length) return null;
  return (
    <Section title="מידות מובילות">
      <div className="flex flex-wrap gap-2">
        {sizes.map((s, i) => (
          <Chip key={s.key} tone={i < 3 ? "coral" : "plain"}>
            <span dir="ltr">{s.key}</span>
            <span className="opacity-60">·</span>
            {int(s.count)} יח׳
            <span className="opacity-60">·</span>
            {ils(s.value)}
          </Chip>
        ))}
      </div>
    </Section>
  );
}

/* ---------------------------- recent vehicles --------------------------- */

function RecentVehicles({ rows }: { rows: Row[] }) {
  const { vat } = usePrefs();
  const recent = rows.slice(0, 8);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const n = customerName(r);
      m.set(n, (m.get(n) ?? 0) + 1);
    }
    return m;
  }, [rows]);

  return (
    <Section title="רכבים אחרונים">
      <div className="space-y-3">
        {recent.map((r, i) => {
          const name = customerName(r);
          const repeats = counts.get(name) ?? 1;
          return (
            <div key={i} className="flex items-center gap-3">
              <Avatar initials={initials(name)} name={name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[14px] text-ink">{name}</span>
                  {repeats > 1 && (
                    <span className="rounded-full bg-[#E4F4EE] px-1.5 py-0.5 text-[10px] text-up">
                      חוזר ×{repeats}
                    </span>
                  )}
                </div>
                <div className="tnum truncate text-[11px] text-ink-3">
                  {[timeOf(get(r, ["signed_at", "doc_time", "doc_date"])), str(get(r, vehicleKeys)), str(get(r, ["family_desc", "category", "part_des"]))]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
              <div className="text-left">
                <div className="tnum text-[14px] text-ink">{ils(amountOf(r, vat))}</div>
                <div className="text-[10.5px] text-ink-3">{str(get(r, ["vehicle_class"]))}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* -------------------------------- finance ------------------------------- */

function FinanceStrip() {
  const q = useView("customer_obligo", null, { limit: 2000 });
  if (q.isLoading) return <Section title="כספים"><SkeletonBlock rows={2} /></Section>;
  if (q.isError || !(q.data ?? []).length) return null;
  const rows = q.data ?? [];
  const openSum = rows.reduce((s, r) => s + num(get(r, ["open_balance", "balance", "debt", "amount"])), 0);
  const overdue = rows.reduce(
    (s, r) => s + num(get(r, ["overdue", "past_due", "aging_90", "days_90"])),
    0,
  );
  const supplier = 0;
  const weekly = rows.reduce((s, r) => s + num(get(r, ["due_this_week", "expected_week"])), 0);

  return (
    <Section title="כספים">
      <div className="grid grid-cols-2 gap-2.5">
        <ColorCard label="חייבים לי" value={ils(openSum)} bg="var(--teal-bg)" fg="var(--teal-fg)" />
        <ColorCard label="אני חייב" value={ils(supplier)} bg="var(--violet-bg)" fg="var(--violet-fg)" />
        <ColorCard label="בפיגור" value={ils(overdue)} bg="var(--amber-bg)" fg="var(--amber-fg)" />
        <ColorCard
          label="צפוי להיכנס השבוע"
          value={ils(weekly)}
          bg="var(--blue-bg)"
          fg="var(--blue-fg)"
        />
      </div>
    </Section>
  );
}

/* --------------------------------- stock -------------------------------- */

function StockStrip() {
  const stock = useView("v_stock_current", null, { limit: 2000 });
  const dead = useView("v_dead_stock", null, { limit: 2000 });
  const forecast = useView("v_stock_forecast", null, { limit: 2000 });

  if (stock.isLoading) return <Section title="מלאי"><SkeletonBlock rows={2} /></Section>;
  if (stock.isError) return null;

  const stockRows = stock.data ?? [];
  const fRows = forecast.data ?? [];
  const soon = fRows.filter((r) => {
    const d = num(get(r, ["days_to_zero", "days_left"]));
    return d > 0 && d <= 7;
  });
  const units = stockRows.reduce((s, r) => s + num(get(r, ["balance", "qty", "quantity", "on_hand"])), 0);
  const urgent = [...soon].sort(
    (a, b) => num(get(a, ["days_to_zero"])) - num(get(b, ["days_to_zero"])),
  )[0];

  return (
    <Section title="מלאי">
      <div className="grid grid-cols-3 gap-2.5">
        <MetricCard label="ייגמר השבוע" value={int(soon.length)} sub="פריטים" />
        <MetricCard label="צמיגים במלאי" value={int(units)} sub="יחידות" />
        <MetricCard label="מלאי מת" value={int((dead.data ?? []).length)} sub="פריטים" />
      </div>
      {urgent && (
        <p className="tnum mt-3 text-[11px] text-ink-2">
          הדחוף ביותר: {str(get(urgent, sizeKeys))} {str(get(urgent, ["brand", "manufacturer"]))} ·
          נותרו {int(num(get(urgent, ["balance", "qty"])))} יח׳ · צפוי להיגמר בעוד{" "}
          {int(num(get(urgent, ["days_to_zero"])))} ימים
        </p>
      )}
    </Section>
  );
}

/* -------------------------------- insights ------------------------------ */

function Insights() {
  const q = useView("v_insights", null, { limit: 20 });
  const rows = q.data ?? [];
  if (!rows.length) return null;
  return (
    <Section title="תובנות">
      <div className="space-y-2">
        {rows.map((r, i) => (
          <p key={i} className="rounded-[14px] bg-coral-050 px-3.5 py-3 text-[12.5px] text-coral-900">
            {str(get(r, ["insight", "text", "message", "title"]))}
          </p>
        ))}
      </div>
    </Section>
  );
}
