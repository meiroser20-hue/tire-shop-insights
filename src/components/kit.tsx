import {
  createElement,
  isValidElement,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from "react";
import { IconAlertCircle, IconCrown, IconDownload } from "@tabler/icons-react";
import { TIME_LABELS, type TimeKey } from "@/lib/data";
import { ils, int, pct } from "@/lib/format";
import { useCountUp } from "@/lib/motion";

const RED_GRAD = "linear-gradient(135deg,#6B1730 0%,#C42B4E 55%,#E03E5F 100%)";

/* --------------------------------- layout -------------------------------- */

/** אייקון סקשן — מקבל קומפוננטה (`icon={IconClock}`) או אלמנט (`icon={<IconClock />}`). */
type SectionIconProps = { size?: number; stroke?: number; className?: string };
type SectionIcon = ComponentType<SectionIconProps> | ReactNode;

/**
 * אייקוני tabler הם forwardRef — אובייקט עם $$typeof, לא פונקציה.
 * לכן הבדיקה חייבת להיות "האם זה אלמנט מוכן", ולא "האם זה פונקציה".
 */
function sectionGlyph(icon: SectionIcon): ReactNode {
  if (icon === null || icon === undefined || icon === false) return null;

  const body = isValidElement(icon)
    ? icon
    : typeof icon === "function" ||
        (typeof icon === "object" && icon !== null && "$$typeof" in icon)
      ? createElement(icon as ComponentType<SectionIconProps>, { size: 17, stroke: 1.6 })
      : icon;

  return <span className="flex shrink-0 items-center text-[#C2C5CD]">{body}</span>;
}

export function Section({
  title,
  icon,
  action,
  children,
  first,
}: {
  title?: string;
  icon?: SectionIcon;
  action?: ReactNode;
  children: ReactNode;
  first?: boolean;
}) {
  const glyph = sectionGlyph(icon);
  return (
    <section className={first ? "pb-2 pt-4" : "py-7"}>
      {(title || action) && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          {title && (
            <h2 className="flex shrink-0 items-center gap-2.5 whitespace-nowrap text-[15.5px] font-600 text-ink">
              {glyph}
              {title}
            </h2>
          )}
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
      className={`shrink-0 rounded-full px-3 py-1 text-[10.5px] transition-[transform,background-color,color] duration-[180ms] active:scale-[.96] ${
        active ? "text-white" : "bg-[#F4F4F6] text-ink-2 hover:bg-red-050"
      }`}
      style={active ? { background: RED_GRAD } : undefined}
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
    <div className="inline-flex shrink-0 rounded-full bg-[#F4F4F7] p-[3px]">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`rounded-full px-2.5 py-1 text-[10.5px] transition-all duration-200 ${
            value === o
              ? "red-grad font-500 text-white shadow-[0_1px_3px_rgba(107,23,48,.22)]"
              : "text-ink-3 hover:text-ink-2"
          }`}
        >
          {TIME_LABELS[o]}
        </button>
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
          className={`rounded-full px-3.5 py-1.5 text-[12.5px] transition-[transform,background-color] duration-[180ms] active:scale-[.96] ${
            value === o.value ? "red-grad font-500 text-white" : "text-ink-2"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------- numbers -------------------------------- */

export function AnimatedMoney({ value, className = "" }: { value: number; className?: string }) {
  const v = useCountUp(value);
  return <span className={`tnum ${className}`}>{ils(v)}</span>;
}

export function AnimatedInt({ value, className = "" }: { value: number; className?: string }) {
  const v = useCountUp(value);
  return <span className={`tnum ${className}`}>{int(Math.round(v))}</span>;
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
      <IconAlertCircle className="mx-auto mb-2 text-red-600" size={22} stroke={1.5} />
      <p className="text-[14px] text-ink">לא הצלחנו לטעון. נסה שוב</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="tap mt-3 rounded-full border border-red-200 px-4 py-1.5 text-[12.5px] text-red-700"
        >
          נסה שוב
        </button>
      )}
    </div>
  );
}

/* ---------------------------------- bits --------------------------------- */

export function Delta({ value, small }: { value: number | null; small?: boolean }) {
  const animated = useCountUp(value ?? 0);
  if (value === null || !Number.isFinite(value)) return null;
  const up = value >= 0;
  return (
    <span
      className={`tnum inline-flex items-center gap-1 ${small ? "text-[10.5px]" : "rounded-full px-2.5 py-1 text-[12.5px]"} ${
        up ? "text-up" : "text-down"
      } ${small ? "" : up ? "bg-[#E4F4EE]" : "bg-[#FBE9E9]"}`}
    >
      {up ? "▲" : "▼"} {pct(Math.abs(animated) * (up ? 1 : -1)).replace("-", "")}
    </span>
  );
}

/** Clean metric tile. */
export function GlassMetric({
  label,
  value,
  sub,
  delta,
  color = "var(--red-600)",
  Icon,
  numericValue,
  format = "money",
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: number | null;
  color?: string;
  Icon?: (p: { size?: number; stroke?: number; className?: string }) => ReactNode;
  numericValue?: number;
  format?: "money" | "int";
}) {
  const animated = useCountUp(numericValue ?? 0);
  void color;
  void Icon;
  return (
    <div className="tap rounded-[16px] border border-line bg-white px-3.5 py-3">
      <div className="text-[10.5px] text-ink-3">{label}</div>
      <div className="tnum mt-1.5 text-[23px] font-500 leading-none text-ink">
        {numericValue === undefined ? value : format === "money" ? ils(animated) : int(animated)}
      </div>
      <div className="mt-2 flex items-center gap-2 text-[10.5px] text-ink-3">
        {sub && <span className="tnum">{sub}</span>}
        <Delta value={delta ?? null} small />
      </div>
    </div>
  );
}

export function MetricCard(p: {
  label: string;
  value: string;
  sub?: string;
  delta?: number | null;
  numericValue?: number;
  format?: "money" | "int";
}) {
  return <GlassMetric {...p} />;
}

export function Avatar({
  name,
  initials,
  tone,
  size = 36,
}: {
  name?: string;
  initials: string;
  /** צבע העיגול — משמש כדי להבדיל מצב לקוח (חייב / לא חזר / תקין). */
  tone?: string | undefined;
  size?: number;
}) {
  const c = tone ?? "var(--red-600)";
  return (
    <div
      title={name}
      className="flex shrink-0 items-center justify-center rounded-full font-500"
      style={{
        width: size,
        height: size,
        fontSize: size <= 32 ? 11 : 12.5,
        color: c,
        background: `color-mix(in srgb, ${c} 10%, #ffffff)`,
        border: `1.5px solid color-mix(in srgb, ${c} 32%, #ffffff)`,
      }}
    >
      {initials}
    </div>
  );
}

export function Bar({
  value,
  max,
  color,
  thin,
}: {
  value: number;
  max: number;
  color?: string | undefined;
  thin?: boolean;
}) {
  const w = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  const base = color ?? "var(--red-600)";
  return (
    <div className={`w-full overflow-hidden rounded-full bg-[#F4F4F7] ${thin ? "h-[5px]" : "h-2"}`}>
      <div
        title={ils(value)}
        className="h-full rounded-full transition-[width] duration-[400ms] ease-[cubic-bezier(.22,1,.36,1)]"
        style={{
          width: `${w}%`,
          background: `linear-gradient(90deg, ${base} 0%, color-mix(in srgb, ${base} 55%, white) 100%)`,
        }}
      />
    </div>
  );
}

export function Money({ value, className = "" }: { value: number; className?: string }) {
  return <span className={`tnum ${className}`}>{ils(value)}</span>;
}

/** Vehicle number rendered like a license plate. */
export function Plate({ children }: { children: ReactNode }) {
  return <span className="plate tnum">{children}</span>;
}

export function ReturningTag({ times }: { times: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E4F4EE] px-2 py-0.5 text-[10px] text-up">
      <span className="dot-pulse size-1.5 rounded-full bg-up" />
      חוזר ×{times}
    </span>
  );
}

