"use client";

import { useState, useTransition } from "react";
import { Loader2, PackageCheck, PackageX } from "lucide-react";
import { toast } from "sonner";

import { setReadyToShipAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Admin-only toggle that flips the global "ready to ship" flag with a
 * confirmation dialog. Optimistically reflects the new value once the
 * server confirms; on failure rolls back and surfaces a toast.
 */
export function ShipReadyToggle({
  initialReady,
}: {
  initialReady: boolean;
}) {
  const t = useT();
  const [ready, setReady] = useState(initialReady);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // The dialog asks the user to switch *away from* the current state, so
  // the next value is always the inverse of `ready`.
  const next = !ready;

  function applyToggle() {
    startTransition(async () => {
      const r = await setReadyToShipAction({ ready: next, confirm: true });
      if (!r.ok) {
        toast.error(t.admin.shipToggleFailed);
        return;
      }
      setReady(r.data.ready);
      setConfirmOpen(false);
    });
  }

  return (
    <section className="no-print mx-5 mt-2 rounded-xl border border-hairline bg-paper/60 p-4">
      <div className="text-eyebrow mb-2 flex items-center gap-1.5 text-ink-mute">
        {ready ? (
          <PackageCheck className="h-3 w-3" />
        ) : (
          <PackageX className="h-3 w-3" />
        )}
        {t.admin.shipToggleTitle}
      </div>
      <p className="mb-3 text-xs leading-relaxed text-ink-soft">
        {t.admin.shipToggleHint}
      </p>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex h-6 items-center rounded-full px-2 text-[10px] font-medium tracking-wide",
              ready
                ? "bg-ink text-paper"
                : "border border-hairline bg-ivory/40 text-ink-soft"
            )}
          >
            {ready ? t.admin.shipReadyOnBadge : t.admin.shipReadyOffBadge}
          </span>
          <span className="text-sm text-ink">
            {ready ? t.admin.shipReadyOn : t.admin.shipReadyOff}
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => setConfirmOpen(true)}
          disabled={pending}
          className="h-9 rounded-full border-hairline px-4 text-sm"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : next ? (
            t.admin.shipReadyOn
          ) : (
            t.admin.shipReadyOff
          )}
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm border-hairline bg-paper">
          <DialogHeader>
            <DialogTitle className="text-display flex items-center gap-2 text-lg text-ink">
              {next ? (
                <PackageCheck className="h-4 w-4 text-ink" />
              ) : (
                <PackageX className="h-4 w-4 text-ink" />
              )}
              {next ? t.admin.shipConfirmTitleOn : t.admin.shipConfirmTitleOff}
            </DialogTitle>
            <DialogDescription className="text-sm text-ink-soft">
              {next ? t.admin.shipConfirmBodyOn : t.admin.shipConfirmBodyOff}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row justify-end gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={pending}
              className="rounded-full border-hairline"
            >
              {t.common.cancel}
            </Button>
            <Button
              type="button"
              onClick={applyToggle}
              disabled={pending}
              className="rounded-full bg-ink text-paper hover:bg-ink/90"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t.admin.shipConfirmCta
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
