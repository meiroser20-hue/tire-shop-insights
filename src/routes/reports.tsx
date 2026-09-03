import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { IconFileSpreadsheet } from "@tabler/icons-react";
import { AppShell, Page, ScreenHeader } from "@/components/AppShell";
import { EmptyState, Section } from "@/components/kit";
import { amountOf, customerName, fetchRows, get, num, str } from "@/lib/data";
import { usePrefs } from "@/lib/prefs";
import { useCanSeeProfit } from "@/lib/auth";
import { exportExcel } from "@/lib/export";
import { shortDate } from "@/lib/format";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "דוחות · ברכת הדרך" },
      {
        name: "description",
        content: "הפקת דוחות מכירות, מלאי, גבייה ולקוחות וייצוא לאקסל בעברית.",
      },
      { property: "og:title", content: "דוחות · ברכת הדרך" },
      { property: "og:description", content: "דוחות וייצוא לאקסל בפנצ'ריית ברכת הדרך." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <Reports />
    </AppShell>
  ),
});

type ReportKey = "sales" | "stock" | "collection" | "customers" | "profit";

function Reports() {
  const { vat } = usePrefs();
  const canSeeProfit = useCanSeeProfit();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [busy, setBusy] = useState<ReportKey | null>(null);
  const [msg, setMsg] = useState("");

  const run = async (key: ReportKey) => {
    setBusy(key);
    setMsg("");
    try {
      if (key === "sales") {
        const rows = await fetchRows("v_sales", { range: { from, to }, limit: 5000 });
        exportExcel(
          "דוח-מכירות",
          rows.map((r) => ({
            תאריך: shortDate(get(r, ["doc_date", "date", "created_at"])),
            לקוח: customerName(r),
            רכב: str(get(r, ["car_num", "vehicle_no", "vehicle_number", "regnum"])),
            שירות: str(get(r, ["service", "pdes", "description"])),
            סכום: amountOf(r, vat),
          })),
          "מכירות",
        );
        if (!rows.length) setMsg("אין נתונים בטווח שנבחר");
      } else if (key === "stock") {
        const rows = await fetchRows("v_stock_current", { limit: 5000 });
        exportExcel(
          "דוח-מלאי",
          rows.map((r) => ({
            מידה: str(get(r, ["size", "tire_size"])),
            מותג: str(get(r, ["brand", "manufacturer"])),
            יתרה: num(get(r, ["balance", "qty", "quantity"])),
          })),
          "מלאי",
        );
        if (!rows.length) setMsg("אין נתונים להצגה");
      } else if (key === "collection") {
        const rows = await fetchRows("customer_obligo", { limit: 5000 });
        exportExcel(
          "דוח-גבייה",
          rows.map((r) => ({
            לקוח: customerName(r),
            "יתרה פתוחה": num(get(r, ["open_balance", "balance", "amount"])),
            "לתשלום עד": shortDate(get(r, ["due_date", "date"])),
          })),
          "גבייה",
        );
        if (!rows.length) setMsg("אין חובות פתוחים");
      } else if (key === "customers") {
        const rows = await fetchRows("v_customers_unified", { limit: 5000 });
        exportExcel(
          "דוח-לקוחות",
          rows.map((r) => ({
            לקוח: customerName(r),
            ביקורים: num(get(r, ["visits", "visit_count"])),
            מצטבר: num(get(r, ["lifetime_net", "lifetime"])),
            טלפון: str(get(r, ["phone", "mobile"])),
          })),
          "לקוחות",
        );
        if (!rows.length) setMsg("אין נתוני לקוחות");
      } else {
        setMsg("אין עדיין נתוני עלות. רווחיות תוצג ברגע שיוזנו חשבוניות ספק בפריוריטי");
      }
    } catch {
      setMsg("לא הצלחנו לטעון. נסה שוב");
    }
    setBusy(null);
  };

  const items: Array<{ key: ReportKey; label: string; desc: string }> = [
    { key: "sales", label: "דוח מכירות", desc: "כל העסקאות בטווח התאריכים" },
    { key: "stock", label: "דוח מלאי", desc: "יתרות ותנועות לפי מידה ומותג" },
    { key: "collection", label: "דוח גבייה", desc: "יתרות פתוחות ומועדי תשלום" },
    { key: "customers", label: "דוח לקוחות", desc: "ביקורים והכנסה מצטברת" },
    ...(canSeeProfit
      ? [{ key: "profit" as ReportKey, label: "דוח רווחיות", desc: "מרווח לפי מידה, מותג ושירות" }]
      : []),
  ];

  return (
    <>
      <ScreenHeader title="דוחות" />
      <Page>
        <Section first title="טווח תאריכים">
          <div className="flex gap-2.5">
            <label className="flex-1">
              <span className="mb-1 block text-[11px] text-ink-3">מתאריך</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="tnum h-11 w-full rounded-[14px] border border-line bg-white px-3 text-[14px] outline-none focus:border-coral-400"
              />
            </label>
            <label className="flex-1">
              <span className="mb-1 block text-[11px] text-ink-3">עד תאריך</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="tnum h-11 w-full rounded-[14px] border border-line bg-white px-3 text-[14px] outline-none focus:border-coral-400"
              />
            </label>
          </div>
        </Section>

        <Section title="הפקת דוח">
          <div className="grid gap-2.5 lg:grid-cols-2">
            {items.map((it) => (
              <button
                key={it.key}
                onClick={() => void run(it.key)}
                disabled={busy !== null}
                className="flex items-center gap-3 rounded-[14px] border border-line bg-white px-3.5 py-3 text-right hover:bg-coral-050 disabled:opacity-60"
              >
                <IconFileSpreadsheet size={20} stroke={1.5} className="text-coral-600" />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] text-ink">{it.label}</div>
                  <div className="text-[11px] text-ink-3">{it.desc}</div>
                </div>
                <span className="text-[11px] text-coral-700">
                  {busy === it.key ? "מכין..." : "ייצוא"}
                </span>
              </button>
            ))}
          </div>
          {msg && (
            <div className="mt-3">
              <EmptyState text={msg} />
            </div>
          )}
        </Section>
      </Page>
    </>
  );
}
