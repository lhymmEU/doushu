"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { padSerial, TOTAL_GOAL } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function ProgressMeter({
  sold,
  goal = TOTAL_GOAL,
  className,
}: {
  sold: number;
  goal?: number;
  className?: string;
}) {
  const t = useT();
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = display;
    const to = sold;
    const dur = reduced ? 0 : 1100;
    const tick = (now: number) => {
      const p = dur === 0 ? 1 : Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sold, reduced]);

  const pct = Math.min(100, (sold / goal) * 100);
  const reached = sold >= goal;

  return (
    <div ref={ref} className={cn("w-full", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-display tabular text-[3rem] leading-none sm:text-[3.5rem] text-ink">
            {padSerial(display)}
          </span>
          <span className="text-eyebrow text-ink-mute">
            {t.progress.ofShort}
          </span>
          <span className="text-display tabular text-2xl leading-none text-ink-soft">
            {goal}
          </span>
        </div>
        <span className="text-eyebrow hidden sm:inline">
          {t.progress.sold}
        </span>
      </div>

      <div className="mt-3 h-px w-full bg-hairline" />
      <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-ivory">
        <div
          className="h-full rounded-full bg-seal transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-3 text-eyebrow text-ink-mute">
        {reached ? t.progress.success : t.progress.stretch}
      </p>
    </div>
  );
}

const QUERY = "(prefers-reduced-motion: reduce)";

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(QUERY);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(QUERY).matches,
    () => false
  );
}
