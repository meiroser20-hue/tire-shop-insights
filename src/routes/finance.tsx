import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Page, ScreenHeader } from "@/components/AppShell";
import {
  ColorCard,
  EmptyState,
  ErrorState,
  Section,
  SkeletonBlock,
} from "@/components/kit";
import { BarList } from "./sales";
import { customerName, get, groupSum, num, str } from "@/lib/data";
import { useView } from "@/lib/hooks";
import { useCanSeeProfit } from "@/lib/auth";
import { ils, int, shortDate } from "@/lib/format";

export const Route = createFileRoute("/finance")({
  head: () => ({
    meta: [
      { title: "כספים · ברכת הדרך" },
      { name: "description", content: "חייבים, גיול חובות, תשלומים לספקים, תזרים וחשבוניות שטרם הופקו." },
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

const balK = ["open_balance", "balance", "amount", "debt"];

function Finance() {
  const canSeeProfit = useCanSeeProfit();
  const obligo = useView("customer_obligo", null, { limit: 3000 });
  const purchases = useView("purchase_invoices", null, { limit: 3000 });
  const docs = useView("delivery_docs", null, { limit: 3000 });

  const rows = obligo.data ?? [];
  const totalDebt = rows.reduce((s, r) => s + num(get(r, balK)), 0);

  const aging = useMemo(() => {
    const buckets = { "30": 0, "60": 0, "90": 0, "90+": 0 };
    for (const r of rows) {
      const due = get(r, ["due_date", "date", "doc_date"]);
      const amount = num(get(r, balK));
      const days = due ? Math.floor((Date.now() - new Date(str(due)).getTime()) / 86400000) : 0;
      if (days <= 30) buckets["30"] += amount;
      else if (days <= 60) buckets["60"] += amount;
      else if (days <= 90) buckets["90"] += amount;
      else buckets["90+"] += amount;
    }
    return buckets;
  }, [rows]);

  const supplierDebt = (purchases.data ?? []).reduce(
    (s, r) => s + num(get(r, ["open_balance", "balance", "amount", "total"])),
    0,
  );

  const notInvoiced = (docs.data ?? []).filter(
    (r) => str(get(r, ["invoiced", "is_invoiced"])).toUpperCase() === "N",
  );

  const bySupplier = useMemo(
    () =>
      groupSum(
        purchases.data ?? [],
        (r) => str(get(r, ["supplier", "vendor", "supplier_name"])) || "ספק לא מזוהה",
        (r) => num(get(r, ["amount", "total", "amount_net"])),
      ),
    [purchases.data],
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
              <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                <ColorCard label="עד 30 יום" value={ils(aging["30"])} bg="var(--teal-bg)" fg="var(--teal-fg)" />
                <ColorCard label="30–60" value={ils(aging["60"])} bg="var(--blue-bg)" fg="var(--blue-fg)" />
                <ColorCard label="60–90" value={ils(aging["90"])} bg="var(--amber-bg)" fg="var(--amber-fg)" />
                <ColorCard label="90+" value={ils(aging["90+"])} bg="#FBE9E9" fg="var(--down)" />
              </div>
              <p className="tnum mt-3 text-[12.5px] text-ink-2">סה״כ פתוח: {ils(totalDebt)}</p>
            </Section>

            <Section title="חייבים מובילים">
              {rows.length === 0 ? (
                <EmptyState text="אין חובות פתוחים כרגע" />
              ) : (
                <div className="divide-y divide-line overflow-hidden rounded-[14px] border border-line">
                  {[...rows]
                    .sort((a, b) => num(get(b, balK)) - num(get(a, balK)))
                    .slice(0, 15)
                    .map((r, i) => (
                      <div key={i} className="flex items-center justify-between bg-white px-3 py-2.5 text-[14px]">
                        <span className="truncate text-ink">{customerName(r)}</span>
                        <span className="tnum text-ink-2">{ils(num(get(r, balK)))}</span>
                      </div>
                    ))}
                </div>
              )}
            </Section>

            {canSeeProfit && (
              <>
                <Section title="אני חייב לספקים">
                  <ColorCard label="יתרה לספקים" value={ils(supplierDebt)} bg="var(--violet-bg)" fg="var(--violet-fg)" />
                  <div className="mt-3">
                    <BarList items={bySupplier.slice(0, 8)} />
                  </div>
                </Section>

                <Section title="תזרים צפוי">
                  <div className="grid grid-cols-2 gap-2.5">
                    <ColorCard label="כניסות צפויות" value={ils(totalDebt)} bg="var(--teal-bg)" fg="var(--teal-fg)" />
                    <ColorCard label="יציאות צפויות" value={ils(supplierDebt)} bg="var(--violet-bg)" fg="var(--violet-fg)" />
                  </div>
                  <p className="tnum mt-3 text-[12.5px] text-ink-2">
                    מאזן צפוי: {ils(totalDebt - supplierDebt)}
                  </p>
                </Section>

                <Section title="רווחיות">
                  <EmptyState text="אין עדיין נתוני עלות. רווחיות תוצג ברגע שיוזנו חשבוניות ספק בפריוריטי" />
                </Section>
              </>
            )}

            <Section title="חשבוניות שלא הופקו">
              {notInvoiced.length === 0 ? (
                <EmptyState text="כל תעודות המשלוח חויבו. אין מה להפיק" />
              ) : (
                <div className="divide-y divide-line overflow-hidden rounded-[14px] border border-line">
                  {notInvoiced.slice(0, 50).map((r, i) => (
                    <div key={i} className="flex items-center justify-between bg-white px-3 py-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-[14px] text-ink">{customerName(r)}</div>
                        <div className="tnum text-[11px] text-ink-3">
                          תעודה {str(get(r, ["doc_no", "docno", "number", "id"]))} ·{" "}
                          {shortDate(get(r, ["doc_date", "date"]))}
                        </div>
                      </div>
                      <span className="tnum text-[14px] text-ink">
                        {ils(num(get(r, ["amount_net", "amount", "total"])))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <p className="tnum mt-2 text-[11px] text-ink-3">{int(notInvoiced.length)} תעודות ממתינות</p>
            </Section>
          </>
        )}
      </Page>
    </>
  );
}
