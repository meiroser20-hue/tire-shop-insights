import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  IconRefresh,
  IconTruck,
  IconCar,
  IconChartBar,
  IconCircleDot,
  IconTool,
  IconScale,
} from "@tabler/icons-react";
import { AppShell, Page, ScreenHeader } from "@/components/AppShell";
import {
  AnimatedInt,
  AnimatedMoney,
  Bar,
  ColorCard,
  ColumnChart,
  Delta,
  Donut,
  EmptyState,
  ErrorState,
  Gauge,
  GlassMetric,
  Pill,
  Plate,
  Quote,
  RankedList,
  ReturningTag,
  Section,
  Segmented,
  Skeleton,
  SkeletonBlock,
  Sparkline,
  TimeFilter,
  Timeline,
  VolumeChips,
} from "@/components/kit";
import {
  amountOf,
  customerName,
  get,
  groupSum,
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
import { agoText, greeting, ils, int, timeOf, change, cars, visits } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "בית · ברכת הדרך" },
      {
        name: "description",
        content: "מבט יומי על ההכנסות, הרכבים, המלאי והכספים של פנצ'ריית ברכת הדרך.",
      },
      { property: "og:title", content: "בית · ברכת הדרך" },
      {
        property: "og:description",
        content: "מבט יומי על ההכנסות, הרכבים והמלאי בפנצ'ריית ברכת הדרך.",
      },
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

const CLASS_COLORS: Record<string, string> = {
  משא: "var(--v-heavy)",
  פרטי: "var(--v-private)",
  מסחרי: "var(--v-commercial)",
  טרקטור: "var(--v-tractor)",
  בלון: "var(--v-balloon)",
};

