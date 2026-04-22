"use client";

import { useEffect } from "react";
import type { Lang } from "@/lib/i18n";

/**
 * Keeps <html lang> in sync with the resolved language.
 * The root layout always renders lang="zh-CN" for the static shell;
 * if the buyer has chosen English we patch it client-side.
 */
export function LangSync({ lang }: { lang: Lang }) {
  useEffect(() => {
    const target = lang === "zh" ? "zh-CN" : "en";
    if (document.documentElement.lang !== target) {
      document.documentElement.lang = target;
    }
  }, [lang]);
  return null;
}
