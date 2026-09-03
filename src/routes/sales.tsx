import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  IconSearch,
  IconReceipt,
  IconClockHour4,
  IconCalendarWeek,
  IconChartPie,
  IconUserCheck,
  IconAlertTriangle,
  IconDiscount2,
} from "@tabler/icons-react";
import { AppShell, Page, ScreenHeader } from "@/components/AppShell";
import {
  Bar,
  ColumnChart,
  Donut,
  EmptyState,
  ErrorState,
  ExportButton,
  MetricCard,
  Plate,
  Section,
  Segmented,
  SkeletonBlock,
  TimeFilter,
} from "@/components/kit";
import {
  amountOf,
  customerName,
  get,
  groupSum,
  num,
  str,
  type Row,
  type TimeKey,
} from "@/lib/data";
import { useView } from "@/lib/hooks";
import { usePrefs } from "@/lib/prefs";
import { exportExcel } from "@/lib/export";
import { ils, int, shortDate, weekdayName } from "@/lib/format";

export const Route = createFileRoute("/sales")({
  head: () => ({
    meta: [
      { title: "מכירות · ברכת הדרך" },
      {
        name: "description",
        content: "עסקאות, שעות פיק, פילוח שירותים ומותגים בפנצ'ריית ברכת הדרך.",
      },
      { property: "og:title", content: "מכירות · ברכת הדרך" },
      { property: "og:description", content: "כל העסקאות והפילוחים של פנצ'ריית ברכת הדרך." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <Sales />
    </AppShell>
  ),
});

const vehicleKeys = ["car_num", "vehicle_no", "vehicle_number", "car_number", "regnum"];
const serviceKeys = ["family_desc", "category", "part_des"];

type SplitBy = "class" | "service" | "brand" | "size";

function Sales() {
  const { vat } = usePrefs();
  const [time, setTime] = useState<TimeKey>("today");
  const [q, setQ] = useState("");
  const [split, setSplit] = useState<SplitBy>("class");
  const sales = useView("v_sales", time, { limit: 5000 });

  const rows = useMemo(() => {
    const all = sales.data ?? [];
    const term = q.trim();
    if (!term) return all;
    return all.filter((r) =>
      [
        customerName(r),
        str(get(r, vehicleKeys)),
        str(get(r, ["part", "sku", "partname", "catalog"])),
      ]
        .join(" ")
        .includes(term),
    );
  }, [sales.data, q]);

  const docs = useMemo(() => {
    const m = new Map<string, { id: string; rows: Row[]; total: number }>();
    for (const r of rows) {
      const id = str(get(r, ["doc_no", "doc_id", "iv_num"])) || "—";
      const cur = m.get(id) ?? { id, rows: [], total: 0 };
      cur.rows.push(r);
      cur.total += amountOf(r, vat);
      m.set(id, cur);
    }
    return [...m.values()].sort((a, b) => b.total - a.total);
  }, [rows, vat]);

  const total = rows.reduce((s, r) => s + amountOf(r, vat), 0);
  const zero = rows.filter((r) => amountOf(r, vat) === 0);
  const discounted = rows.filter(
    (r) => num(get(r, ["doc_discount_pct", "discount", "discount_amount"])) > 0,
  );

  const splitKey = (r: Row) =>
    split === "class"
      ? str(get(r, ["vehicle_class"]))
      : split === "service"
        ? str(r["category"])
        : split === "brand"
          ? str(r["family_desc"])
          : str(get(r, ["part_des", "part_name"]));

  const splitGroups = useMemo(
    () => groupSum(rows, splitKey, (r) => amountOf(r, vat)).slice(0, 8),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, split, vat],
  );

  const hourItems = useMemo(() => {
    const m = new Map<number, { value: number; count: number }>();
    for (const r of rows) {
      const raw = get(r, ["signed_at", "doc_date"]);
      const d = raw ? new Date(str(raw)) : null;
      if (!d || Number.isNaN(d.getTime())) continue;
      const cur = m.get(d.getHours()) ?? { value: 0, count: 0 };
      cur.value += amountOf(r, vat);
      cur.count += 1;
      m.set(d.getHours(), cur);
    }
    return [...m.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([h, v]) => ({ key: `${String(h).padStart(2, "0")}:00`, hour: h, ...v }));
  }, [rows, vat]);

  const weekdayItems = useMemo(() => {
    const m = new Map<number, { value: number; count: number }>();
    for (const r of rows) {
      const raw = get(r, ["doc_date", "signed_at"]);
      const d = raw ? new Date(str(raw)) : null;
      if (!d || Number.isNaN(d.getTime())) continue;
      const cur = m.get(d.getDay()) ?? { value: 0, count: 0 };
      cur.value += amountOf(r, vat);
      cur.count += 1;
      m.set(d.getDay(), cur);
    }
    return [...m.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([n, v]) => ({ key: weekdayName(n), day: n, ...v }));
  }, [rows, vat]);
  const owners = useMemo(
    () =>
      groupSum(
        rows,
        (r) => str(get(r, ["owner_login", "owner", "agent"])) || "לא ידוע",
        (r) => amountOf(r, vat),
      ),
    [rows, vat],
  );

  const doExport = () =>
    exportExcel(
      "מכירות",
      rows.map((r) => ({
        תאריך: shortDate(get(r, ["doc_date", "date", "created_at"])),
        לקוח: customerName(r),
        רכב: str(get(r, vehicleKeys)),
        שירות: str(get(r, serviceKeys)),
        "סוג רכב": str(get(r, ["vehicle_class"])),
        סכום: amountOf(r, vat),
      })),
      "מכירות",
    );

  return (
    <>
      <ScreenHeader title="מכירות">
        <TimeFilter value={time} onChange={setTime} />
      </ScreenHeader>
      <Page>
        {sales.isError ? (
          <div className="py-6">
            <ErrorState onRetry={() => void sales.refetch()} />
          </div>
        ) : sales.isLoading ? (
          <div className="py-6">
            <SkeletonBlock rows={6} />
          </div>
        ) : (
          <>
            <Section first>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard label="סה״כ מכירות" value={ils(total)} numericValue={total} />
                <MetricCard
                  label="עסקאות"
                  value={int(docs.length)}
                  numericValue={docs.length}
                  format="int"
                />
                <MetricCard
                  label="ממוצע לעסקה"
                  value={ils(docs.length ? total / docs.length : 0)}
                  numericValue={docs.length ? total / docs.length : 0}
                />
                <MetricCard
                  label="שורות"
                  value={int(rows.length)}
                  numericValue={rows.length}
                  format="int"
                />
              </div>
            </Section>

            <div className="grid gap-x-8 lg:grid-cols-[1.6fr_1fr]">
              <Section title="שעות פיק" icon={<IconClockHour4 size={15} stroke={1.6} />}>
                {hourItems.length === 0 ? (
                  <EmptyState text="אין נתוני שעות בטווח שנבחר" />
                ) : (
                  <ColumnChart
                    data={hourItems.map((h) => [h.hour, h.value] as [number, number])}
                    labelOf={(k) => String(k).padStart(2, "0")}
                    valueFmt={(v) => ils(v)}
                    subFmt={(k) => `${String(k).padStart(2, "0")}:00`}
                  />
                )}
              </Section>

              <Section title="מי הפיק" icon={<IconUserCheck size={15} stroke={1.6} />}>
                {owners.length === 0 ? (
                  <EmptyState text="אין נתוני מפיקים" />
                ) : (
                  <div className="flex items-center gap-5">
                    <Donut
                      slices={owners.slice(0, 4).map((o, i) => ({
                        key: o.key,
                        value: o.value,
                        color: ["var(--red-600)", "var(--v-private)", "var(--v-commercial)", "var(--s-calib)"][i]!,
                      }))}
                      center={ils(total)}
                      numericCenter={total}
                      sub={`${int(docs.length)} עסקאות`}
                    />
                    <div className="min-w-0 flex-1 space-y-2.5">
                      {owners.slice(0, 4).map((o, i) => (
                        <div key={o.key} className="flex items-center gap-2 text-[12.5px]">
                          <span
                            className="size-2.5 shrink-0 rounded-[3px]"
                            style={{
                              background: ["var(--red-600)", "var(--v-private)", "var(--v-commercial)", "var(--s-calib)"][i],
                            }}
                          />
                          <span className="min-w-0 flex-1 truncate text-ink">{o.key}</span>
                          <span className="tnum text-ink-2">{ils(o.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Section>
            </div>

            <Section title="ימי שבוע" icon={<IconCalendarWeek size={15} stroke={1.6} />}>
              {weekdayItems.length === 0 ? (
                <EmptyState text="אין נתוני ימים בטווח שנבחר" />
              ) : (
                <div className="grid grid-cols-7 gap-2">
                  {weekdayItems.map((d) => {
                    const max = Math.max(...weekdayItems.map((x) => x.value), 1);
                    const r = d.value / max;
                    return (
                      <div
                        key={d.key}
                        className="rounded-[14px] px-2 py-3 text-center"
                        style={{
                          background: `rgba(196,43,78,${0.04 + r * 0.14})`,
                        }}
                      >
                        <div className="text-[11px] text-ink-2">{d.key}</div>
                        <div className="tnum mt-1.5 text-[15px] font-500 text-ink">
                          {ils(d.value)}
                        </div>
                        <div className="tnum mt-0.5 text-[10px] text-ink-3">{int(d.count)} שורות</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

            <Section
              title="פילוח"
              icon={<IconChartPie size={15} stroke={1.6} />}
              action={
                <Segmented
                  value={split}
                  onChange={setSplit}
                  options={[
                    { value: "class", label: "סוג רכב" },
                    { value: "service", label: "שירות" },
                    { value: "brand", label: "משפחה" },
                    { value: "size", label: "פריט" },
                  ]}
                />
              }
            >
              {splitGroups.length === 0 ? (
                <EmptyState text="אין מספיק נתונים לפילוח הזה בטווח שנבחר" />
              ) : (
                <div className="space-y-3.5">
                  {splitGroups.map((g, i) => (
                    <div key={g.key}>
                      <div className="mb-1.5 flex justify-between text-[12.5px]">
                        <span className="text-ink-2">{g.key}</span>
                        <span className="tnum font-500 text-ink">{ils(g.value)}</span>
                      </div>
                      <Bar
                        value={g.value}
                        max={splitGroups[0]?.value ?? 0}
                        thin
                        color={
                          ["var(--s-tire)", "var(--s-punc)", "var(--s-balance)", "var(--s-mount)", "var(--s-calib)"][
                            i % 5
                          ]
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section
              title="עסקאות"
              icon={<IconReceipt size={15} stroke={1.6} />}
              action={<ExportButton onClick={doExport} />}
            >
              <div className="relative mb-4">
                <IconSearch
                  size={16}
                  stroke={1.5}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3"
                />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="חיפוש לקוח, מספר רכב או מק״ט"
                  className="h-12 w-full rounded-[14px] border border-line bg-white pr-10 pl-3 text-[14px] outline-none focus:border-red-400"
                />
              </div>
              {rows.length === 0 ? (
                <EmptyState text="אין עסקאות בטווח שנבחר. שנה את הפילטר או בדוק מאוחר יותר" />
              ) : (
                <div>
                  {docs.slice(0, 100).map((d) => {
                    const r = d.rows[0] as Row;
                    const plate = str(get(r, vehicleKeys));
                    const cls = str(get(r, ["vehicle_class"]));
                    return (
                      <div
                        key={d.id}
                        className="flex items-center gap-3 border-b border-line py-3 last:border-0"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14px] text-ink">{customerName(r)}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-ink-3">
                            <span className="tnum">
                              {shortDate(get(r, ["doc_date", "date", "created_at"]))}
                            </span>
                            {plate && <Plate>{plate}</Plate>}
                            <span className="truncate">
                              {d.rows
                                .map((x) => str(get(x, serviceKeys)))
                                .filter(Boolean)
                                .slice(0, 3)
                                .join(" · ")}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 text-left">
                          <div className="tnum text-[14.5px] font-500 text-ink">{ils(d.total)}</div>
                          {cls && <div className="text-[10px] text-red-700">{cls}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

            <div className="grid gap-x-8 lg:grid-cols-2">
              <Section title="עסקאות ב־₪0" icon={<IconAlertTriangle size={15} stroke={1.6} />}>
                {zero.length === 0 ? (
                  <EmptyState text="אין עסקאות בסכום אפס בטווח שנבחר" />
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    {zero.slice(0, 8).map((r, i) => (
                      <div
                        key={i}
                        className="rounded-[14px] px-3.5 py-3"
                        style={{
                          background:
                            "radial-gradient(110% 90% at 100% 0%, rgba(192,138,46,.18) 0%, rgba(192,138,46,.05) 42%, rgba(255,255,255,0) 78%), #fff",
                        }}
                      >
                        <div className="truncate text-[13px] text-ink">{customerName(r)}</div>
                        <div className="tnum mt-1 text-[10.5px] text-ink-3">
                          {shortDate(get(r, ["doc_date", "date"]))} · {str(get(r, vehicleKeys))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section title="הנחות" icon={<IconDiscount2 size={15} stroke={1.6} />}>
                {discounted.length === 0 ? (
                  <EmptyState text="לא נרשמו הנחות בטווח שנבחר" />
                ) : (
                  <div>
                    {discounted.slice(0, 8).map((r, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 border-b border-line py-2.5 last:border-0"
                      >
                        <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
                          {customerName(r)}
                        </span>
                        <span className="tnum rounded-full bg-[#FBEDED] px-2.5 py-1 text-[11px] text-down">
                          {num(get(r, ["doc_discount_pct", "discount"]))}%−
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </div>
          </>
        )}
      </Page>
    </>
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
    <div className="space-y-2.5">
      {items.map((g) => (
        <div key={g.key}>
          <div className="mb-1 flex justify-between text-[12.5px]">
            <span className="text-ink">{g.key}</span>
            <span className="tnum text-ink-2">{ils(g.value)}</span>
          </div>
          <Bar value={g.value} max={max} />
        </div>
      ))}
    </div>
  );
}