function Home() {
  const { profile } = useAuth();
  const { vat, setVat } = usePrefs();
  const [time, setTime] = useState<TimeKey>("today");

  const sales = useView("v_sales", time, { limit: 5000 });
  const prev = usePrevView("v_sales", time);
  const daily = useView("v_daily_summary", null, {
    limit: 14,
    order: { key: ["doc_date"] },
  });
  const sync = useView("sync_log", null, {
    limit: 1,
    order: { key: ["finished_at", "started_at"] },
  });

  const rows = sales.data ?? [];
  const total = useMemo(() => rows.reduce((s, r) => s + amountOf(r, vat), 0), [rows, vat]);
  const prevTotal = useMemo(
    () => (prev.data ?? []).reduce((s, r) => s + amountOf(r, vat), 0),
    [prev.data, vat],
  );

  const spark = useMemo(() => {
    const d = [...(daily.data ?? [])]
      .sort((a, b) => str(a["doc_date"]).localeCompare(str(b["doc_date"])))
      .slice(-7);
    return d.map((r) => num(get(r, vat === "net" ? ["revenue_net"] : ["revenue_gross"])));
  }, [daily.data, vat]);

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
              <div className="tnum text-[50px] font-500 leading-none text-red-900">
                <AnimatedMoney value={total} />
              </div>
              <div className="mt-2">
                <Delta value={change(total, prevTotal)} />
              </div>
              {spark.length > 1 && (
                <div className="mx-auto mt-3 max-w-[280px]">
                  <Sparkline points={spark} color="var(--red-700)" />
                  <div className="mt-0.5 text-[10.5px] text-red-900/60">7 הימים האחרונים</div>
                </div>
              )}
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
        <GlassMetric
          label="משא כבד"
          value={ils(sum(heavy))}
          sub={cars(veh(heavy))}
          delta={change(sum(heavy), sum(prevRows.filter(isHeavy)))}
          color="var(--v-heavy)"
          Icon={IconTruck}
        />
        <GlassMetric
          label="רכב פרטי"
          value={ils(sum(priv))}
          sub={cars(veh(priv))}
          delta={change(sum(priv), sum(prevRows.filter(isPrivate)))}
          color="var(--v-private)"
          Icon={IconCar}
        />
        <GlassMetric
          label="ממוצע לרכב"
          value={ils(vehicles ? sum(rows) / vehicles : 0)}
          sub={cars(vehicles)}
          color="var(--v-commercial)"
          Icon={IconChartBar}
        />
        <GlassMetric
          label="צמיגים נמכרו"
          value={int(catQty("צמיג"))}
          sub="יחידות"
          color="var(--s-tire)"
          Icon={IconCircleDot}
        />
        <GlassMetric
          label="תקרים תוקנו"
          value={int(catQty("תקר"))}
          sub="יחידות"
          color="var(--s-punc)"
          Icon={IconTool}
        />
        <GlassMetric
          label="איזונים"
          value={int(catQty("איזון"))}
          sub="יחידות"
          color="var(--s-balance)"
          Icon={IconScale}
        />
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
    return [...m.entries()].sort((a, b) => a[0] - b[0]) as Array<[number, number]>;
  }, [rows, vat]);

  if (!data.length) return null;

  const peak = data.reduce((a, b) => (b[1] > a[1] ? b : a));
  const quiet = data.reduce((a, b) => (b[1] < a[1] ? b : a));

  return (
    <Section title="תנועה לפי שעה">
      <ColumnChart data={data} valueFmt={(v) => ils(v)} />
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
    () =>
      groupSum(
        rows,
        (r) => str(r["vehicle_class"]) || "אחר",
        (r) => amountOf(r, vat),
      ),
    [rows, vat],
  );
  const carsIn = (cls: string) =>
    uniqueCount(
      rows.filter((r) => (str(r["vehicle_class"]) || "אחר") === cls),
      (r) => str(get(r, vehicleKeys)),
    );
  const total = groups.reduce((s, g) => s + g.value, 0);
  if (!groups.length || !total) return null;

  const fallback = ["var(--red-600)", "var(--red-400)", "var(--red-200)", "var(--red-100)"];
  const top = groups.slice(0, 5);
  const colorOf = (k: string, i: number) => CLASS_COLORS[k] ?? fallback[i % fallback.length] ?? "";

  const vehicles = uniqueCount(rows, (r) => str(get(r, vehicleKeys))) || rows.length;

  return (
    <Section title="כבד מול פרטי">
      <div className="flex items-center gap-5">
        <Donut
          slices={top.map((g, i) => ({ key: g.key, value: g.value, color: colorOf(g.key, i) }))}
          center={ils(total)}
          sub={cars(vehicles)}
        />
        <div className="min-w-0 flex-1 space-y-2">
          {top.map((g, i) => (
            <div key={g.key} className="flex items-center gap-2 text-[12.5px]">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: colorOf(g.key, i) }}
              />
              <span className="min-w-0 flex-1 truncate text-ink">{g.key}</span>
              <span className="tnum text-ink-3">{Math.round((g.value / total) * 100)}%</span>
              <span className="tnum text-ink-2">{cars(carsIn(g.key))}</span>
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
  const tones = [
    "var(--s-tire)",
    "var(--s-punc)",
    "var(--s-balance)",
    "var(--s-mount)",
    "var(--s-calib)",
  ];

  return (
    <Section title="מה נמכר">
      <div className="space-y-2.5">
        {groups.map((g, i) => (
          <div key={g.key}>
            <div className="mb-1 flex items-center justify-between text-[12.5px]">
              <span className="text-ink">{g.key}</span>
              <span className="tnum text-ink-2">{ils(g.value)}</span>
            </div>
            <Bar value={g.value} max={max} color={tones[i % tones.length] ?? "var(--red-500)"} />
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
    return [...rows].sort((a, b) => amountOf(b, vat) - amountOf(a, vat)).slice(0, 3);
  }, [q.data, vat]);

  if (q.isLoading)
    return (
      <Section title="לקוחות מובילים">
        <SkeletonBlock rows={3} />
      </Section>
    );
  if (!top.length) return null;

  return (
    <Section title="לקוחות מובילים">
      <RankedList
        items={top.map((c, i) => {
          const life = num(get(c, ["lifetime_net", "lifetime_gross", "lifetime", "total_net"]));
          const value = life || amountOf(c, vat);
          return {
            key: `${i}`,
            label: customerName(c),
            value,
            valueText: ils(value),
            sub: `${visits(num(get(c, ["visits", "visit_count"])))} · ${cars(
              num(get(c, ["vehicles", "vehicle_count"])),
            )}`,
          };
        })}
      />
    </Section>
  );
}

/* ------------------------------- top sizes ------------------------------ */

function TopSizes({ rows }: { rows: Row[] }) {
  const { vat } = usePrefs();
  const sizes = useMemo(
    () =>
      groupSum(
        rows.filter((r) => str(get(r, sizeKeys))),
        (r) => str(get(r, sizeKeys)),
        (r) => amountOf(r, vat),
      ).slice(0, 10),
    [rows, vat],
  );
  if (!sizes.length) return null;
  return (
    <Section title="מידות מובילות">
      <VolumeChips
        items={sizes.map((s) => ({
          key: s.key,
          value: s.value,
          text: `${s.key} · ${int(s.count)} יח׳`,
        }))}
      />
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
      <Timeline
        items={recent.map((r, i) => {
          const name = customerName(r);
          const repeats = counts.get(name) ?? 1;
          const plate = str(get(r, vehicleKeys));
          return {
            key: `${i}`,
            time: timeOf(get(r, ["signed_at", "doc_time", "doc_date"])),
            title: (
              <span className="flex items-center gap-2">
                <span className="truncate">{name}</span>
                {repeats > 1 && <ReturningTag times={repeats} />}
              </span>
            ),
            sub: (
              <span className="flex items-center gap-2">
                {plate && <Plate>{plate}</Plate>}
                <span>
                  {[str(get(r, ["family_desc", "category", "part_des"])), str(r["vehicle_class"])]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            ),
            value: ils(amountOf(r, vat)),
          };
        })}
      />
    </Section>
  );
}

/* -------------------------------- finance ------------------------------- */

function FinanceStrip() {
  const q = useView("customer_obligo", null, { limit: 2000 });
  if (q.isLoading)
    return (
      <Section title="כספים">
        <SkeletonBlock rows={2} />
      </Section>
    );
  if (q.isError || !(q.data ?? []).length) return null;
  const rows = q.data ?? [];
  const openSum = rows.reduce(
    (s, r) => s + num(get(r, ["open_debt", "open_balance", "balance"])),
    0,
  );
  const overdue = rows.reduce((s, r) => s + num(get(r, ["total_overdue", "over_90"])), 0);
  const soon = rows.reduce((s, r) => s + num(get(r, ["days_1_30"])), 0);
  const future = rows.reduce((s, r) => s + num(get(r, ["future"])), 0);

  return (
    <Section title="כספים">
      <div className="grid grid-cols-3 gap-2.5">
        <ColorCard
          label="חייבים לי"
          value={ils(openSum)}
          bg="var(--teal-bg)"
          fg="var(--teal-fg)"
          className="col-span-2 row-span-2 flex flex-col justify-center"
        />
        <ColorCard label="בפיגור" value={ils(overdue)} bg="#FCE8ED" fg="var(--red-700)" />
        <ColorCard label="עד 30 יום" value={ils(soon)} bg="var(--amber-bg)" fg="var(--amber-fg)" />
        <ColorCard
          label="עתידי"
          value={ils(future)}
          bg="var(--blue-bg)"
          fg="var(--blue-fg)"
          className="col-span-3"
        />
      </div>
    </Section>
  );
}

/* --------------------------------- stock -------------------------------- */

function StockStrip() {
  const stock = useView("v_stock_current", null, { limit: 2000 });
  const forecast = useView("v_stock_forecast", null, { limit: 2000 });

  if (stock.isLoading)
    return (
      <Section title="מלאי">
        <SkeletonBlock rows={2} />
      </Section>
    );
  if (stock.isError) return null;

  const stockRows = stock.data ?? [];
  const fRows = forecast.data ?? [];
  const soon = fRows.filter((r) => {
    const d = num(get(r, ["days_to_zero", "days_left"]));
    return d > 0 && d <= 7;
  });
  const units = stockRows.reduce((s, r) => s + num(get(r, ["balance", "bal_now", "qty"])), 0);
  const dead = stockRows.filter((r) => num(get(r, ["days_since_move"])) >= 90);

  return (
    <Section title="מלאי">
      <div className="grid grid-cols-3 gap-2.5">
        <Gauge
          value={soon.length}
          max={Math.max(10, fRows.length)}
          label="ייגמר השבוע"
          valueText={int(soon.length)}
          color="var(--red-600)"
        />
        <Gauge
          value={units}
          max={Math.max(1, units)}
          label="יחידות במלאי"
          valueText={int(units)}
          color="var(--s-balance)"
        />
        <Gauge
          value={dead.length}
          max={Math.max(10, stockRows.length)}
          label="מלאי מת"
          valueText={int(dead.length)}
          color="var(--s-mount)"
        />
      </div>
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
          <Quote key={i}>{str(get(r, ["insight", "text", "message", "title"]))}</Quote>
        ))}
      </div>
    </Section>
  );
}
