import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { IconPhone, IconBrandWhatsapp, IconSearch } from "@tabler/icons-react";
import { AppShell, Page, ScreenHeader } from "@/components/AppShell";
import {
  Avatar,
  EmptyState,
  ErrorState,
  Pill,
  Section,
  Segmented,
  SkeletonBlock,
} from "@/components/kit";
import { customerName, get, initials, num, str, type Row } from "@/lib/data";
import { useView } from "@/lib/hooks";
import { ils, int, visits } from "@/lib/format";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "לקוחות · ברכת הדרך" },
      {
        name: "description",
        content: "רשימת הלקוחות, מובילים, חייבים ולקוחות שלא חזרו בפנצ'ריית ברכת הדרך.",
      },
      { property: "og:title", content: "לקוחות · ברכת הדרך" },
      { property: "og:description", content: "ניהול לקוחות, חובות ורכבים בפנצ'ריית ברכת הדרך." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <Customers />
    </AppShell>
  ),
});

export const custId = (c: Row) => str(get(c, ["customer_id", "custname", "cust_id", "id"]));
export const lifetime = (c: Row) => num(get(c, ["lifetime_net", "lifetime", "total_net"]));
export const visitsOf = (c: Row) => num(get(c, ["visits", "visit_count"]));
export const debtOf = (c: Row) => num(get(c, ["debt", "open_balance", "balance", "obligo"]));
export const phoneOf = (c: Row) => str(get(c, ["phone", "mobile", "phonef", "tel"]));
export const isBusiness = (c: Row) => {
  const t = str(get(c, ["customer_type", "type", "kind"]));
  return (
    t.includes("עסק") ||
    t.toLowerCase().includes("business") ||
    !!str(get(c, ["tax_id", "vat_number", "hp"]))
  );
};

type Filter = "all" | "business" | "private" | "repeat" | "debt" | "lost";
const FILTERS: Array<{ v: Filter; l: string }> = [
  { v: "all", l: "הכל" },
  { v: "business", l: "עסקי" },
  { v: "private", l: "פרטי" },
  { v: "repeat", l: "חוזר" },
  { v: "debt", l: "חייב" },
  { v: "lost", l: "לא חזר" },
];

