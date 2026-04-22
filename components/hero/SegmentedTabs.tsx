"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type TabId = "wall" | "how" | "faq";

export function SegmentedTabs({
  panels,
}: {
  panels: Record<TabId, React.ReactNode>;
}) {
  const t = useT();
  const [active, setActive] = useState<TabId>("wall");

  const items: { id: TabId; label: string }[] = [
    { id: "wall", label: t.tabs.wall },
    { id: "how", label: t.tabs.how },
    { id: "faq", label: t.tabs.faq },
  ];

  return (
    <div className="w-full">
      <div className="relative flex w-full items-center justify-between rounded-full border border-hairline bg-paper/60 p-1 backdrop-blur-sm">
        {items.map((it) => {
          const isActive = it.id === active;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => setActive(it.id)}
              className={cn(
                "relative z-10 flex-1 rounded-full px-2 py-1.5 text-[12.5px] font-medium tracking-wide transition-colors",
                isActive ? "text-paper" : "text-ink-soft hover:text-ink"
              )}
              aria-pressed={isActive}
            >
              {isActive && (
                <span
                  className="absolute inset-0 -z-10 rounded-full bg-ink"
                  aria-hidden
                />
              )}
              {it.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 animate-float-up">
        <div role="tabpanel" key={active} className="animate-float-up">
          {panels[active]}
        </div>
      </div>
    </div>
  );
}
