import { Suspense } from "react";
import { ArrowUpRight, LogOut } from "lucide-react";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { ManagePanel } from "@/components/admin/ManagePanel";
import { TopBar } from "@/components/hero/TopBar";
import { readAdmin } from "@/lib/auth/session";
import { counts } from "@/lib/notion/repo";
import { isNotionConfigured, parentPageUrl } from "@/lib/notion/client";
import { adminSignOutAction } from "@/app/actions";
import { getCopy } from "@/lib/server-i18n";

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminBody />
    </Suspense>
  );
}

async function AdminBody() {
  const isAdmin = await readAdmin();
  const t = await getCopy();

  if (!isAdmin) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <TopBar />
        <AdminLogin />
      </main>
    );
  }

  const configured = isNotionConfigured();
  let stats = { issued: 0, wished: 0, goal: 3000, onWall: 0 };
  if (configured) {
    try {
      stats = await counts();
    } catch (e) {
      console.error("[admin] notion read failed", e);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <TopBar
        trailing={
          <form action={adminSignOutAction}>
            <button
              type="submit"
              className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-hairline text-ink-soft transition-colors hover:border-ink hover:text-ink"
              aria-label={t.admin.signOut}
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        }
      />

      <header className="px-5 pt-4">
        <div className="text-eyebrow text-ink-mute">{t.admin.title}</div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Stat label={t.admin.sold} value={stats.issued} />
          <Stat label={t.admin.wished} value={stats.wished} />
          <Stat label={t.progress.goal} value={stats.goal} dim />
        </div>
      </header>

      <ManagePanel />

      <a
        href={parentPageUrl()}
        target="_blank"
        rel="noreferrer"
        className="no-print mx-5 mb-12 inline-flex items-center justify-center gap-2 rounded-full border border-dashed border-hairline px-4 py-3 text-sm text-ink-soft transition-colors hover:border-ink hover:text-ink"
      >
        {t.admin.openInNotion}
        <ArrowUpRight className="h-3.5 w-3.5" />
      </a>
      <p className="mx-5 -mt-8 mb-12 text-center text-xs text-ink-mute">
        {t.admin.notionHint}
      </p>
    </main>
  );
}

function AdminSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-10">
      <div className="h-3 w-24 animate-pulse rounded bg-ivory/60" />
      <div className="mt-4 h-20 w-full animate-pulse rounded-xl bg-ivory/50" />
      <div className="mt-6 h-40 w-full animate-pulse rounded-xl bg-ivory/40" />
    </main>
  );
}

function Stat({
  label,
  value,
  dim = false,
}: {
  label: string;
  value: number;
  dim?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-hairline ${
        dim ? "bg-ivory/30" : "bg-paper"
      } p-3`}
    >
      <div className="text-eyebrow text-ink-mute">{label}</div>
      <div className="text-display tabular mt-1 text-2xl text-ink">{value}</div>
    </div>
  );
}
