import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  IconPhone,
  IconBrandWhatsapp,
  IconSearch,
  IconChevronLeft,
  IconUsers,
  IconRepeat,
  IconAlertTriangle,
  IconUserOff,
  IconTrophy,
  IconBuildingCommunity,
  IconX,
} from "@tabler/icons-react";
import { Page, ScreenHeader } from "@/components/AppShell";
import {
  Avatar,
  EmptyState,
  ErrorState,
  Pill,
  Section,
  Segmented,
  SkeletonBlock,
} from "@/components/kit";
import { customerName, get, initials, str, type Row } from "@/lib/data";
import { useView } from "@/lib/hooks";
import { ils, int, shortDate, visits } from "@/lib/format";
import { custId, debtOf, isBusiness, lifetime, phoneOf, visitsOf } from "./customers";

export const Route = createFileRoute("/customers/")({
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
  component: Customers,
});

const lastVisitOf = (c: Row) =>
  get(c, ["last_visit", "last_seen", "last_doc_date", "last_visit_date", "last_activity"]);
const isDormant = (c: Row) => get(c, ["is_dormant"]) === true;

/** ימים מאז תאריך. מחזיר null כשאין תאריך — לא ממציאים מספר. */
function daysSince(v: unknown): number | null {
  if (!v) return null;
  const d = new Date(str(v));
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.round((Date.now() - d.getTime()) / 86400000));
}

type Filter = "all" | "business" | "private" | "repeat" | "debt" | "lost";
const FILTERS: Array<{ v: Filter; l: string }> = [
  { v: "all", l: "הכל" },
  { v: "business", l: "עסקי" },
  { v: "private", l: "פרטי" },
  { v: "repeat", l: "חוזר" },
  { v: "debt", l: "חייב" },
  { v: "lost", l: "לא חזר" },
];

type SortKey = "revenue" | "visits" | "recent";

