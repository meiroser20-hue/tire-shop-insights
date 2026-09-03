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
  IconClock,
  IconChartPie,
  IconTrophy,
  IconRuler2,
  IconTags,
  IconHistory,
  IconCoins,
  IconPackage,
  IconBulb,
} from "@tabler/icons-react";
import { AppShell, Page, ScreenHeader } from "@/components/AppShell";
import {
  AnimatedInt,
  AnimatedMoney,
  Bar,
  BrandGrid,
  ColumnChart,
  Delta,
  Donut,
  EmptyState,
  ErrorState,
  Gauge,
  GlassMetric,
  Leaderboard,
  Pill,
  Plate,
  Quote,
  ReturningTag,
  Section,
  Segmented,
  Skeleton,
  SkeletonBlock,
  SoftCard,
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
import { displayName } from "@/lib/brand";
import { useRotating } from "@/lib/motion";
import { agoText, greeting, ils, int, pct, timeOf, change, cars, visits } from "@/lib/format";

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
  const { profile, session } = useAuth();
  const { vat, setVat } = usePrefs();
  const [salesRange, setSalesRange] = useState<TimeKey>("today");
  const [hoursRange, setHoursRange] = useState<TimeKey>("today");
  const [mixRange, setMixRange] = useState<TimeKey>("today");
  const [topCustRange, setTopCustRange] = useState<TimeKey>("month");
  const [sizesRange, setSizesRange] = useState<TimeKey>("month");
  const [brandsRange, setBrandsRange] = useState<TimeKey>("month");
  const [recentRange, setRecentRange] = useState<TimeKey>("today");

  const sales = useView("v_sales", salesRange, { limit: 5000 });
  const prev = usePrevView("v_sales", salesRange);
  const hours = useView("v_sales", hoursRange, { limit: 5000 });
  const mix = useView("v_sales", mixRange, { limit: 5000 });
  const topCustomers = useView("v_sales", topCustRange, { limit: 5000 });
  const sizes = useView("v_sales", sizesRange, { limit: 5000 });
  const brands = useView("v_sales", brandsRange, { limit: 5000 });
  const recent = useView("v_sales", recentRange, { limit: 5000 });
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

  /* תובנות חיות — נבנות רק ממה שקיים בנתונים. אין שורה בלי מספר אמיתי מאחוריה. */
  const insights = useMemo(
    () => buildInsights(rows, total, prevTotal, vat),
    [rows, total, prevTotal, vat],
  );
  const ticker = useRotating(insights.length ? insights : [lastSync || "מסתנכרן מפריוריטי"], 4500);

  return (
    <>
      <ScreenHeader
        title={greeting(displayName(profile?.full_name, session?.user.email))}
        subtitle={
          <span
            className="inline-block transition-opacity duration-500"
            style={{ opacity: ticker.visible ? 1 : 0 }}
          >
            {ticker.text}
          </span>
        }
      >
        <div className="space-y-3">
          <TimeFilter
            value={salesRange}
            onChange={setSalesRange}
            options={["today", "yesterday", "week", "month"]}
          />
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
              <div className="hero-number tnum leading-none">
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
              action={<Pill onClick={() => setSalesRange("yesterday")}>הצג את אתמול</Pill>}
            />
          </div>
        ) : (
          <div className="dashboard-grid">
            <Metrics rows={rows} prevRows={prev.data ?? []} />
            <HourlySection rows={hours.data ?? []} range={hoursRange} onRange={setHoursRange} />
            <ClassSplit rows={mix.data ?? []} range={mixRange} onRange={setMixRange} />
            <ServiceMix rows={mix.data ?? []} range={mixRange} onRange={setMixRange} />
            <TopCustomers
              rows={topCustomers.data ?? []}
              range={topCustRange}
              onRange={setTopCustRange}
            />
            <TopSizes rows={sizes.data ?? []} range={sizesRange} onRange={setSizesRange} />
            <TopBrands rows={brands.data ?? []} range={brandsRange} onRange={setBrandsRange} />
            <RecentVehicles rows={recent.data ?? []} range={recentRange} onRange={setRecentRange} />
          </div>
        )}

        <div className="dashboard-grid">
          <FinanceStrip />
          <StockStrip />
          <Insights />
        </div>
        <div className="hairline flex items-center justify-center gap-1.5 py-6 text-[11px] text-ink-3">
          <IconRefresh size={13} stroke={1.5} />
          {lastSync || "מסתנכרן מפריוריטי כל 3 דקות"}
        </div>
      </Page>
    </>
  );
}

