"use client";

import { useState, useTransition } from "react";
import { Copy, Loader2, Plus, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { issueNextSerialAction } from "@/app/actions";
import { padSerial } from "@/lib/format";
import { cn } from "@/lib/utils";

type Issued = { serial: number; serialDisplay: string; magicWord: string };

export function SerialPanel({
  initialNextSerial,
}: {
  initialNextSerial: number;
}) {
  const t = useT();
  const [issued, setIssued] = useState<Issued | null>(null);
  const [history, setHistory] = useState<Issued[]>([]);
  const [pending, startTransition] = useTransition();

  function issue() {
    startTransition(async () => {
      const r = await issueNextSerialAction();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setIssued(r.data);
      setHistory((h) => [r.data, ...h].slice(0, 10));
    });
  }

  function copyAll() {
    if (!issued) return;
    const txt = `#${issued.serialDisplay} · ${issued.magicWord}`;
    navigator.clipboard.writeText(txt);
    toast.success(t.admin.copied);
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 pb-12 pt-4">
      <div className="flex items-baseline justify-between">
        <div className="text-eyebrow text-ink-mute">{t.admin.issueTitle}</div>
        <div className="text-eyebrow tabular text-ink-mute">
          → {padSerial(issued?.serial ?? initialNextSerial)}
        </div>
      </div>

      {/* Printable card */}
      <PrintableCard issued={issued} hint={t.admin.issueHint} />

      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={issue}
          disabled={pending}
          className="h-12 flex-1 rounded-full bg-ink text-paper hover:bg-ink/90"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Plus className="h-4 w-4" />
              {t.admin.issueButton}
            </>
          )}
        </Button>
        {issued && (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={copyAll}
              className="h-12 rounded-full border-hairline text-ink-soft no-print"
            >
              <Copy className="h-3.5 w-3.5" />
              {t.admin.copy}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.print()}
              className="h-12 rounded-full border-hairline text-ink-soft no-print"
            >
              <Printer className="h-3.5 w-3.5" />
              {t.admin.print}
            </Button>
          </>
        )}
      </div>

      {history.length > 0 && (
        <section className="no-print">
          <div className="text-eyebrow mb-3 text-ink-mute">
            {t.admin.recentlyIssued}
          </div>
          <ul className="flex flex-col rounded-lg border border-hairline bg-paper">
            {history.map((it) => (
              <li
                key={it.serial}
                className="flex items-center justify-between border-b border-hairline px-4 py-3 last:border-0"
              >
                <span className="text-display tabular text-lg text-ink">
                  {it.serialDisplay}
                </span>
                <span className="font-mono text-sm text-ink-soft">
                  {it.magicWord}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `#${it.serialDisplay} · ${it.magicWord}`
                    );
                    toast.success(t.admin.copied);
                  }}
                  className="text-ink-mute hover:text-ink"
                  aria-label={t.admin.copy}
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function PrintableCard({
  issued,
  hint,
}: {
  issued: Issued | null;
  hint: string;
}) {
  return (
    <div
      className={cn(
        "relative flex aspect-[3/2] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-hairline bg-paper p-6",
        "shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
      )}
    >
      <span className="absolute left-4 top-4 text-eyebrow text-ink-mute">
        Doushu · 豆书
      </span>
      <span className="absolute right-4 top-4 text-eyebrow text-gold">
        Co-Publishing
      </span>
      {issued ? (
        <>
          <div className="text-display tabular text-[3.5rem] leading-none text-ink">
            {issued.serialDisplay}
          </div>
          <div className="hairline w-12" />
          <div className="font-mono text-base tracking-wide text-ink-soft">
            {issued.magicWord}
          </div>
        </>
      ) : (
        <p className="max-w-[28ch] text-center text-sm text-ink-mute">
          {hint}
        </p>
      )}
    </div>
  );
}
