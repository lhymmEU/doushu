import { LangProvider } from "@/lib/i18n";
import { getLang } from "@/lib/server-i18n";
import { LangSync } from "./LangSync";

/**
 * Server boundary that resolves the current language from the cookie and
 * provides it to every descendant via <LangProvider>. Wrapped in <Suspense>
 * by the root layout so cacheComponents stays happy.
 */
export async function LangShell({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <LangProvider lang={lang}>
      <LangSync lang={lang} />
      {children}
    </LangProvider>
  );
}