/* ------------------------------- insights ------------------------------- */

function buildInsights(rows: Row[], total: number, prevTotal: number, vat: "net" | "gross") {
  const out: string[] = [];
  if (!rows.length) return out;

  const vehicles = uniqueCount(rows, (r) => str(get(r, vehicleKeys)));
  if (vehicles > 0 && total > 0) {
    out.push(`${cars(vehicles)} · ממוצע ${ils(total / vehicles)} לרכב`);
  }

  const delta = change(total, prevTotal);
  if (delta !== null && Math.abs(delta) >= 1) {
    out.push(
      delta >= 0
        ? `${pct(delta)} מעל התקופה המקבילה`
        : `${pct(Math.abs(delta))} מתחת לתקופה המקבילה`,
    );
  }

  const byHour = new Map<number, number>();
  for (const r of rows) {
    const raw = get(r, ["signed_at", "doc_time", "created_at"]);
    const d = raw ? new Date(str(raw)) : null;
    if (!d || Number.isNaN(d.getTime())) continue;
    byHour.set(d.getHours(), (byHour.get(d.getHours()) ?? 0) + amountOf(r, vat));
  }
  if (byHour.size > 1) {
    const [h, v] = [...byHour.entries()].reduce((a, b) => (b[1] > a[1] ? b : a));
    out.push(`השעה החזקה ${String(h).padStart(2, "0")}:00 · ${ils(v)}`);
  }

  const heavy = rows.filter(isHeavy).reduce((s, r) => s + amountOf(r, vat), 0);
  if (heavy > 0 && total > 0) {
    out.push(`משא כבד מהווה ${Math.round((heavy / total) * 100)}% מההכנסה`);
  }

  const services = groupSum(
    rows,
    (r) => str(r["category"]) || str(r["family_desc"]),
    (r) => amountOf(r, vat),
  ).filter((g) => g.key && g.key !== "אחר");
  if (services[0]) out.push(`${services[0].key} מוביל עם ${ils(services[0].value)}`);

  const biggest = rows.reduce((m, r) => Math.max(m, amountOf(r, vat)), 0);
  if (biggest > 0) out.push(`העסקה הגדולה בתקופה: ${ils(biggest)}`);

  return out;
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
          numericValue={sum(heavy)}
          sub={cars(veh(heavy))}
          delta={change(sum(heavy), sum(prevRows.filter(isHeavy)))}
          color="var(--v-heavy)"
          Icon={IconTruck}
        />
        <GlassMetric
          label="רכב פרטי"
          value={ils(sum(priv))}
          numericValue={sum(priv)}
          sub={cars(veh(priv))}
          delta={change(sum(priv), sum(prevRows.filter(isPrivate)))}
          color="var(--v-private)"
          Icon={IconCar}
        />
        <GlassMetric
          label="ממוצע לרכב"
          value={ils(vehicles ? sum(rows) / vehicles : 0)}
          numericValue={vehicles ? sum(rows) / vehicles : 0}
          sub={cars(vehicles)}
          color="var(--v-commercial)"
          Icon={IconChartBar}
        />
        <GlassMetric
          label="צמיגים נמכרו"
          value={int(catQty("צמיג"))}
          numericValue={catQty("צמיג")}
          format="int"
          sub="יחידות"
          color="var(--s-tire)"
          Icon={IconCircleDot}
        />
        <GlassMetric
          label="תקרים תוקנו"
          value={int(catQty("תקר"))}
          numericValue={catQty("תקר")}
          format="int"
          sub="יחידות"
          color="var(--s-punc)"
          Icon={IconTool}
        />
        <GlassMetric
          label="איזונים"
          value={int(catQty("איזון"))}
          numericValue={catQty("איזון")}
          format="int"
          sub="יחידות"
          color="var(--s-balance)"
          Icon={IconScale}
        />
      </div>
    </Section>
  );
}

/* -------------------------------- hourly -------------------------------- */

type RangeProps = { range: TimeKey; onRange: (range: TimeKey) => void };

function RangePicker({
  range,
  onRange,
  options = ["today", "yesterday", "week", "month"],
}: RangeProps & { options?: TimeKey[] }) {
  return (
    <div className="mb-4">
      <TimeFilter value={range} onChange={onRange} options={options} />
    </div>
  );
}

