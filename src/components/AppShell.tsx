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
import { LOGO_ON_LIGHT, displayName } from "@/lib/brand";
import { longDate } from "@/lib/format";

const NAV = [
  { to: "/", label: "בית", Icon: IconHome },
  { to: "/sales", label: "מכירות", Icon: IconReceipt },
  { to: "/customers", label: "לקוחות", Icon: IconUsers },
  { to: "/inventory", label: "מלאי", Icon: IconBoxSeam },
  { to: "/finance", label: "כספים", Icon: IconCoins },
  { to: "/reports", label: "דוחות", Icon: IconFileAnalytics },
] as const;

/** הלוגו בעיגול בהיר — משמש גם בסרגל הדסקטופ וגם בכותרת המובייל. */
function LogoBadge({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: "#F1F1F4",
        border: "1px solid rgba(23,24,28,.08)",
      }}
    >
      <img
        src={LOGO_ON_LIGHT}
        alt="ברכת הדרך"
        className="size-full object-contain"
        style={{ padding: Math.round(size * 0.16) }}
      />
    </span>
  );
}

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
    <div
      className="min-h-screen bg-white lg:p-3"
      style={{
        backgroundImage:
          "radial-gradient(115% 85% at 90% 8%, #8A1636 0%, transparent 55%), linear-gradient(158deg, #43101F 0%, #5C1329 45%, #2C0A15 100%)",
        backgroundAttachment: "fixed",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
      }}
    >
      <DesktopNav />
      <main className="app-surface min-h-screen min-w-0 pb-28 lg:mr-[248px] lg:min-h-[calc(100vh-24px)] lg:overflow-hidden lg:rounded-[24px] lg:pb-10">
        {children}
      </main>
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
  const { profile, session, signOut } = useAuth();
  const [menu, setMenu] = useState(false);

  return (
    <div className="head-grad px-4 pb-6 pt-5 lg:px-8">
      <div className="mx-auto max-w-[1360px]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] text-ink-3">{longDate()}</div>
            <h1 className="mt-0.5 text-[23px] font-600 text-ink">{title}</h1>
            {subtitle && <div className="mt-1 text-[11px] text-ink-3">{subtitle}</div>}
          </div>
          <div className="relative flex items-center gap-1">
            <button className="rounded-full p-2 text-ink-2 hover:bg-white/60" aria-label="התראות">
              <IconBell size={19} stroke={1.5} />
            </button>
            <button
              onClick={() => setMenu((m) => !m)}
              className="rounded-full p-2 text-ink-2 hover:bg-white/60"
              aria-label="תפריט"
            >
              <IconDots size={19} stroke={1.5} />
            </button>
            <LogoBadge size={34} className="ms-1 lg:hidden" />
            {menu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setMenu(false)} />
                <div className="absolute left-0 top-11 z-30 w-48 overflow-hidden rounded-[14px] border border-line bg-white py-1 shadow-[0_10px_30px_rgba(0,0,0,.18)]">
                  <div className="px-3 py-2 text-[11px] text-ink-3">
                    {displayName(profile?.full_name, session?.user.email) ?? "משתמש"}
                  </div>
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
  return <div className="mx-auto max-w-[1360px] px-4 lg:px-8">{children}</div>;
}

/* ----------------------------------- nav --------------------------------- */

function DesktopNav() {
  const isActive = useActive();
  const { profile, session, signOut } = useAuth();
  return (
    <aside className="fixed bottom-3 right-3 top-3 z-40 hidden w-[236px] flex-col px-3 py-5 lg:flex">
      <div className="mb-8 flex items-center gap-3 px-2">
        <LogoBadge size={38} />
        <div>
          <div className="text-[15px] font-600 text-white">ברכת הדרך</div>
          <div className="text-[10.5px] text-white/45">ניהול חכם</div>
        </div>
      </div>

      <div className="mb-2 px-3 text-[9.5px] tracking-[.14em] text-white/35">ניווט</div>

      <nav className="flex-1 space-y-1">
        {NAV.map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            className={`flex h-[44px] items-center gap-3 rounded-[13px] px-3 text-[13.5px] transition-all duration-200 ${
              isActive(to)
                ? "bg-white/[.11] font-500 text-white"
                : "text-white/55 hover:bg-white/[.05] hover:text-white/80"
            }`}
          >
            <span
              className={`flex size-8 items-center justify-center rounded-full transition-colors ${
                isActive(to) ? "bg-white text-[#8E1B36]" : "bg-white/[.07]"
              }`}
            >
              <Icon size={16} stroke={1.6} />
            </span>
            {label}
          </Link>
        ))}
      </nav>

      <div className="mt-3 border-t border-white/10 pt-4">
        <div className="mb-2 px-3 text-[9.5px] tracking-[.14em] text-white/35">חשבון</div>
        <div className="flex items-center gap-3 px-2">
          <div className="flex size-9 items-center justify-center rounded-full bg-white/[.12] text-[11px] font-600 text-white">
            {(displayName(profile?.full_name, session?.user.email) ?? "מ").slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] text-white">
              {displayName(profile?.full_name, session?.user.email) ?? "משתמש"}
            </div>
            <button
              onClick={() => void signOut()}
              className="text-[11px] text-white/45 transition-colors hover:text-white/75"
            >
              התנתקות
            </button>
          </div>
        </div>
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
          <div
            className="fixed inset-0 z-40 bg-black/20 lg:hidden"
            onClick={() => setMore(false)}
          />
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
      <nav className="fixed bottom-[18px] left-1/2 z-50 -translate-x-1/2 lg:hidden">
        <div className="mobile-dock flex items-center gap-0.5 rounded-full p-[7px]">
          {main.map(({ to, label, Icon }) => {
            const active = isActive(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex h-11 flex-col items-center justify-center gap-0.5 rounded-full transition-all duration-[260ms] ease-[cubic-bezier(.34,1.4,.64,1)] ${
                  active ? "red-grad w-20 text-white" : "w-[52px] text-[#8E9199]"
                }`}
              >
                <Icon size={18} stroke={1.5} />
                <span className="text-[8.5px]">{label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMore((m) => !m)}
            className={`flex h-11 flex-col items-center justify-center gap-0.5 rounded-full transition-all duration-[260ms] ease-[cubic-bezier(.34,1.4,.64,1)] ${
              rest.some((r) => isActive(r.to))
                ? "red-grad w-20 text-white"
                : "w-[52px] text-[#8E9199]"
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