function Customers() {
  const q = useView("v_customers_unified", null, { limit: 3000 });
  const [term, setTerm] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<SortKey>("revenue");
  const [shown, setShown] = useState(40);
  const [topBy, setTopBy] = useState<"revenue" | "visits" | "tenure">("revenue");

  const all = q.data ?? [];

  const stats = useMemo(
    () => ({
      total: all.length,
      repeat: all.filter((c) => visitsOf(c) >= 2).length,
      debt: all.filter((c) => debtOf(c) > 0).length,
      debtSum: all.reduce((s, c) => s + Math.max(0, debtOf(c)), 0),
      lost: all.filter(isDormant).length,
    }),
    [all],
  );

  const rows = useMemo(() => {
    let list = all;
    if (filter === "business") list = list.filter(isBusiness);
    if (filter === "private") list = list.filter((c) => !isBusiness(c));
    if (filter === "repeat") list = list.filter((c) => visitsOf(c) >= 2);
    if (filter === "debt") list = list.filter((c) => debtOf(c) > 0);
    if (filter === "lost") list = list.filter(isDormant);
    const t = term.trim();
    if (t)
      list = list.filter((c) =>
        [customerName(c), phoneOf(c), str(get(c, ["vehicle_no", "vehicles_list"]))]
          .join(" ")
          .includes(t),
      );
    const key =
      sort === "visits"
        ? visitsOf
        : sort === "recent"
          ? (c: Row) => -(daysSince(lastVisitOf(c)) ?? 99999)
          : lifetime;
    return [...list].sort((a, b) => key(b) - key(a));
  }, [all, filter, term, sort]);

  const top = useMemo(() => {
    const key =
      topBy === "revenue"
        ? lifetime
        : topBy === "visits"
          ? visitsOf
          : (c: Row) => -new Date(str(get(c, ["first_visit", "since", "created_at"]))).getTime();
    return [...all].sort((a, b) => key(b) - key(a)).slice(0, 8);
  }, [all, topBy]);

  const lost = useMemo(
    () =>
      all
        .filter((c) => isDormant(c) && visitsOf(c) >= 2)
        .sort((a, b) => lifetime(b) - lifetime(a))
        .slice(0, 12),
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

  const pick = (f: Filter) => {
    setFilter((cur) => (cur === f ? "all" : f));
    setShown(40);
  };

  return (
    <>
      <ScreenHeader title="לקוחות" subtitle={q.isLoading ? undefined : `${int(all.length)} רשומות`}>
        <div className="relative">
          <IconSearch
            size={17}
            stroke={1.5}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3"
          />
          <input
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              setShown(40);
            }}
            placeholder="חיפוש שם, טלפון או מספר רכב"
            className="h-12 w-full rounded-full border border-line bg-white/80 pl-10 pr-11 text-[14px] outline-none transition-colors focus:border-red-400"
          />
          {term && (
            <button
              onClick={() => setTerm("")}
              aria-label="נקה חיפוש"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
            >
              <IconX size={16} stroke={1.5} />
            </button>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <StatTile
            label="סה״כ לקוחות"
            value={int(stats.total)}
            Icon={IconUsers}
            tone="var(--ink-2)"
            active={filter === "all"}
            onClick={() => pick("all")}
          />
          <StatTile
            label="חוזרים"
            value={int(stats.repeat)}
            Icon={IconRepeat}
            tone="var(--up)"
            active={filter === "repeat"}
            onClick={() => pick("repeat")}
          />
          <StatTile
            label="חייבים"
            value={int(stats.debt)}
            sub={stats.debtSum > 0 ? ils(stats.debtSum) : undefined}
            Icon={IconAlertTriangle}
            tone="var(--red-600)"
            active={filter === "debt"}
            onClick={() => pick("debt")}
          />
          <StatTile
            label="לא חזרו"
            value={int(stats.lost)}
            Icon={IconUserOff}
            tone="var(--v-commercial)"
            active={filter === "lost"}
            onClick={() => pick("lost")}
          />
        </div>
      </ScreenHeader>

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
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
                  {FILTERS.map((f) => (
                    <Pill
                      key={f.v}
                      active={filter === f.v}
                      onClick={() => {
                        setFilter(f.v);
                        setShown(40);
                      }}
                    >
                      {f.l}
                    </Pill>
                  ))}
                </div>
              </div>

              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="tnum text-[11px] text-ink-3">{int(rows.length)} תוצאות</span>
                <Segmented
                  value={sort}
                  onChange={setSort}
                  options={[
                    { value: "revenue", label: "הכנסה" },
                    { value: "visits", label: "ביקורים" },
                    { value: "recent", label: "אחרון" },
                  ]}
                />
              </div>

              {rows.length === 0 ? (
                <EmptyState text="לא נמצאו לקוחות שתואמים לחיפוש" />
              ) : (
                <>
                  <div>
                    {rows.slice(0, shown).map((c, i) => (
                      <CustomerRow key={`${custId(c)}-${i}`} c={c} />
                    ))}
                  </div>
                  {rows.length > shown && (
                    <div className="mt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setShown((n) => n + 40)}
                        className="tap rounded-full border border-line bg-white px-4 py-1.5 text-[12px] text-ink-2 hover:bg-red-050"
                      >
                        טען עוד · נותרו {int(rows.length - shown)}
                      </button>
                    </div>
                  )}
                </>
              )}
            </Section>

            {top.length > 0 && (
              <Section
                title="לקוחות מובילים"
                icon={IconTrophy}
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
                <Podium items={top.slice(0, 3)} by={topBy} />
                {top.length > 3 && (
                  <div className="mt-5">
                    {top.slice(3).map((c, i) => (
                      <TopRow key={`${custId(c)}-${i}`} c={c} rank={i + 4} by={topBy} />
                    ))}
                  </div>
                )}
              </Section>
            )}

            <Section title="לקוחות שנעלמו" icon={IconUserOff}>
              {lost.length === 0 ? (
                <EmptyState text="כל הלקוחות החוזרים ביקרו לאחרונה" />
              ) : (
                <div className="space-y-2.5">
                  {lost.map((c, i) => (
                    <LostRow key={`${custId(c)}-${i}`} c={c} />
                  ))}
                </div>
              )}
            </Section>

            {hierarchy.length > 0 && (
              <Section title="קבוצות וענפים" icon={IconBuildingCommunity}>
                <div className="space-y-2.5">
                  {hierarchy.map(([parent, children]) => (
                    <GroupCard key={parent} parent={parent} children={children} />
                  ))}
                </div>
              </Section>
            )}
          </>
        )}
      </Page>
    </>
  );
}

/* -------------------------------- pieces -------------------------------- */

