import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { IconSearch } from "@tabler/icons-react";
import { AppShell, Page, ScreenHeader } from "@/components/AppShell";
import {
  Bar,
  EmptyState,
  ErrorState,
  ExportButton,
  MetricCard,
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
      .map(([h, v]) => ({ key: `${String(h).padStart(2, "0")}:00`, ...v }));
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
      .map(([n, v]) => ({ key: weekdayName(n), ...v }));
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
              <div className="grid grid-cols-3 gap-2.5">
                <MetricCard label="סה״כ מכירות" value={ils(total)} />
                <MetricCard label="עסקאות" value={int(docs.length)} />
                <MetricCard
                  label="ממוצע לעסקה"
                  value={ils(docs.length ? total / docs.length : 0)}
                />
              </div>
            </Section>

            <Section title="עסקאות" action={<ExportButton onClick={doExport} />}>
              <div className="relative mb-3">
                <IconSearch
                  size={16}
                  stroke={1.5}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3"
                />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="חיפוש לקוח, מספר רכב או מק״ט"
                  className="h-11 w-full rounded-[14px] border border-line bg-white pr-9 pl-3 text-[14px] outline-none focus:border-coral-400"
                />
              </div>
              {rows.length === 0 ? (
                <EmptyState text="אין עסקאות בטווח שנבחר. שנה את הפילטר או בדוק מאוחר יותר" />
              ) : (
                <div className="divide-y divide-line overflow-hidden rounded-[14px] border border-line">
                  {docs.slice(0, 100).map((d) => {
                    const r = d.rows[0] as Row;
                    return (
                      <div key={d.id} className="flex items-center gap-3 bg-white px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14px] text-ink">{customerName(r)}</div>
                          <div className="tnum truncate text-[11px] text-ink-3">
                            {[
                              shortDate(get(r, ["doc_date", "date", "created_at"])),
                              str(get(r, vehicleKeys)),
                              d.rows
                                .map((x) => str(get(x, serviceKeys)))
                                .filter(Boolean)
                                .join(", "),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        </div>
                        <span className="tnum text-[14px] text-ink">{ils(d.total)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

            <Section
              title="פילוח"
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
                <div className="space-y-2.5">
                  {splitGroups.map((g) => (
                    <div key={g.key}>
                      <div className="mb-1 flex justify-between text-[12.5px]">
                        <span className="text-ink">{g.key}</span>
                        <span className="tnum text-ink-2">{ils(g.value)}</span>
                      </div>
                      <Bar value={g.value} max={splitGroups[0]?.value ?? 0} />
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="שעות פיק">
              <BarList items={hourItems} />
            </Section>

            <Section title="ימי שבוע">
              <BarList items={weekdayItems} />
            </Section>

            <Section title="מי הפיק">
              <BarList items={owners.slice(0, 6)} />
            </Section>

            <Section title="עסקאות ב־₪0">
              {zero.length === 0 ? (
                <EmptyState text="אין עסקאות בסכום אפס בטווח שנבחר" />
              ) : (
                <div className="space-y-2">
                  {zero.slice(0, 20).map((r, i) => (
                    <div key={i} className="flex justify-between text-[12.5px]">
                      <span className="text-ink">{customerName(r)}</span>
                      <span className="tnum text-ink-3">
                        {str(get(r, vehicleKeys))} · {shortDate(get(r, ["doc_date", "date"]))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="הנחות">
              {discounted.length === 0 ? (
                <EmptyState text="לא נרשמו הנחות בטווח שנבחר" />
              ) : (
                <div className="space-y-2">
                  {discounted.slice(0, 20).map((r, i) => (
                    <div key={i} className="flex justify-between text-[12.5px]">
                      <span className="text-ink">{customerName(r)}</span>
                      <span className="tnum text-down">
                        {num(get(r, ["doc_discount_pct", "discount"]))}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
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
