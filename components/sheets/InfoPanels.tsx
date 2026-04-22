"use client";

import { useT } from "@/lib/i18n";

export function AboutPanel() {
  const t = useT();
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-hairline bg-paper p-5">
      <div className="text-eyebrow text-ink-mute">{t.about.title}</div>
      {t.about.paragraphs.map((p, i) => (
        <p
          key={i}
          className={
            i === 0
              ? "text-display text-[1.15rem] leading-[1.45] text-ink"
              : "text-sm leading-relaxed text-ink-soft"
          }
        >
          {p}
        </p>
      ))}
    </div>
  );
}

export function HowPanel() {
  const t = useT();
  return (
    <div className="flex flex-col gap-3">
      <div className="text-eyebrow px-1 text-ink-mute">{t.how.title}</div>
      <ol className="flex flex-col gap-3">
        {t.how.steps.map((step, i) => (
          <li
            key={i}
            className="flex gap-4 rounded-lg border border-hairline bg-paper p-4"
          >
            <div className="text-display tabular text-2xl text-gold">
              0{i + 1}
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="text-display text-base text-ink">
                {step.title}
              </h4>
              <p className="text-sm leading-relaxed text-ink-soft">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function FaqPanel() {
  const t = useT();
  return (
    <div className="flex flex-col gap-2">
      <div className="text-eyebrow px-1 text-ink-mute">{t.faq.title}</div>
      <ul className="flex flex-col">
        {t.faq.items.map((it, i) => (
          <li
            key={i}
            className="border-b border-hairline py-3 last:border-0"
          >
            <details className="group">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-[15px] text-ink">
                <span>{it.q}</span>
                <span className="mt-1 text-ink-mute transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {it.a}
              </p>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
