import { useEffect, useRef, useState } from "react";

const EASE = (t: number) => 1 - Math.pow(1 - t, 4);

/** Counts from the previous value to the new one with requestAnimationFrame. */
export function useCountUp(value: number, duration = 480) {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!Number.isFinite(value)) {
      setDisplay(value);
      return;
    }
    let start: number | undefined;
    const a = from.current;
    const b = value;
    if (a === b) return;

    const tick = (now: number) => {
      start ??= now;
      const t = Math.min(1, (now - start) / duration);
      const v = a + (b - a) * EASE(t);
      setDisplay(v);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else {
        from.current = b;
        setDisplay(b);
      }
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      from.current = b;
    };
  }, [value, duration]);

  return display;
}

/** Rotates through strings with a timed fade. */
export function useRotating(items: string[], intervalMs = 4000) {
  const [i, setI] = useState(0);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setI((p) => (p + 1) % items.length);
        setVisible(true);
      }, 500);
    }, intervalMs);
    return () => clearInterval(id);
  }, [items.length, intervalMs]);
  return { text: items[i] ?? "", visible };
}