function HourlySection({ rows, range, onRange }: { rows: Row[] } & RangeProps) {
  const { vat } = usePrefs();
  const data = useMemo(() => {
    const m = new Map<number, { value: number; docs: Set<string> }>();
    for (const r of rows) {
      const raw = get(r, ["signed_at", "doc_time", "created_at"]);
      const d = raw ? new Date(str(raw)) : null;
      if (!d || Number.isNaN(d.getTime())) continue;
      const h = d.getHours();
      const cur = m.get(h) ?? { value: 0, docs: new Set<string>() };
      cur.value += amountOf(r, vat);
      const doc = str(get(r, ["doc_no", "document_no"]));
      if (doc) cur.docs.add(doc);
      m.set(h, cur);
    }
    return [...m.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([h, x]) => [h, x.value, x.docs.size] as [number, number, number]);
  }, [rows, vat]);

  if (!data.length) return null;

  const peak = data.reduce((a, b) => (b[1] > a[1] ? b : a));
  const quiet = data.reduce((a, b) => (b[1] < a[1] ? b : a));
  const hh = (k: string | number) => String(k).padStart(2, "0");

  return (
    <Section title="תנועה לפי שעה" icon={IconClock}>
      <RangePicker range={range} onRange={onRange} />
      <ColumnChart
        data={data}
        labelOf={(k) => `${hh(k)}:00`}
        axisOf={(k) => hh(k)}
        valueFmt={(v) => ils(v)}
        subFmt={(c) => visits(c)}
      />
      <p className="tnum mt-2 text-[11px] text-ink-3">
        שעת השיא {hh(peak[0])}:00 · {hh(quiet[0])}:00 שקטה
      </p>
    </Section>
  );
}

/* ------------------------------ class split ----------------------------- */