export function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="tap inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-[11px] text-ink-2 hover:bg-red-050"
    >
      <IconDownload size={14} stroke={1.5} />
      ייצוא
    </button>
  );
}

export function Chip({
  children,
  tone,
  style,
}: {
  children: ReactNode;
  tone?: "coral" | "plain";
  style?: CSSProperties;
}) {
  return (
    <span
      className={`tnum inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] ${
        tone === "coral" ? "bg-red-100 text-red-800" : "border border-line bg-white text-ink-2"
      }`}
      style={style}
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
  className = "",
  numericValue,
}: {
  label: string;
  value: string;
  sub?: string | undefined;
  /** rgb triplet, e.g. "62,142,114" */
  bg: string;
  fg: string;
  className?: string;
  numericValue?: number | undefined;
}) {
  const animated = useCountUp(numericValue ?? 0);
  const grad = bg.includes("gradient")
    ? bg
    : `radial-gradient(110% 90% at 100% 0%, rgba(${bg},.19) 0%, rgba(${bg},.06) 42%, rgba(255,255,255,0) 78%), #ffffff`;
  return (
    <div
      className={`tap rounded-[18px] px-4 py-4 ${className}`}
      style={{ background: grad, color: fg }}
    >
      <div className="text-[11px] opacity-85">{label}</div>
      <div className="tnum mt-1.5 text-[22px] font-500 leading-none">
        {numericValue === undefined ? value : ils(animated)}
      </div>
      {sub && <div className="tnum mt-1.5 text-[10.5px] opacity-70">{sub}</div>}
    </div>
  );
}