function Customers() {
  const q = useView("v_customers_unified", null, { limit: 3000 });
  const [term, setTerm] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [topBy, setTopBy] = useState<"revenue" | "visits" | "tenure">("revenue");

  const all = q.data ?? [];

  const rows = useMemo(() => {
    let list = all;
    if (filter === "business") list = list.filter(isBusiness);
    if (filter === "private") list = list.filter((c) => !isBusiness(c));
    if (filter === "repeat") list = list.filter((c) => visitsOf(c) >= 2);
    if (filter === "debt") list = list.filter((c) => debtOf(c) > 0);
    if (filter === "lost") list = list.filter((c) => get(c, ["is_dormant"]) === true);
    const t = term.trim();
    if (t)
      list = list.filter((c) =>
        [customerName(c), phoneOf(c), str(get(c, ["vehicle_no", "vehicles_list"]))]
          .join(" ")
          .includes(t),
      );
    return [...list].sort((a, b) => lifetime(b) - lifetime(a));
  }, [all, filter, term]);

  const top = useMemo(() => {
    const key =
      topBy === "revenue"
        ? lifetime
        : topBy === "visits"
          ? visitsOf
          : (c: Row) => -new Date(str(get(c, ["first_visit", "since", "created_at"]))).getTime();
    return [...all].sort((a, b) => key(b) - key(a)).slice(0, 5);
  }, [all, topBy]);

  const lost = useMemo(
    () => all.filter((c) => get(c, ["is_dormant"]) === true && visitsOf(c) >= 2).slice(0, 20),
    [all],
  );
  const hierarchy = useMemo(() => {
    const parentOf = (c: Row) =>
      str(
        get(c, ["parent_customer", "parent_name", "group_name", "chain_name", "parent_cust_name"]),
      );
    const groups = new Map<string, Row[]>();
    for (const customer of all) {
      const parent = parentOf(customer);
      if (!parent) continue;
      groups.set(parent, [...(groups.get(parent) ?? []), customer]);
    }
    return [...groups.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 12);
  }, [all]);

  return (
    <>
      <ScreenHeader title="לקוחות" />
      <Page>
        {q.isError ? (
          <div className="py-6">
            <ErrorState onRetry={() => void q.refetch()} />
          </div>
        ) : q.isLoading ? (
          <div className="py-6">
            <SkeletonBlock rows={6} />
          </div>
        ) : (
          <>
            <Section first>
              <div className="relative mb-3">
                <IconSearch
                  size={16}
                  stroke={1.5}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3"
                />
                <input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="חיפוש שם, טלפון או מספר רכב"
                  className="h-11 w-full rounded-[14px] border border-line bg-white pr-9 pl-3 text-[14px] outline-none focus:border-coral-400"
                />
              </div>
              <div className="mb-3 flex gap-1.5 overflow-x-auto pb-0.5">
                {FILTERS.map((f) => (
                  <Pill key={f.v} active={filter === f.v} onClick={() => setFilter(f.v)}>
                    {f.l}
                  </Pill>
                ))}
              </div>
              {rows.length === 0 ? (
                <EmptyState text="לא נמצאו לקוחות שתואמים לחיפוש" />
              ) : (
                <div className="divide-y divide-line overflow-hidden rounded-[14px] border border-line">
                  {rows.slice(0, 200).map((c, i) => (
                    <Link
                      key={i}
                      to="/customers/$id"
                      params={{ id: custId(c) || customerName(c) }}
                      className="flex items-center gap-3 bg-white px-3 py-2.5 hover:bg-coral-050"
                    >
                      <Avatar initials={initials(customerName(c))} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[14px] text-ink">{customerName(c)}</span>
                          <span className="rounded-full bg-surf px-1.5 py-0.5 text-[10px] text-ink-3">
                            {isBusiness(c) ? "עסקי" : "פרטי"}
                          </span>
                        </div>
                        <div className="tnum text-[11px] text-ink-3">{visits(visitsOf(c))}</div>
                      </div>
                      <span className="tnum text-[14px] text-ink">{ils(lifetime(c))}</span>
                    </Link>
                  ))}
                </div>
              )}
            </Section>

            {hierarchy.length > 0 && (
              <Section title="קבוצות וענפים">
                <div className="space-y-3">
                  {hierarchy.map(([parent, children]) => (
                    <div key={parent} className="rounded-[8px] border border-line bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[14px] font-600 text-ink">{parent}</span>
                        <span className="tnum text-[11px] text-ink-3">{children.length} ענפים</span>
                      </div>
                      <div className="mt-2 border-r border-line pr-3">
                        {children.map((child, index) => (
                          <Link
                            key={`${custId(child)}-${index}`}
                            to="/customers/$id"
                            params={{ id: custId(child) || customerName(child) }}
                            className="flex min-h-9 items-center justify-between gap-3 border-b border-line/70 py-2 text-[12.5px] last:border-0 hover:text-red-700"
                          >
                            <span className="truncate">{customerName(child)}</span>
                            <span className="tnum shrink-0 text-ink-3">{ils(lifetime(child))}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            <Section
              title="לקוחות מובילים"
              action={
                <Segmented
                  value={topBy}
                  onChange={setTopBy}
                  options={[
                    { value: "revenue", label: "הכנסה" },
                    { value: "visits", label: "תדירות" },
                    { value: "tenure", label: "ותק" },
                  ]}
                />
              }
            >
              <div className="space-y-3">
                {top.map((c, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Avatar initials={initials(customerName(c))} />
                    <div className="min-w-0 flex-1 truncate text-[14px] text-ink">
                      {customerName(c)}
                    </div>
                    <span className="tnum text-[12.5px] text-ink-2">
                      {topBy === "visits" ? `${visits(visitsOf(c))}` : ils(lifetime(c))}
                    </span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="לקוחות שנעלמו">
              {lost.length === 0 ? (
                <EmptyState text="כל הלקוחות החוזרים ביקרו לאחרונה" />
              ) : (
                <div className="space-y-3">
                  {lost.map((c, i) => {
                    const phone = phoneOf(c);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <Avatar initials={initials(customerName(c))} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14px] text-ink">{customerName(c)}</div>
                          <div className="tnum text-[11px] text-ink-3">
                            {visits(visitsOf(c))} · {ils(lifetime(c))}
                          </div>
                        </div>
                        {phone && (
                          <div className="flex gap-1.5">
                            <a
                              href={`tel:${phone}`}
                              className="rounded-full border border-line p-2 text-ink-2"
                            >
                              <IconPhone size={16} stroke={1.5} />
                            </a>
                            <a
                              href={`https://wa.me/972${phone.replace(/\D/g, "").replace(/^0/, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-line p-2 text-up"
                            >
                              <IconBrandWhatsapp size={16} stroke={1.5} />
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          </>
        )}
      </Page>
    </>
  );
}