function ClassSplit({ rows, range, onRange }: { rows: Row[] } & RangeProps) {
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
    <Section title="כבד מול פרטי" icon={IconChartPie}>
      <RangePicker range={range} onRange={onRange} />
      <div className="flex items-center gap-5">
        <Donut
          slices={top.map((g, i) => ({ key: g.key, value: g.value, color: colorOf(g.key, i) }))}
          center={ils(total)}
          numericCenter={total}
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
              <span className="tnum text-ink-3">
                <AnimatedInt value={(g.value / total) * 100} />%
              </span>
              <span className="tnum text-ink-2">{cars(carsIn(g.key))}</span>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ----------------------------- service mix ------------------------------ */

function ServiceMix({ rows, range, onRange }: { rows: Row[] } & RangeProps) {
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
    <Section title="השירותים המובילים" icon={IconTool}>
      <RangePicker range={range} onRange={onRange} />
      <div className="space-y-3">
        {groups.map((g, i) => (
          <div key={g.key}>
            <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
              <span className="flex min-w-0 items-center gap-2 text-ink">
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ background: tones[i % tones.length] ?? "var(--red-500)" }}
                />
                <span className="truncate">{g.key}</span>
              </span>
              <AnimatedMoney value={g.value} className="text-ink-2" />
            </div>
            <Bar
              value={g.value}
              max={max}
              height={5}
              color={tones[i % tones.length] ?? "var(--red-500)"}
            />
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------------------------- top customers ----------------------------- */

function TopCustomers({ rows, range, onRange }: { rows: Row[] } & RangeProps) {
  const { vat } = usePrefs();
  const top = useMemo(() => {
    const grouped = new Map<
      string,
      { value: number; visits: Set<string>; vehicles: Set<string> }
    >();
    for (const row of rows) {
      const name = customerName(row);
      const item = grouped.get(name) ?? {
        value: 0,
        visits: new Set<string>(),
        vehicles: new Set<string>(),
      };
      item.value += amountOf(row, vat);
      item.visits.add(str(get(row, ["doc_no", "document_no"])) || String(item.visits.size));
      const vehicle = str(get(row, vehicleKeys));
      if (vehicle) item.vehicles.add(vehicle);
      grouped.set(name, item);
    }
    return [...grouped.entries()].sort((a, b) => b[1].value - a[1].value).slice(0, 5);
  }, [rows, vat]);
  if (!top.length) return null;

  return (
    <Section title="לקוחות מובילים" icon={IconTrophy}>
      <RangePicker range={range} onRange={onRange} />
      <Leaderboard
        items={top.map(([name, item], i) => ({
          key: `${name}-${i}`,
          name,
          value: item.value,
          sub: `${visits(item.visits.size)} · ${cars(item.vehicles.size)}`,
        }))}
      />
    </Section>
  );
}

/* ------------------------------- top sizes ------------------------------ */

function TopSizes({ rows, range, onRange }: { rows: Row[] } & RangeProps) {
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
    <Section title="מידות מובילות" icon={IconRuler2}>
      <RangePicker range={range} onRange={onRange} />
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

/* ------------------------------ top brands ------------------------------ */

const brandKeys = ["brand", "manufacturer", "brand_name", "brand_des"];

function TopBrands({ rows, range, onRange }: { rows: Row[] } & RangeProps) {
  const { vat } = usePrefs();
  const brands = useMemo(() => {
    const withBrand = rows.filter((r) => str(get(r, brandKeys)));
    const units = new Map<string, number>();
    for (const r of withBrand) {
      const k = str(get(r, brandKeys));
      units.set(k, (units.get(k) ?? 0) + (num(get(r, qtyKeys)) || 1));
    }
    return groupSum(
      withBrand,
      (r) => str(get(r, brandKeys)),
      (r) => amountOf(r, vat),
    )
      .slice(0, 6)
      .map((g) => ({ ...g, units: units.get(g.key) ?? 0 }));
  }, [rows, vat]);

  /* no brand column populated yet — show nothing rather than guess */
  if (!brands.length) return null;

  return (
    <Section title="מותגים מובילים" icon={IconTags}>
      <RangePicker range={range} onRange={onRange} />
      <BrandGrid
        items={brands.map((b) => ({
          key: b.key,
          name: b.key,
          value: b.value,
          sub: `${int(b.units)} יח׳`,
        }))}
      />
    </Section>
  );
}

/* ---------------------------- recent vehicles --------------------------- */

function RecentVehicles({ rows, range, onRange }: { rows: Row[] } & RangeProps) {
  const { vat } = usePrefs();
  const [shown, setShown] = useState(10);
  const recent = rows.slice(0, shown);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const n = customerName(r);
      m.set(n, (m.get(n) ?? 0) + 1);
    }
    return m;
  }, [rows]);

  return (
    <Section title="רכבים אחרונים" icon={IconHistory}>
      <RangePicker
        range={range}
        onRange={(r) => {
          setShown(10);
          onRange(r);
        }}
        options={["today", "yesterday", "week"]}
      />
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
            numericValue: amountOf(r, vat),
          };
        })}
      />
      {rows.length > shown && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setShown((n) => n + 10)}
            className="tap rounded-full border border-line bg-white px-4 py-1.5 text-[12px] text-ink-2 hover:bg-red-050"
          >
            ראה עוד · נותרו {int(rows.length - shown)}
          </button>
        </div>
      )}
    </Section>
  );
}

/* -------------------------------- finance ------------------------------- */

function FinanceStrip() {
  const q = useView("customer_obligo", null, { limit: 2000 });
  if (q.isLoading)
    return (
      <Section title="כספים" icon={IconCoins}>
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
    <Section title="כספים" icon={IconCoins}>
      <div className="grid grid-cols-3 gap-2.5">
        <SoftCard
          label="חייבים לי"
          value={ils(openSum)}
          numericValue={openSum}
          sub={`${int(rows.length)} לקוחות`}
          tint="var(--tint-green)"
          fg="#1F5E3B"
          className="col-span-2 row-span-2 flex flex-col justify-center"
        />
        <SoftCard
          label="בפיגור"
          value={ils(overdue)}
          numericValue={overdue}
          tint="var(--tint-amber)"
          fg="#8A5A0B"
        />
        <SoftCard
          label="עד 30 יום"
          value={ils(soon)}
          numericValue={soon}
          tint="var(--tint-red)"
          fg="var(--red-800)"
        />
        <SoftCard
          label="צפוי"
          value={ils(future)}
          numericValue={future}
          tint="var(--tint-green)"
          fg="#1F5E3B"
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
      <Section title="מלאי" icon={IconPackage}>
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
    <Section title="מלאי" icon={IconPackage}>
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
    <Section title="תובנות" icon={IconBulb}>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <Quote key={i}>{str(get(r, ["insight", "text", "message", "title"]))}</Quote>
        ))}
      </div>
    </Section>
  );
}
