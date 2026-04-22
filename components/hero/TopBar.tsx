"use client";

import { Globe } from "lucide-react";
import { useT, useLang, useLangSwitcher } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function TopBar({
  trailing,
}: {
  trailing?: React.ReactNode;
}) {
  const t = useT();
  const lang = useLang();
  const { setLang, pending } = useLangSwitcher();

  return (
    <header className="flex items-center justify-between px-5 pt-5">
      <div className="flex items-baseline gap-2">
        <span className="text-han-display text-xl text-ink">
          {t.brand.name}
        </span>
        <span className="text-eyebrow text-ink-mute">{t.brand.sub}</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={pending}
          onClick={() => setLang(lang === "zh" ? "en" : "zh")}
          className={cn(
            "group inline-flex items-center gap-1.5 rounded-full border border-hairline px-2.5 py-1 text-[11px] tracking-wider text-ink-soft transition-colors hover:border-ink hover:text-ink",
            pending && "opacity-60"
          )}
          aria-label={t.langSwitch.label}
        >
          <Globe className="h-3 w-3" />
          <span className={cn("font-medium", lang === "zh" ? "" : "opacity-50")}>
            {t.langSwitch.zh}
          </span>
          <span className="opacity-30">·</span>
          <span className={cn("font-medium", lang === "en" ? "" : "opacity-50")}>
            {t.langSwitch.en}
          </span>
        </button>
        {trailing}
      </div>
    </header>
  );
}
