"use client";

import { useTransition } from "react";
import { Download, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

const QR_SRC = "/waitlist-qr.jpg";
const QR_DOWNLOAD_NAME = "doushu-xhs-qr.jpg";

/**
 * Bottom sheet shown when the homepage CTA is "我想要".
 *
 * Under the offline-issue flow this drawer is purely informational: it
 * shows the Xiaohongshu group QR code, lets the visitor save it, and
 * walks them through the three offline steps to get a serial + magic
 * word. No backend writes happen here — serials are issued by the
 * vendor in the admin panel.
 */
export function WaitlistSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const t = useT();
  const [pending, startTransition] = useTransition();

  function downloadQr() {
    if (pending) return;
    startTransition(async () => {
      try {
        const res = await fetch(QR_SRC, { cache: "no-store" });
        if (!res.ok) throw new Error("qr_fetch_failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = QR_DOWNLOAD_NAME;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (err) {
        console.error("[waitlist] qr download failed", err);
        toast.error(t.waitlist.downloadFailed);
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto rounded-t-2xl border-hairline bg-paper p-6 pt-5"
      >
        <SheetHeader className="px-0 text-left">
          <div className="text-eyebrow flex items-center gap-2">
            <Sparkles className="h-3 w-3" />
            <span>{t.brand.name}</span>
          </div>
          <SheetTitle className="text-display text-2xl text-ink">
            {t.waitlist.title}
          </SheetTitle>
          <SheetDescription className="text-ink-mute">
            {t.waitlist.qrCaption}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 flex flex-col items-center gap-3">
          <div className="rounded-xl border border-hairline bg-ivory/40 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={QR_SRC}
              alt={t.waitlist.qrAlt}
              width={200}
              height={200}
              className="h-[200px] w-[200px]"
            />
          </div>

          <Button
            type="button"
            onClick={downloadQr}
            disabled={pending}
            size="lg"
            variant="outline"
            className="h-11 rounded-full border-hairline px-5 text-[14px] text-ink"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t.waitlist.downloadPending}
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                {t.waitlist.downloadCta}
              </>
            )}
          </Button>
        </div>

        <section className="mt-6">
          <div className="text-eyebrow mb-3 text-ink-mute">
            {t.waitlist.stepsTitle}
          </div>
          <ol className="flex flex-col gap-3">
            {t.waitlist.steps.map((step, i) => (
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
                  <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </SheetContent>
    </Sheet>
  );
}
