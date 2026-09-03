import { useMemo, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { IconArrowRight, IconBrandWhatsapp, IconFlag, IconPhone } from "@tabler/icons-react";
import { AppShell, Page, ScreenHeader } from "@/components/AppShell";
import {
  Avatar,
  EmptyState,
  ErrorState,
  Section,
  SkeletonBlock,
  TimeFilter,
  Pill,
} from "@/components/kit";
import {
  amountOf,
  customerName,
  get,
  initials,
  num,
  str,
  type Row,
  type TimeKey,
} from "@/lib/data";
import { useView } from "@/lib/hooks";
import { usePrefs } from "@/lib/prefs";
import { ils, int, shortDate } from "@/lib/format";
import { custId, debtOf, isBusiness, lifetime, phoneOf, visitsOf } from "./customers";

export const Route = createFileRoute("/customers/$id")({
  head: () => ({
    meta: [
      { title: "כרטיס לקוח · ברכת הדרך" },
      { name: "description", content: "עסקאות, רכבים, חוב ופרטי קשר של לקוח בפנצ'ריית ברכת הדרך." },
      { property: "og:title", content: "כרטיס לקוח · ברכת הדרך" },
      { property: "og:description", content: "כל המידע על הלקוח במקום אחד." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomerCard,
});

type Tab = "sales" | "vehicles" | "debt" | "details";

function CustomerCard() {
  const { id } = useParams({ from: "/customers/$id" });
  const { vat } = usePrefs();
  const [tab, setTab] = useState<Tab>("sales");
  const [time, setTime] = useState<TimeKey>("all");

  const customers = useView("v_customers_unified", null, { limit: 3000 });
  const sales = useView("v_sales", time, { limit: 5000 });
  const vehicles = useView("v_vehicles", null, { limit: 2000 });
  const obligo = useView("customer_obligo", null, { limit: 2000 });

  const key = useMemo(() => {
    try {
      return decodeURIComponent(id);
    } catch {
      return id;
    }
  }, [id]);

  const c = useMemo(
    () => (customers.data ?? []).find((r) => custId(r) === key || customerName(r) === key),
    [customers.data, key],
  );

  const matches = (r: Row) =>
    custId(r) === key ||
    customerName(r) === (c ? customerName(c) : key) ||
    (!!c && !!phoneOf(c) && phoneOf(r) === phoneOf(c));
  const mySales = (sales.data ?? []).filter(matches);
  const myVehicles = (vehicles.data ?? []).filter(matches);
  const myObligo = (obligo.data ?? []).filter(matches);

  if (customers.isError)
    return (
      <Page>
        <div className="py-6">
          <ErrorState onRetry={() => void customers.refetch()} />
        </div>
      </Page>
    );
  if (customers.isLoading)
    return (
      <Page>
        <div className="py-6">
          <SkeletonBlock rows={5} />
        </div>
      </Page>
    );

  const name = c ? customerName(c) : id;
  const phone = c ? phoneOf(c) : "";
  const debt = c
    ? debtOf(c) ||
      myObligo.reduce((s, r) => s + num(get(r, ["open_balance", "balance", "amount"])), 0)
    : 0;

  return (
    <>
      <ScreenHeader title={name}>
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/customers"
            className="inline-flex items-center gap-1 text-[12.5px] text-coral-800"
          >
            <IconArrowRight size={15} stroke={1.5} />
            כל הלקוחות
          </Link>
          {phone && (
            <div className="flex gap-1.5">
              <a href={`tel:${phone}`} className="rounded-full bg-white/70 p-2 text-ink-2">
                <IconPhone size={16} stroke={1.5} />
              </a>
              <a
                href={`https://wa.me/972${phone.replace(/\D/g, "").replace(/^0/, "")}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-white/70 p-2 text-up"
              >
                <IconBrandWhatsapp size={16} stroke={1.5} />
              </a>
            </div>
          )}
        </div>
      </ScreenHeader>

      <Page>
        <Section first>
          <div className="flex items-center gap-3">
            <Avatar initials={initials(name)} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15.5px] text-ink">{name}</div>
              <div className="tnum truncate text-[11px] text-ink-3">
                {[
                  str(get(c ?? {}, ["tax_id", "hp", "vat_number"])),
                  phone,
                  str(get(c ?? {}, ["city", "address"])),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
            <span className="rounded-full bg-surf px-2 py-1 text-[10.5px] text-ink-3">
              {c && isBusiness(c) ? "עסקי" : "פרטי"}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-[14px] border border-line text-center">
            <Stat label="ביקורים" value={int(c ? visitsOf(c) : mySales.length)} />
            <Stat
              label="מצטבר"
              value={ils(c ? lifetime(c) : mySales.reduce((s, r) => s + amountOf(r, vat), 0))}
              border
            />
            <Stat label="חוב" value={ils(debt)} />
          </div>

          <div className="mt-4 flex gap-1.5 overflow-x-auto">
            {(
              [
                ["sales", "עסקאות"],
                ["vehicles", "רכבים"],
                ["debt", "חוב"],
                ["details", "פרטים"],
              ] as Array<[Tab, string]>
            ).map(([v, l]) => (
              <Pill key={v} active={tab === v} onClick={() => setTab(v)}>
                {l}
              </Pill>
            ))}
          </div>
        </Section>

        {tab === "sales" && (
          <Section title="עסקאות">
            <div className="mb-3">
              <TimeFilter value={time} onChange={setTime} />
            </div>
            {sales.isLoading ? (
              <SkeletonBlock rows={3} />
            ) : mySales.length === 0 ? (
              <EmptyState text="אין עסקאות ללקוח בטווח שנבחר" />
            ) : (
              <div className="divide-y divide-line overflow-hidden rounded-[14px] border border-line">
                {mySales.slice(0, 100).map((r, i) => (
                  <div key={i} className="flex items-center justify-between bg-white px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-[14px] text-ink">
                        {str(get(r, ["service", "pdes", "description", "category"])) || "עסקה"}
                      </div>
                      <div className="tnum text-[11px] text-ink-3">
                        {shortDate(get(r, ["doc_date", "date", "created_at"]))}
                      </div>
                    </div>
                    <span className="tnum text-[14px] text-ink">{ils(amountOf(r, vat))}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {tab === "vehicles" && (
          <Section title="רכבים">
            {vehicles.isLoading ? (
              <SkeletonBlock rows={3} />
            ) : myVehicles.length === 0 ? (
              <EmptyState text="עוד לא נרשמו רכבים ללקוח הזה" />
            ) : (
              <div className="divide-y divide-line overflow-hidden rounded-[14px] border border-line">
                {myVehicles.map((v, i) => (
                  <div key={i} className="bg-white px-3 py-2.5">
                    <div className="tnum text-[14px] text-ink" dir="ltr">
                      {str(get(v, ["car_num", "vehicle_no", "vehicle_number", "regnum"]))}
                    </div>
                    <div className="tnum text-[11px] text-ink-3">
                      {int(num(get(v, ["treatments", "visits", "services"])))} טיפולים · אחרון{" "}
                      {shortDate(get(v, ["last_visit", "last_service", "last_date"]))} ·{" "}
                      {int(num(get(v, ["km", "mileage"])))} ק״מ
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {tab === "debt" && (
          <Section title="חוב">
            {obligo.isLoading ? (
              <SkeletonBlock rows={3} />
            ) : myObligo.length === 0 ? (
              <EmptyState text="אין חוב פתוח ללקוח הזה" />
            ) : (
              <div className="space-y-2">
                {myObligo.map((o, i) => (
                  <div
                    key={i}
                    className="flex justify-between rounded-[14px] border border-line bg-white px-3 py-2.5 text-[12.5px]"
                  >
                    <span className="text-ink-2">
                      {str(get(o, ["doc_type", "type", "description"])) || "יתרה פתוחה"} ·{" "}
                      {shortDate(get(o, ["due_date", "date", "doc_date"]))}
                    </span>
                    <span className="tnum text-ink">
                      {ils(num(get(o, ["open_balance", "balance", "amount"])))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {tab === "details" && (
          <Section title="פרטים">
            <div className="divide-y divide-line overflow-hidden rounded-[14px] border border-line">
              <Detail label="טלפון" value={phone} />
              <Detail label="כתובת" value={str(get(c ?? {}, ["address", "city"]))} />
              <Detail label="ח.פ" value={str(get(c ?? {}, ["tax_id", "hp", "vat_number"]))} />
              <Detail label="תנאי תשלום" value={str(get(c ?? {}, ["payment_terms", "terms"]))} />
            </div>
          </Section>
        )}
      </Page>
    </>
  );
}

function Stat({ label, value, border }: { label: string; value: string; border?: boolean }) {
  return (
    <div className={`bg-white px-2 py-3 ${border ? "border-x border-line" : ""}`}>
      <div className="text-[10.5px] text-ink-3">{label}</div>
      <div className="tnum mt-0.5 text-[15.5px] text-ink">{value}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between bg-white px-3 py-2.5 text-[12.5px]">
      <span className="text-ink-3">{label}</span>
      {value ? (
        <span className="tnum text-ink">{value}</span>
      ) : (
        <span className="inline-flex items-center gap-1 text-down">
          <IconFlag size={13} stroke={1.5} />
          חסר
        </span>
      )}
    </div>
  );
}