function StatTile({
  label,
  value,
  sub,
  Icon,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: string;
  sub?: string | undefined;
  Icon: (p: { size?: number; stroke?: number; className?: string }) => React.ReactNode;
  tone: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap relative overflow-hidden rounded-[16px] px-3.5 py-3 text-right transition-shadow"
      style={{
        background: active ? `color-mix(in oklab, ${tone} 9%, #ffffff)` : "rgba(255,255,255,.72)",
        border: `1px solid ${active ? `color-mix(in oklab, ${tone} 30%, #ffffff)` : "rgba(255,255,255,.7)"}`,
        boxShadow: active ? `0 6px 18px color-mix(in oklab, ${tone} 14%, transparent)` : "none",
        backdropFilter: "blur(12px)",
      }}
    >
      <span
        className="pointer-events-none absolute -left-1 bottom-0 opacity-[.08]"
        style={{ color: tone }}
      >
        <Icon size={52} stroke={1.5} />
      </span>
      <div className="text-[11px] text-ink-3">{label}</div>
      <div className="tnum mt-0.5 text-[21px] font-500 leading-tight" style={{ color: tone }}>
        {value}
      </div>
      {sub && <div className="tnum mt-0.5 text-[10.5px] text-ink-3">{sub}</div>}
    </button>
  );
}

function CustomerRow({ c }: { c: Row }) {
  const debt = debtOf(c);
  const days = daysSince(lastVisitOf(c));
  const dormant = isDormant(c);
  const tone = debt > 0 ? "var(--red-600)" : dormant ? "var(--v-commercial)" : "var(--v-tractor)";

  return (
    <Link
      to="/customers/$id"
      params={{ id: custId(c) || customerName(c) }}
      className="hairline tap flex items-center gap-3 py-3"
    >
      <Avatar initials={initials(customerName(c))} name={customerName(c)} tone={tone} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[14px] text-ink">{customerName(c)}</span>
          {isBusiness(c) && (
            <span className="shrink-0 rounded-full bg-[#F4F4F6] px-1.5 py-0.5 text-[9.5px] text-ink-3">
              עסקי
            </span>
          )}
          {dormant && (
            <span
              className="shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px]"
              style={{ background: "rgba(180,115,75,.12)", color: "var(--v-commercial)" }}
            >
              לא חזר
            </span>
          )}
        </div>
        <div className="tnum mt-0.5 text-[11px] text-ink-3">
          {visits(visitsOf(c))}
          {days !== null && ` · לפני ${int(days)} ימים`}
        </div>
      </div>
      <div className="shrink-0 text-left">
        <div className="tnum text-[14px] text-ink">{ils(lifetime(c))}</div>
        {debt > 0 && <div className="tnum text-[10.5px] text-red-600">חוב {ils(debt)}</div>}
      </div>
      <IconChevronLeft size={16} stroke={1.5} className="shrink-0 text-ink-3" />
    </Link>
  );
}

const MEDALS = ["#C9A227", "#A8AEB8", "#B5793F"];

type By = "revenue" | "visits" | "tenure";

const topValue = (c: Row, by: By) => (by === "visits" ? int(visitsOf(c)) : ils(lifetime(c)));

function topSub(c: Row, by: By) {
  const since = get(c, ["first_visit", "since", "created_at"]);
  if (by === "visits") return "ביקורים";
  if (by === "tenure" && since) return `מאז ${shortDate(since)}`;
  return visits(visitsOf(c));
}

/** שלושת הראשונים על פודיום — הראשון במרכז וגבוה יותר. */
function Podium({ items, by }: { items: Row[]; by: By }) {
  if (!items.length) return null;
  const [first, second, third] = items;
  /* ב-RTL הילד הראשון יושב בימין, ולכן הסדר הוא: שני · ראשון · שלישי */
  const order: Array<{ c: Row | undefined; rank: number }> = [
    { c: second, rank: 2 },
    { c: first, rank: 1 },
    { c: third, rank: 3 },
  ];

  return (
    <div className="grid grid-cols-3 items-end gap-2.5">
      {order.map(({ c, rank }) =>
        c ? (
          <PodiumCard key={`${custId(c)}-${rank}`} c={c} rank={rank} by={by} />
        ) : (
          <span key={rank} />
        ),
      )}
    </div>
  );
}

function PodiumCard({ c, rank, by }: { c: Row; rank: number; by: By }) {
  const medal = MEDALS[rank - 1] ?? "var(--ink-3)";
  const lead = rank === 1;
  return (
    <Link
      to="/customers/$id"
      params={{ id: custId(c) || customerName(c) }}
      className={`tap flex flex-col items-center rounded-[18px] px-2.5 text-center ${
        lead ? "pb-5 pt-6" : "pb-4 pt-4"
      }`}
      style={{
        background: `linear-gradient(170deg, color-mix(in srgb, ${medal} ${lead ? 20 : 13}%, #ffffff) 0%, rgba(255,255,255,.96) 72%)`,
        border: `1px solid color-mix(in srgb, ${medal} ${lead ? 34 : 24}%, #ffffff)`,
      }}
    >
      <div className="relative">
        <Avatar
          initials={initials(customerName(c))}
          name={customerName(c)}
          tone={medal}
          size={lead ? 52 : 42}
        />
        <span
          className="tnum absolute -bottom-1 left-1/2 flex size-5 -translate-x-1/2 items-center justify-center rounded-full text-[10px] font-500 text-white"
          style={{ background: medal, border: "2px solid #ffffff" }}
        >
          {rank}
        </span>
      </div>
      <div
        className={`mt-3 w-full truncate ${lead ? "text-[13.5px] font-500" : "text-[12px]"} text-ink`}
      >
        {customerName(c)}
      </div>
      <div className={`tnum mt-1 font-500 text-ink ${lead ? "text-[18px]" : "text-[15px]"}`}>
        {topValue(c, by)}
      </div>
      <div className="tnum mt-0.5 text-[10px] text-ink-3">{topSub(c, by)}</div>
    </Link>
  );
}

/** מקום רביעי ומטה — שורות רגילות מתחת לפודיום. */
function TopRow({ c, rank, by }: { c: Row; rank: number; by: By }) {
  return (
    <Link
      to="/customers/$id"
      params={{ id: custId(c) || customerName(c) }}
      className="hairline tap flex items-center gap-3 py-2.5"
    >
      <span className="tnum w-5 shrink-0 text-center text-[11px] text-ink-3">{rank}</span>
      <Avatar
        initials={initials(customerName(c))}
        name={customerName(c)}
        tone="var(--v-tractor)"
        size={32}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] text-ink">{customerName(c)}</div>
        <div className="tnum mt-0.5 text-[10.5px] text-ink-3">{topSub(c, by)}</div>
      </div>
      <span className="tnum shrink-0 text-[13.5px] text-ink">{topValue(c, by)}</span>
    </Link>
  );
}

