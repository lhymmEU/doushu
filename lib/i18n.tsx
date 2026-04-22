"use client";

import { createContext, useContext, useTransition } from "react";
import { zh, type Copy } from "@/content/copy.zh";
import { en } from "@/content/copy.en";

export type Lang = "zh" | "en";
export type { Copy };

const dicts: Record<Lang, Copy> = { zh, en };

const LangCtx = createContext<{ lang: Lang; t: Copy } | null>(null);

export function LangProvider({
  lang,
  children,
}: {
  lang: Lang;
  children: React.ReactNode;
}) {
  return (
    <LangCtx.Provider value={{ lang, t: dicts[lang] }}>
      {children}
    </LangCtx.Provider>
  );
}

export function useT() {
  const ctx = useContext(LangCtx);
  if (!ctx) throw new Error("useT must be used inside <LangProvider>");
  return ctx.t;
}

export function useLang() {
  const ctx = useContext(LangCtx);
  if (!ctx) throw new Error("useLang must be used inside <LangProvider>");
  return ctx.lang;
}

/**
 * Tiny helper for switching language.
 * Sets a cookie via a server action and refreshes; we keep this client-side
 * for snappy interactions and let the server re-render with the new lang.
 */
export function useLangSwitcher() {
  const [pending, startTransition] = useTransition();

  function setLang(next: Lang) {
    startTransition(async () => {
      document.cookie = `lang=${next};path=/;max-age=31536000;samesite=lax`;
      window.location.reload();
    });
  }

  return { setLang, pending };
}
