import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { IconSearch } from "@tabler/icons-react";
import { AppShell, Page, ScreenHeader } from "@/components/AppShell";
import {
  EmptyState,
  ErrorState,
  ExportButton,
  MetricCard,
  Section,
  SkeletonBlock,
} from "@/components/kit";
import { BarList } from "./sales";
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

const sizeK = ["size", "tire_size", "measure"];
const brandK = ["brand", "manufacturer", "maker"];
const balK = ["balance", "qty", "quantity", "on_hand", "stock"];
const daysK = ["days_to_zero", "days_left"];
const rateK = ["rate", "daily_rate", "velocity", "avg_daily"];
const valueK = ["value", "stock_value", "amount"];

type View = "all" | "soon" | "dead";

function Inventory() {
  const stock = useView("v_stock_current", null, { limit: 3000 });
  const dead = useView("v_dead_stock", null, { limit: 2000 });
  const forecast = useView("v_stock_forecast", null, { limit: 3000 });
  const [term, setTerm] = useState("");
  const [view, setView] = useState<View>("all");

  const fMap = useMemo(() => {
    const m = new Map<string, Row>();
    for (const r of forecast.data ?? []) {
      m.set(`${str(get(r, sizeK))}|${str(get(r, brandK))}`, r);
    }
    return m;
  }, [forecast.data]);

  const deadKeys = useMemo(
    () => new Set((dead.data ?? []).map((r) => `${str(get(r, sizeK))}|${str(get(r, brandK))}`)),
    [dead.data],
  );

  const soonCount = (forecast.data ?? []).filter((r) => {
    const d = num(get(r, daysK));
    return d > 0 && d <= 7;
  }).length;

  const stuckValue = (dead.data ?? []).reduce((s, r) => s + num(get(r, valueK)), 0);

  const rows = useMemo(() => {
    let list = stock.data ?? [];
    if (view === "dead")
      list = list.filter((r) => deadKeys.has(`${str(get(r, sizeK))}|${str(get(r, brandK))}`));
    if (view === "soon")
      list = list.filter((r) => {
        const f = fMap.get(`${str(get(r, sizeK))}|${str(get(r, brandK))}`);
        const d = f ? num(get(f, daysK)) : 0;
        return d > 0 && d <= 7;
      });
    const t = term.trim();
    if (t)
      list = list.filter((r) =>
        [
          str(get(r, sizeK)),
          str(get(r, brandK)),
          str(get(r, ["sku", "part", "partname", "catalog"])),
        ]
          .join(" ")
          .includes(t),
      );
    return list;
  }, [stock.data, view, term, deadKeys, fMap]);

  const suppliers = useMemo(
    () =>
      groupSum(
        stock.data ?? [],
        (r) => str(get(r, ["supplier", "vendor"])) || "ללא ספק",
        (r) => num(get(r, valueK)),
      ),
    [stock.data],
  );

  const suggestions = useMemo(
    () =>
      (forecast.data ?? [])
        .filter((r) => {
          const d = num(get(r, daysK));
          return d > 0 && d <= 14;
        })
        .sort((a, b) => num(get(a, daysK)) - num(get(b, daysK)))
        .slice(0, 12),
    [forecast.data],
  );

  const doExport = () =>
    exportExcel(
      "מלאי",
      rows.map((r) => ({
        מידה: str(get(r, sizeK)),
        מותג: str(get(r, brandK)),
        יתרה: num(get(r, balK)),
        "תנועה אחרונה": shortDate(get(r, ["last_movement", "last_date", "updated_at"])),
      })),
      "מלאי",
    );

  return (
    <>
      <ScreenHeader title="מלאי" />
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
              <div className="grid grid-cols-3 gap-2.5">
                <button onClick={() => setView("soon")} className="text-right">
                  <MetricCard label="ייגמר השבוע" value={int(soonCount)} sub="פריטים" />
                </button>
                <button onClick={() => setView("dead")} className="text-right">
                  <MetricCard label="מלאי מת" value={int((dead.data ?? []).length)} sub="פריטים" />
                </button>
                <button onClick={() => setView("all")} className="text-right">
                  <MetricCard label="שווי תקוע" value={ils(stuckValue)} sub="כל המלאי" />
                </button>
              </div>
            </Section>

            <Section title="פריטים" action={<ExportButton onClick={doExport} />}>
              <div className="relative mb-3">
                <IconSearch
                  size={16}
                  stroke={1.5}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3"
                />
                <input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="חיפוש מידה, מותג או מק״ט"
                  className="h-11 w-full rounded-[14px] border border-line bg-white pr-9 pl-3 text-[14px] outline-none focus:border-coral-400"
                />
              </div>
              {rows.length === 0 ? (
                <EmptyState text="אין פריטים שתואמים לסינון" />
              ) : (
                <div className="divide-y divide-line overflow-hidden rounded-[14px] border border-line">
                  {rows.slice(0, 150).map((r, i) => {
                    const bal = num(get(r, balK));
                    const f = fMap.get(`${str(get(r, sizeK))}|${str(get(r, brandK))}`);
                    const days = f ? num(get(f, daysK)) : 0;
                    const color =
                      bal <= 3 ? "text-coral-600" : bal <= 8 ? "text-[#8A5A0B]" : "text-ink";
                    return (
                      <div key={i} className="flex items-center gap-3 bg-white px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="tnum truncate text-[14px] text-ink" dir="ltr">
                            {str(get(r, sizeK))} {str(get(r, brandK))}
                          </div>
                          <div className="tnum truncate text-[11px] text-ink-3">
                            תנועה אחרונה{" "}
                            {shortDate(get(r, ["last_movement", "last_date", "updated_at"]))}
                            {f && num(get(f, rateK))
                              ? ` · ${num(get(f, rateK)).toFixed(1)} ליום`
                              : ""}
                          </div>
                        </div>
                        <div className="text-left">
                          <div className={`tnum text-[15.5px] ${color}`}>{int(bal)}</div>
                          <div className="text-[10.5px] text-ink-3">
                            {days > 0 ? `${int(days)} ימים` : "נדרשים עוד ימי נתונים"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

            <Section title="הצעת הזמנה לשבוע הקרוב">
              {suggestions.length === 0 ? (
                <EmptyState text="אין פריטים שצפויים להיגמר בקרוב" />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((r, i) => (
                    <span
                      key={i}
                      className="tnum rounded-full bg-coral-100 px-3 py-1.5 text-[11px] text-coral-800"
                    >
                      {str(get(r, sizeK))} {str(get(r, brandK))} · בעוד {int(num(get(r, daysK)))}{" "}
                      ימים
                    </span>
                  ))}
                </div>
              )}
            </Section>

            <Section title="פילוח לפי ספק">
              <BarList items={suppliers.slice(0, 8)} />
            </Section>
          </>
        )}
      </Page>
    </>
  );
}
