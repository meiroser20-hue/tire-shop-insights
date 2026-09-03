import type { ReactNode } from "react";
import { IconAlertCircle, IconDownload } from "@tabler/icons-react";
import { TIME_LABELS, type TimeKey } from "@/lib/data";
import { ils, pct } from "@/lib/format";

/* --------------------------------- layout -------------------------------- */

export function Section({
  title,
  action,
  children,
  first,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  first?: boolean;
}) {
  return (
    <section className={first ? "py-4" : "hairline py-5"}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-[15.5px] font-600 text-ink">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Pill({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-[12.5px] transition-colors ${
        active
          ? "bg-coral-600 text-white"
          : "border border-line bg-white/70 text-ink-2 hover:bg-coral-050"
      }`}
    >
      {children}
    </button>
  );
}

export function TimeFilter({
  value,
  onChange,
  options = ["today", "yesterday", "week", "month", "all"],
}: {
  value: TimeKey;
  onChange: (v: TimeKey) => void;
  options?: TimeKey[];
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
      {options.map((o) => (
        <Pill key={o} active={value === o} onClick={() => onChange(o)}>
          {TIME_LABELS[o]}
        </Pill>
      ))}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="inline-flex rounded-full border border-line bg-white p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors ${
            value === o.value ? "bg-coral-100 font-500 text-coral-700" : "text-ink-2"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* --------------------------------- states -------------------------------- */

export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div className={`skel ${className}`} />;
}

export function SkeletonBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={`h-12 w-full rounded-[14px]`} />
      ))}
    </div>
  );
}

export function EmptyState({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="rounded-[14px] border border-dashed border-line bg-surf px-4 py-6 text-center">
      <p className="text-[12.5px] leading-relaxed text-ink-2">{text}</p>
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="rounded-[14px] border border-line bg-white px-4 py-6 text-center">
      <IconAlertCircle className="mx-auto mb-2 text-coral-600" size={22} stroke={1.5} />
      <p className="text-[14px] text-ink">לא הצלחנו לטעון. נסה שוב</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded-full border border-coral-200 px-4 py-1.5 text-[12.5px] text-coral-700"
        >
          נסה שוב
        </button>
      )}
    </div>
  );
}

/* ---------------------------------- bits --------------------------------- */

export function Delta({ value, small }: { value: number | null; small?: boolean }) {
  if (value === null || !Number.isFinite(value)) return null;
  const up = value >= 0;
  return (
    <span
      className={`tnum inline-flex items-center gap-1 ${small ? "text-[10.5px]" : "rounded-full px-2.5 py-1 text-[12.5px]"} ${
        up ? "text-up" : "text-down"
      } ${small ? "" : up ? "bg-[#E4F4EE]" : "bg-[#FBE9E9]"}`}
    >
      {up ? "▲" : "▼"} {pct(Math.abs(value) * (up ? 1 : -1)).replace("-", "")}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  sub,
  delta,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: number | null;
}) {
  return (
    <div className="rounded-[16px] border border-line/70 bg-white/78 px-3.5 py-3">
      <div className="text-[11px] text-ink-3">{label}</div>
      <div className="tnum mt-1 text-[23px] font-500 leading-tight text-ink">{value}</div>
      <div className="mt-0.5 flex items-center gap-2 text-[10.5px] text-ink-3">
        {sub && <span className="tnum">{sub}</span>}
        <Delta value={delta ?? null} small />
      </div>
    </div>
  );
}

export function Avatar({ name, initials }: { name?: string; initials: string }) {
  return (
    <div
      title={name}
      className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-coral-400 bg-coral-050 text-[12.5px] font-500 text-coral-700"
    >
      {initials}
    </div>
  );
}

export function Bar({ value, max, color }: { value: number; max: number; color?: string }) {
  const w = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surf">
      <div
        className="h-full rounded-full"
        style={{ width: `${w}%`, background: color ?? "var(--coral-500)" }}
      />
    </div>
  );
}

export function Money({ value, className = "" }: { value: number; className?: string }) {
  return <span className={`tnum ${className}`}>{ils(value)}</span>;
}

export function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-[11px] text-ink-2 hover:bg-coral-050"
    >
      <IconDownload size={14} stroke={1.5} />
      ייצוא
    </button>
  );
}

export function Chip({ children, tone }: { children: ReactNode; tone?: "coral" | "plain" }) {
  return (
    <span
      className={`tnum inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] ${
        tone === "coral" ? "bg-coral-100 text-coral-800" : "border border-line bg-white text-ink-2"
      }`}
    >
      {children}
    </span>
  );
}

export function ColorCard({
  label,
  value,
  sub,
  bg,
  fg,
}: {
  label: string;
  value: string;
  sub?: string;
  bg: string;
  fg: string;
}) {
  return (
    <div className="rounded-[16px] px-3.5 py-3" style={{ background: bg, color: fg }}>
      <div className="text-[11px] opacity-80">{label}</div>
      <div className="tnum mt-1 text-[21px] font-500">{value}</div>
      {sub && <div className="tnum mt-0.5 text-[10.5px] opacity-70">{sub}</div>}
    </div>
  );
}
