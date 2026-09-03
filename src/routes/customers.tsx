import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { get, num, str, type Row } from "@/lib/data";

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
      <Outlet />
    </AppShell>
  ),
});

export const custId = (c: Row) =>
  str(get(c, ["customer_key", "customer_id", "custname", "cust_id", "id"]));
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