/* ------------------------------ data displays ----------------------------- */

/** Tiny 7-point sparkline. */
export function Sparkline({
  points,
  color = "var(--red-600)",
  height = 42,
}: {
  points: number[];
  color?: string;
  height?: number;
}) {
  if (points.length < 2) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const w = 100;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = height - ((p - min) / span) * (height - 6) - 3;
    return `${x},${y}`;
  });
  const last = coords[coords.length - 1]?.split(",") ?? ["0", "0"];
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="h-11 w-full">
      <title>{`מגמה: ${points.map((point) => ils(point)).join(" · ")}`}</title>
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={Number(last[0])} cy={Number(last[1])} r={2.2} fill={color} />
    </svg>
  );
}

/** Vertical columns with hover tooltip and dimming. */
export function ColumnChart({
  data,
  labelOf,
  valueFmt,
  subFmt,
}: {
  data: Array<[string | number, number]>;
  labelOf?: (k: string | number) => string;
  valueFmt?: (v: number) => string;
  subFmt?: (k: string | number, v: number) => string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d[1]));
  const peakIdx = data.reduce((bi, d, i) => (d[1] > (data[bi]?.[1] ?? 0) ? i : bi), 0);
  const shown = active ?? peakIdx;

  /* מצביע או אצבע לרוחב הגרף — בוחר את העמודה שמתחת */
  const pick = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    const rel = (r.right - clientX) / r.width; /* RTL: העמודה הראשונה בימין */
    setActive(Math.min(data.length - 1, Math.max(0, Math.floor(rel * data.length))));
  };

  return (
    <>
      <div
        ref={trackRef}
        className="relative flex h-[150px] cursor-pointer touch-pan-y items-end gap-1.5 select-none"
        onPointerDown={(e) => pick(e.clientX)}
        onPointerMove={(e) => pick(e.clientX)}
        onPointerLeave={() => setActive(null)}
        onPointerCancel={() => setActive(null)}
      >
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
          <span className="border-t border-dashed border-[#F1F1F4]" />
          <span className="border-t border-dashed border-[#F1F1F4]" />
          <span className="border-t border-dashed border-[#F1F1F4]" />
          <span className="border-t border-dashed border-[#F1F1F4]" />
        </div>
        {data.map(([k, v], i) => {
          const ratio = max ? v / max : 0;
          const on = i === shown;
          return (
            <div key={String(k)} className="relative flex h-full flex-1 items-end">
              <div
                className="w-full rounded-t-[7px] transition-[height,opacity] duration-[400ms] ease-[cubic-bezier(.22,1,.36,1)]"
                style={{
                  height: `${Math.max(5, ratio * 100)}%`,
                  background: on
                    ? "linear-gradient(180deg,var(--red-600) 0%,rgba(196,43,78,.26) 100%)"
                    : "linear-gradient(180deg,rgba(196,43,78,.32) 0%,rgba(196,43,78,.07) 100%)",
                  opacity: active !== null && !on ? 0.35 : 1,
                }}
              />
              {active === i && (
                <div className="pointer-events-none absolute bottom-[calc(100%+10px)] right-1/2 z-20 translate-x-1/2 whitespace-nowrap rounded-[10px] bg-[rgba(22,23,27,.94)] px-3 py-1.5">
                  <span className="tnum block text-[12px] font-500 text-white">
                    {valueFmt?.(v) ?? int(v)}
                  </span>
                  <span className="text-[10.5px] text-white/65">
                    {subFmt?.(k, v) ?? (labelOf ? labelOf(k) : String(k))}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5">
        {data.map(([k], i) => (
          <span
            key={String(k)}
            className={`tnum flex-1 text-center text-[9.5px] ${
              i === shown ? "font-500 text-red-600" : "text-ink-3"
            }`}
          >
            {labelOf ? labelOf(k) : String(k)}
          </span>
        ))}
      </div>
    </>
  );
}

/** Thin donut ring with an amount in the middle. */
export function Donut({
  slices,
  center,
  sub,
  numericCenter,
}: {
  slices: Array<{ key: string; value: number; color: string }>;
  center: string;
  sub?: string;
  numericCenter?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const animatedCenter = useCountUp(numericCenter ?? 0);
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (!total) return null;
  const R = 41;
  const C = 2 * Math.PI * R;
  const picked = active !== null ? slices[active] : null;
  let acc = 0;
  return (
    <div className="donut-turn relative size-[120px] shrink-0">
      <svg viewBox="0 0 100 100" className="size-full">
        <title>
          {slices
            .map((slice) => `${slice.key}: ${Math.round((slice.value / total) * 100)}%`)
            .join(" · ")}
        </title>
        <circle cx="50" cy="50" r={R} fill="none" stroke="#F3F3F6" strokeWidth="10" />
        {slices.map((sl, i) => {
          const len = (sl.value / total) * C;
          const off = -(acc / total) * C;
          acc += sl.value;
          return (
            <circle
              key={sl.key}
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke={sl.color}
              strokeWidth={active === i ? 13 : 10}
              strokeLinecap="round"
              strokeDasharray={`${Math.max(0, len - 4)} ${C}`}
              strokeDashoffset={off}
              opacity={active === null || active === i ? 1 : 0.28}
              transform="rotate(-90 50 50)"
              className="cursor-pointer"
              onPointerDown={() => setActive((v) => (v === i ? null : i))}
              style={{
                transition:
                  "stroke-dasharray 400ms cubic-bezier(.22,1,.36,1), stroke-width 200ms ease, opacity 200ms ease",
              }}
            />
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
        {picked ? (
          <>
            <span className="max-w-full truncate text-[10.5px] text-ink-3">{picked.key}</span>
            <span className="tnum text-[14px] font-500 text-ink">{ils(picked.value)}</span>
            <span className="tnum text-[10px] text-ink-3">
              {Math.round((picked.value / total) * 100)}%
            </span>
          </>
        ) : (
          <>
            <span className="tnum text-[14px] font-500 text-ink">
              {numericCenter === undefined ? center : ils(animatedCenter)}
            </span>
            {sub && <span className="tnum text-[10px] text-ink-3">{sub}</span>}
          </>
        )}
      </div>
    </div>
  );
}

/** Leaderboard: highlighted first place, compact ranked rows below. */
export function RankedList({
  items,
}: {
  items: Array<{ key: string; label: ReactNode; value: number; valueText: string; sub?: string }>;
}) {
  if (!items.length) return null;
  const [top, ...rest] = items;
  const rankTone = ["", "bg-[#F0F0F3] text-[#75767C]", "bg-[#F6EADF] text-[#8A5A31]"];
  return (
    <div>
      {top && <LeaderTop item={top} />}
      {rest.map((it, i) => (
        <LeaderRow key={it.key} item={it} rank={i + 2} tone={rankTone[i + 1] ?? ""} />
      ))}
    </div>
  );
}

function LeaderTop({
  item,
}: {
  item: { key: string; label: ReactNode; value: number; valueText: string; sub?: string };
}) {
  const animated = useCountUp(item.value);
  return (
    <div
      className="mb-2.5 flex items-center gap-3.5 rounded-[16px] px-4 py-3.5"
      style={{
        background:
          "linear-gradient(135deg,rgba(196,43,78,.07) 0%,rgba(196,43,78,.015) 70%,#ffffff 100%)",
        border: "1px solid rgba(196,43,78,.10)",
      }}
    >
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-[19px]"
        style={{ background: "linear-gradient(135deg,#F3D98C,#D9AE43)", color: "#6B4E08" }}
      >
        <IconCrown size={19} stroke={1.6} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[16px] font-500 text-ink">{item.label}</div>
        {item.sub && <div className="tnum mt-0.5 text-[11px] text-ink-3">{item.sub}</div>}
      </div>
      <span className="tnum shrink-0 text-[22px] font-500 text-red-700">{ils(animated)}</span>
    </div>
  );
}

function LeaderRow({
  item,
  rank,
  tone,
}: {
  item: { key: string; label: ReactNode; value: number; valueText: string; sub?: string };
  rank: number;
  tone: string;
}) {
  const animated = useCountUp(item.value);
  return (
    <div className="flex items-center gap-3 border-t border-line px-1 py-2.5">
      <span
        className={`tnum flex size-[22px] shrink-0 items-center justify-center rounded-[7px] text-[11px] ${
          tone || "bg-surf text-ink-3"
        }`}
      >
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] text-ink">{item.label}</div>
        {item.sub && <div className="tnum text-[10.5px] text-ink-3">{item.sub}</div>}
      </div>
      <span className="tnum shrink-0 text-[14.5px] font-500 text-ink">{ils(animated)}</span>
    </div>
  );
}

/** Chips sized by relative volume. */
export function VolumeChips({
  items,
}: {
  items: Array<{ key: string; value: number; text: string }>;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((s) => {
        const r = s.value / max;
        return (
          <span
            key={s.key}
            className="tnum inline-flex items-center gap-1.5 rounded-full"
            style={{
              fontSize: `${10.5 + r * 4.5}px`,
              padding: `${4 + r * 4}px ${10 + r * 6}px`,
              background: `rgba(196,43,78,${0.06 + r * 0.16})`,
              color: r > 0.55 ? "var(--red-800)" : "var(--ink-2)",
            }}
          >
            {s.text}
          </span>
        );
      })}
    </div>
  );
}

/** Vertical timeline with a rail and dots. */
export function Timeline({
  items,
}: {
  items: Array<{
    key: string;
    time: string;
    title: ReactNode;
    sub?: ReactNode;
    value?: string;
    numericValue?: number;
  }>;
}) {
  return (
    <div className="relative pr-4">
      <span className="absolute bottom-2 right-[5px] top-2 w-px bg-line" />
      <div className="space-y-4">
        {items.map((it) => (
          <TimelineItem key={it.key} item={it} />
        ))}
      </div>
    </div>
  );
}

function TimelineItem({
  item,
}: {
  item: {
    key: string;
    time: string;
    title: ReactNode;
    sub?: ReactNode;
    value?: string;
    numericValue?: number;
  };
}) {
  const animated = useCountUp(item.numericValue ?? 0);
  return (
    <div className="relative">
      <span className="absolute -right-4 top-1.5 size-[11px] rounded-full border-2 border-white bg-red-500" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="tnum text-[10.5px] text-ink-3">{item.time}</div>
          <div className="mt-0.5 truncate text-[14px] text-ink">{item.title}</div>
          {item.sub && <div className="mt-0.5 text-[11px] text-ink-3">{item.sub}</div>}
        </div>
        {item.value && (
          <span className="tnum text-[14px] text-ink">
            {item.numericValue === undefined ? item.value : ils(animated)}
          </span>
        )}
      </div>
    </div>
  );
}

/** Half-circle gauge for a single alert value. */
export function Gauge({
  value,
  max,
  label,
  valueText,
  color = "var(--red-600)",
}: {
  value: number;
  max: number;
  label: string;
  valueText: string;
  color?: string;
}) {
  const ratio = max > 0 ? Math.min(1, value / max) : 0;
  const animatedValue = useCountUp(value);
  const r = 34;
  const c = Math.PI * r;
  return (
    <div className="tap flex flex-col items-center rounded-[16px] border border-line bg-white px-3 py-3">
      <svg viewBox="0 0 80 46" className="w-[92px]">
        <path
          d={`M 6 40 A ${r} ${r} 0 0 1 74 40`}
          fill="none"
          stroke="var(--surf)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d={`M 6 40 A ${r} ${r} 0 0 1 74 40`}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${c}`}
          strokeDashoffset={c * (1 - ratio)}
          style={{ transition: "stroke-dashoffset 400ms cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div className="tnum -mt-2 text-[19px] font-500 text-ink">
        {valueText === int(value) ? int(animatedValue) : valueText}
      </div>
      <div className="mt-0.5 text-center text-[11px] text-ink-3">{label}</div>
    </div>
  );
}

/** Quote-style insight block. */
export function Quote({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-[14px] py-3 pl-3.5 pr-4"
      style={{ background: "var(--red-050)", borderRight: "3px solid var(--red-500)" }}
    >
      <p className="text-[12.5px] leading-relaxed text-red-900">{children}</p>
    </div>
  );
}

/** Horizontal stacked bar (e.g. debt aging). */
export function StackedBar({
  segments,
  height = 14,
}: {
  segments: Array<{ key: string; value: number; color: string; label: string }>;
  height?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  return (
    <div>
      <div
        className="flex w-full overflow-hidden rounded-full bg-surf"
        style={{ height }}
        dir="rtl"
      >
        {total > 0 &&
          segments.map((s) => (
            <div
              key={s.key}
              className="h-full transition-[width] duration-[400ms] ease-[cubic-bezier(.22,1,.36,1)]"
              style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
            />
          ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-[11px] text-ink-2">
            <span className="size-2 rounded-full" style={{ background: s.color }} />
            {s.label}
            <span className="tnum text-ink-3">{ils(s.value)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Area chart comparing two series. */
export function AreaCompare({
  a,
  b,
  labelA,
  labelB,
}: {
  a: number[];
  b: number[];
  labelA: string;
  labelB: string;
}) {
  const n = Math.max(a.length, b.length);
  if (n < 2) return null;
  const max = Math.max(...a, ...b, 1);
  const h = 90;
  const path = (arr: number[]) =>
    arr.map((v, i) => `${(i / (n - 1)) * 100},${h - (v / max) * (h - 8) - 4}`).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 100 ${h}`} preserveAspectRatio="none" className="h-[110px] w-full">
        <polygon points={`0,${h} ${path(a)} 100,${h}`} fill="rgba(15,110,86,.14)" />
        <polyline
          points={path(a)}
          fill="none"
          stroke="var(--teal-fg)"
          strokeWidth={1.6}
          vectorEffect="non-scaling-stroke"
        />
        <polygon points={`0,${h} ${path(b)} 100,${h}`} fill="rgba(196,43,78,.12)" />
        <polyline
          points={path(b)}
          fill="none"
          stroke="var(--red-600)"
          strokeWidth={1.6}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-1 flex gap-4 text-[11px] text-ink-2">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[var(--teal-fg)]" />
          {labelA}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[var(--red-600)]" />
          {labelB}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------- soft cards ------------------------------- */

/** כרטיס בגוון עדין שנמוג לרקע הלבן במקום לשבת על בלוק צבע. */
export function SoftCard({
  label,
  value,
  sub,
  tint,
  fg,
  className = "",
  numericValue,
}: {
  label: string;
  value: string;
  sub?: string | undefined;
  /** שלשת rgb, למשל "46, 125, 79" — או var() שמחזיק אותה */
  tint: string;
  fg: string;
  className?: string;
  numericValue?: number | undefined;
}) {
  const animated = useCountUp(numericValue ?? 0);
  return (
    <div
      className={`tap relative overflow-hidden rounded-[18px] px-3.5 py-3 ${className}`}
      style={{
        background: `linear-gradient(148deg, rgba(${tint},.20) 0%, rgba(${tint},.085) 42%, rgba(255,255,255,.96) 100%)`,
        border: `1px solid rgba(${tint},.16)`,
        boxShadow: `0 6px 18px rgba(${tint},.07)`,
      }}
    >
      <div className="text-[11px]" style={{ color: fg, opacity: 0.72 }}>
        {label}
      </div>
      <div className="tnum mt-1 text-[21px] font-500" style={{ color: fg }}>
        {numericValue === undefined ? value : ils(animated)}
      </div>
      {sub && (
        <div className="tnum mt-0.5 text-[10.5px]" style={{ color: fg, opacity: 0.6 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

/** פאנל בגוון עדין לעטיפת גוף סקשן שלם. */
export function SoftPanel({
  tint,
  children,
  className = "",
}: {
  tint: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[18px] px-4 py-4 ${className}`}
      style={{
        background: `linear-gradient(150deg, rgba(${tint},.16) 0%, rgba(${tint},.06) 40%, rgba(255,255,255,.96) 100%)`,
        border: `1px solid rgba(${tint},.14)`,
      }}
    >
      {children}
    </div>
  );
}

/* -------------------------------- brands --------------------------------- */

const BRAND_TONES = [
  "var(--s-tire)",
  "var(--v-private)",
  "var(--v-commercial)",
  "var(--v-tractor)",
  "var(--s-punc)",
  "var(--v-balloon)",
];

/** אריחים עם קו תחתון שאורכו לפי הנתח — שונה מפסים ומצ'יפים. */
export function BrandGrid({
  items,
}: {
  items: Array<{ key: string; name: string; value: number; sub?: string }>;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
      {items.map((it, i) => (
        <BrandTile key={it.key} item={it} ratio={it.value / max} index={i} />
      ))}
    </div>
  );
}

function BrandTile({
  item,
  ratio,
  index,
}: {
  item: { name: string; value: number; sub?: string };
  ratio: number;
  index: number;
}) {
  const animated = useCountUp(item.value);
  const tone = BRAND_TONES[index % BRAND_TONES.length] ?? "var(--red-500)";
  return (
    <div className="tap relative overflow-hidden rounded-[16px] border border-line bg-white px-3.5 pb-3.5 pt-3">
      <div className="truncate text-[12.5px] text-ink-2">{item.name}</div>
      <div className="tnum mt-1 text-[19px] font-500 text-ink">{ils(animated)}</div>
      {item.sub && <div className="tnum mt-0.5 text-[10.5px] text-ink-3">{item.sub}</div>}
      <span
        className="absolute inset-x-0 bottom-0 h-[3px] origin-right transition-transform duration-[500ms] ease-[cubic-bezier(.22,1,.36,1)]"
        style={{
          background: `linear-gradient(to left, ${tone} 0%, color-mix(in srgb, ${tone} 35%, #ffffff) 100%)`,
          transform: `scaleX(${Math.max(0.06, ratio)})`,
        }}
      />
    </div>
  );
}
