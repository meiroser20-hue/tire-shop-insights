import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  IconHome,
  IconReceipt,
  IconUsers,
  IconBoxSeam,
  IconCoins,
  IconFileAnalytics,
  IconBell,
  IconDots,
  IconLogout,
  IconSettings,
  IconDatabaseCog,
  IconDotsCircleHorizontal,
} from "@tabler/icons-react";
import { useAuth } from "@/lib/auth";
import { longDate } from "@/lib/format";

const NAV = [
  { to: "/", label: "בית", Icon: IconHome },
  { to: "/sales", label: "מכירות", Icon: IconReceipt },
  { to: "/customers", label: "לקוחות", Icon: IconUsers },
  { to: "/inventory", label: "מלאי", Icon: IconBoxSeam },
  { to: "/finance", label: "כספים", Icon: IconCoins },
  { to: "/reports", label: "דוחות", Icon: IconFileAnalytics },
] as const;

function useActive() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (to: string) => (to === "/" ? path === "/" : path.startsWith(to));
}

/* ------------------------------ auth wrapper ----------------------------- */

export function AppShell({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-white p-5">
        <div className="skel h-24 w-full rounded-[16px]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white lg:flex lg:flex-row-reverse">
      <DesktopNav />
      <main className="min-w-0 flex-1 pb-28 lg:pb-10">{children}</main>
      <MobileNav />
    </div>
  );
}

/* --------------------------------- header -------------------------------- */

export function ScreenHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  const { profile, signOut } = useAuth();
  const [menu, setMenu] = useState(false);

  return (
    <div className="head-grad px-4 pb-6 pt-5 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] text-coral-800/70">{longDate()}</div>
            <h1 className="mt-0.5 text-[23px] font-600 text-coral-900">{title}</h1>
            {subtitle && <div className="mt-1 text-[11px] text-coral-800/70">{subtitle}</div>}
          </div>
          <div className="relative flex items-center gap-1">
            <button className="rounded-full p-2 text-coral-900/70 hover:bg-white/50" aria-label="התראות">
              <IconBell size={19} stroke={1.5} />
            </button>
            <button
              onClick={() => setMenu((m) => !m)}
              className="rounded-full p-2 text-coral-900/70 hover:bg-white/50"
              aria-label="תפריט"
            >
              <IconDots size={19} stroke={1.5} />
            </button>
            {menu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setMenu(false)} />
                <div className="absolute left-0 top-11 z-30 w-48 overflow-hidden rounded-[14px] border border-line bg-white py-1 shadow-[0_10px_30px_rgba(0,0,0,.18)]">
                  <div className="px-3 py-2 text-[11px] text-ink-3">{profile?.full_name}</div>
                  <MenuItem Icon={IconSettings} label="הגדרות" />
                  <MenuItem Icon={IconDatabaseCog} label="איכות נתונים" />
                  <MenuItem Icon={IconLogout} label="התנתקות" onClick={() => void signOut()} />
                </div>
              </>
            )}
          </div>
        </div>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}

function MenuItem({
  Icon,
  label,
  onClick,
}: {
  Icon: typeof IconBell;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-2.5 text-right text-[12.5px] text-ink hover:bg-coral-050"
    >
      <Icon size={16} stroke={1.5} className="text-ink-3" />
      {label}
    </button>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-6xl px-4 lg:px-8">{children}</div>;
}

/* ----------------------------------- nav --------------------------------- */

function DesktopNav() {
  const isActive = useActive();
  const { profile, signOut } = useAuth();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-l border-line bg-white px-3 py-5 lg:flex">
      <div className="mb-6 flex items-center gap-2.5 px-2">
        <div className="coral-grad flex size-9 items-center justify-center rounded-full text-[12.5px] font-600 text-white">
          ב״ד
        </div>
        <div className="text-[14px] font-600 text-ink">ברכת הדרך</div>
      </div>
      <nav className="flex-1 space-y-1">
        {NAV.map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-[14px] transition-colors ${
              isActive(to) ? "bg-coral-100 font-500 text-coral-700" : "text-ink-2 hover:bg-surf"
            }`}
          >
            <Icon size={18} stroke={1.5} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="hairline mt-3 pt-3">
        <div className="px-3 text-[12.5px] text-ink">{profile?.full_name ?? "משתמש"}</div>
        <button
          onClick={() => void signOut()}
          className="mt-1 flex w-full items-center gap-2 rounded-[14px] px-3 py-2 text-[12.5px] text-ink-2 hover:bg-surf"
        >
          <IconLogout size={16} stroke={1.5} />
          התנתקות
        </button>
      </div>
    </aside>
  );
}

function MobileNav() {
  const isActive = useActive();
  const [more, setMore] = useState(false);
  const main = NAV.slice(0, 5);
  const rest = NAV.slice(5);

  return (
    <>
      {more && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={() => setMore(false)} />
          <div className="fixed inset-x-3 bottom-24 z-50 rounded-[16px] bg-white p-2 shadow-[0_10px_30px_rgba(0,0,0,.28)] lg:hidden">
            {rest.map(({ to, label, Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMore(false)}
                className="flex items-center gap-2.5 rounded-[14px] px-3 py-3 text-[14px] text-ink"
              >
                <Icon size={18} stroke={1.5} />
                {label}
              </Link>
            ))}
          </div>
        </>
      )}
      <nav className="fixed inset-x-0 bottom-4 z-50 flex justify-center lg:hidden">
        <div
          className="flex items-center gap-0.5 rounded-full p-1.5"
          style={{ background: "rgba(23,24,28,.9)", backdropFilter: "blur(18px)" }}
        >
          {main.map(({ to, label, Icon }) => {
            const active = isActive(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex h-11 flex-col items-center justify-center gap-0.5 rounded-full transition-all ${
                  active ? "w-[74px] bg-white text-coral-600" : "w-[52px] text-white/70"
                }`}
              >
                <Icon size={18} stroke={1.5} />
                <span className="text-[8.5px]">{label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMore((m) => !m)}
            className={`flex h-11 w-[52px] flex-col items-center justify-center gap-0.5 rounded-full ${
              rest.some((r) => isActive(r.to)) ? "bg-white text-coral-600" : "text-white/70"
            }`}
          >
            <IconDotsCircleHorizontal size={18} stroke={1.5} />
            <span className="text-[8.5px]">עוד</span>
          </button>
        </div>
      </nav>
    </>
  );
}
