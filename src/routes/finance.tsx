import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Page, ScreenHeader } from "@/components/AppShell";
import {
  AnimatedMoney,
  AreaCompare,
  EmptyState,
  ErrorState,
  RankedList,
  Section,
  SkeletonBlock,
  StackedBar,
  Timeline,
} from "@/components/kit";
import { customerName, get, num, str } from "@/lib/data";
import { useView } from "@/lib/hooks";
import { useCanSeeProfit } from "@/lib/auth";
import { ils, int, shortDate } from "@/lib/format";

export const Route = createFileRoute("/finance")({
  head: () => ({
    meta: [
      { title: "כספים · ברכת הדרך" },
      {
        name: "description",
        content: "חייבים, גיול חובות, תשלומים לספקים, תזרים וחשבוניות שטרם הופקו.",
      },
      { property: "og:title", content: "כספים · ברכת הדרך" },
      { property: "og:description", content: "גבייה, ספקים ותזרים בפנצ'ריית ברכת הדרך." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <Finance />
    </AppShell>
  ),
});

const balK = ["open_debt", "open_balance", "balance", "debt"];
const AGING = [
  { key: "30", label: "עד 30", col: "days_1_30", color: "#F7B8C5" },
  { key: "60", label: "30–60", col: "days_31_60", color: "#EE7189" },
  { key: "90", label: "60–90", col: "days_61_90", color: "#C42B4E" },
  { key: "90+", label: "90+", col: "over_90", color: "#6B1730" },
] as const;

function daysSince(v: unknown) {
  const d = v ? new Date(str(v)) : null;
  if (!d || Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.round((Date.now() - d.getTime()) / 86400000));
}

function Finance() {
  const canSeeProfit = useCanSeeProfit();
  const obligo = useView("customer_obligo", null, { limit: 3000 });
  const purchases = useView("purchase_invoices", null, { limit: 3000 });
  const docs = useView("delivery_docs", null, { limit: 3000 });
  const sales = useView("v_sales", null, { limit: 5000 });

  const nameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of sales.data ?? []) {
      const code = str(r["cust_name"]);
      const des = str(r["cust_des"]);
      if (code && des) m.set(code, des);
    }
    return m;
  }, [sales.data]);
  const nameOf = (r: Record<string, unknown>) =>
    nameMap.get(str(r["cust_name"])) || customerName(r);

  const rows = useMemo(() => {
    const all = obligo.data ?? [];
    if (!all.length) return all;
    const latest = all
      .map((r) => str(r["snapshot_date"]))
      .sort()
      .slice(-1)[0];
    const scoped = latest ? all.filter((r) => str(r["snapshot_date"]) === latest) : all;
    return scoped.filter((r) => num(get(r, balK)) !== 0);
  }, [obligo.data]);
  const totalDebt = rows.reduce((s, r) => s + num(get(r, balK)), 0);

  const agingSegments = useMemo(
    () =>
      AGING.map((a) => ({
        key: a.key,
        label: a.label,
        color: a.color,
        value: rows.reduce((s, r) => s + num(get(r, [a.col])), 0),
      })),
    [rows],
  );

  const topDebtors = useMemo(
    () =>
      [...rows]
        .sort((a, b) => num(get(b, balK)) - num(get(a, balK)))
        .slice(0, 3)
        .map((r, i) => ({
          key: `${i}`,
          label: nameOf(r),
          value: num(get(r, balK)),
          valueText: ils(num(get(r, balK))),
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, nameMap],
  );

  const supplierRows = purchases.data ?? [];
  const supplierDebt = supplierRows.reduce(
    (s, r) => s + num(get(r, ["open_balance", "balance", "amount", "total"])),
    0,
  );

  const supplierTimeline = useMemo(
    () =>
      [...supplierRows]
        .sort(
          (a, b) =>
            new Date(str(get(a, ["due_date", "doc_date", "date"]))).getTime() -
            new Date(str(get(b, ["due_date", "doc_date", "date"]))).getTime(),
        )
        .slice(0, 8)
        .map((r, i) => ({
          key: `${i}`,
          time: shortDate(get(r, ["due_date", "doc_date", "date"])),
          title: str(get(r, ["supplier", "vendor", "supplier_name"])) || "ספק",
          value: ils(num(get(r, ["open_balance", "balance", "amount", "total"]))),
        })),
    [supplierRows],
  );

  const notInvoiced = (docs.data ?? []).filter((r) => {
    const v = get(r, ["invoiced", "is_invoiced"]);
    return v === false || str(v).toUpperCase() === "N" || str(v).toUpperCase() === "FALSE";
  });

  /* naive 30 day projection: debts flow in, supplier debt flows out */
  const flowIn = useMemo(
    () => Array.from({ length: 30 }, (_, i) => (totalDebt / 30) * (i + 1)),
    [totalDebt],
  );
  const flowOut = useMemo(
    () => Array.from({ length: 30 }, (_, i) => (supplierDebt / 30) * (i + 1)),
    [supplierDebt],
  );

  return (
    <>
      <ScreenHeader title="כספים" />
      <Page>
        {obligo.isError ? (
          <div className="py-6">
            <ErrorState onRetry={() => void obligo.refetch()} />
          </div>
        ) : obligo.isLoading ? (
          <div className="py-6">
            <SkeletonBlock rows={5} />
          </div>
        ) : (
          <>
            <Section first title="חייבים לי">
              <div className="tnum text-[40px] font-500 leading-none text-red-900">
                <AnimatedMoney value={totalDebt} />
              </div>
              <p className="mt-1 text-[11px] text-ink-3">סה״כ פתוח מול {int(rows.length)} לקוחות</p>
              <div className="mt-4">
                <StackedBar segments={[...agingSegments]} />
              </div>
              {topDebtors.length > 0 && (
                <div className="mt-5">
                  <RankedList items={topDebtors} />
                </div>
              )}
            </Section>

            {canSeeProfit && (
              <>
                <Section title="אני חייב">
                  {supplierTimeline.length === 0 ? (
                    <EmptyState text="אין חשבוניות ספק פתוחות כרגע" />
                  ) : (
                    <Timeline items={supplierTimeline} />
                  )}
                </Section>

                <Section title="תזרים 30 יום">
                  <AreaCompare
                    a={flowIn}
                    b={flowOut}
                    labelA="כניסות צפויות"
                    labelB="יציאות צפויות"
                  />
                  <p className="tnum mt-2 text-[12.5px] text-ink-2">
                    מאזן צפוי: {ils(totalDebt - supplierDebt)}
                  </p>
                </Section>
              </>
            )}

            <Section title="חשבוניות שלא הופקו">
              {notInvoiced.length === 0 ? (
                <EmptyState text="כל תעודות המשלוח חויבו. אין מה להפיק" />
              ) : (
                <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                  {notInvoiced.slice(0, 24).map((r, i) => {
                    const d = daysSince(get(r, ["doc_date", "date"]));
                    return (
                      <div
                        key={i}
                        className="tap rounded-[16px] border border-line bg-white px-3.5 py-3"
                      >
                        <div className="truncate text-[12.5px] text-ink">{nameOf(r)}</div>
                        <div className="tnum mt-1.5 text-[19px] font-500 text-ink">
                          {ils(num(get(r, ["sum_after", "total", "amount"])))}
                        </div>
                        <div
                          className="tnum mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px]"
                          style={{
                            background: d > 14 ? "#FCE8ED" : "var(--surf)",
                            color: d > 14 ? "var(--red-700)" : "var(--ink-3)",
                          }}
                        >
                          לפני {int(d)} ימים
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="tnum mt-3 text-[11px] text-ink-3">
                {int(notInvoiced.length)} תעודות ממתינות
              </p>
            </Section>

            {canSeeProfit && (
              <Section title="רווחיות">
                <EmptyState text="אין עדיין נתוני עלות. מפת החום של מידה מול מרווח תוצג ברגע שיוזנו חשבוניות ספק בפריוריטי" />
              </Section>
            )}
          </>
        )}
      </Page>
    </>
  );
}