function LostRow({ c }: { c: Row }) {
  const phone = phoneOf(c);
  const days = daysSince(lastVisitOf(c));
  const wa = `https://wa.me/972${phone.replace(/\D/g, "").replace(/^0/, "")}`;
  return (
    <div
      className="flex items-center gap-3 rounded-[16px] px-3.5 py-3"
      style={{
        background:
          "linear-gradient(150deg, rgba(201,147,43,.14) 0%, rgba(201,147,43,.05) 42%, rgba(255,255,255,.96) 100%)",
        border: "1px solid rgba(201,147,43,.16)",
      }}
    >
      <Avatar initials={initials(customerName(c))} tone="var(--v-commercial)" />
      <div className="min-w-0 flex-1">
        <Link
          to="/customers/$id"
          params={{ id: custId(c) || customerName(c) }}
          className="block truncate text-[14px] text-ink"
        >
          {customerName(c)}
        </Link>
        <div className="tnum mt-0.5 text-[11px] text-ink-3">
          {days !== null ? `לא חזר ${int(days)} ימים · ` : ""}
          {visits(visitsOf(c))} · {ils(lifetime(c))}
        </div>
      </div>
      {phone && (
        <div className="flex shrink-0 gap-1.5">
          <a
            href={`tel:${phone}`}
            aria-label="חיוג"
            className="tap rounded-full border border-line bg-white p-2 text-ink-2"
          >
            <IconPhone size={16} stroke={1.5} />
          </a>
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            aria-label="וואטסאפ"
            className="tap rounded-full border border-line bg-white p-2 text-up"
          >
            <IconBrandWhatsapp size={16} stroke={1.5} />
          </a>
        </div>
      )}
    </div>
  );
}

function GroupCard({ parent, children }: { parent: string; children: Row[] }) {
  const [open, setOpen] = useState(false);
  const total = children.reduce((s, c) => s + lifetime(c), 0);
  const shown = open ? children : children.slice(0, 3);
  return (
    <div className="overflow-hidden rounded-[16px] border border-line bg-white">
      <div className="flex items-center justify-between gap-3 px-3.5 py-3">
        <div className="min-w-0">
          <div className="truncate text-[14px] font-500 text-ink">{parent}</div>
          <div className="tnum mt-0.5 text-[10.5px] text-ink-3">{children.length} ענפים</div>
        </div>
        <span className="tnum shrink-0 text-[15px] font-500 text-ink">{ils(total)}</span>
      </div>
      <div className="px-3.5 pb-1">
        {shown.map((child, index) => (
          <Link
            key={`${custId(child)}-${index}`}
            to="/customers/$id"
            params={{ id: custId(child) || customerName(child) }}
            className="hairline flex items-center justify-between gap-3 py-2.5 text-[12.5px] text-ink-2 hover:text-red-700"
          >
            <span className="truncate">{customerName(child)}</span>
            <span className="tnum shrink-0 text-ink-3">{ils(lifetime(child))}</span>
          </Link>
        ))}
      </div>
      {children.length > 3 && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full border-t border-line py-2.5 text-[11.5px] text-ink-3 hover:bg-red-050"
        >
          {open ? "הצג פחות" : `הצג את כל ${children.length} הענפים`}
        </button>
      )}
    </div>
  );
}
