"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, LogOut, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n";
import {
  cancelExchangeAction,
  confirmDeliveryAction,
  getMyBook,
  saveProfileAction,
  signOutAction,
} from "@/app/actions";
import type { SerialRow } from "@/lib/notion/properties";
import { padSerial } from "@/lib/format";
import { StatusTimeline } from "./StatusTimeline";

export function MyBookSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const t = useT();
  const [row, setRow] = useState<SerialRow | null>(null);
  const [loadPending, startLoad] = useTransition();
  const [pending, startTransition] = useTransition();

  const [nickname, setNickname] = useState("");
  const [contact, setContact] = useState("");
  const [showOnWall, setShowOnWall] = useState(true);
  const [wantsPrintedBook, setWantsPrintedBook] = useState(false);
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (!open) return;
    let alive = true;
    startLoad(async () => {
      const r = await getMyBook();
      if (!alive) return;
      setRow(r);
      if (r) {
        setNickname(r.nickname);
        setContact(r.contact);
        setShowOnWall(r.showOnWall || !r.nickname);
        setWantsPrintedBook(r.wantsPrintedBook);
        setAddress(r.address);
      }
    });
    return () => {
      alive = false;
    };
  }, [open]);

  const loading = loadPending && !row;

  const pipelineLocked =
    row?.status === "Shipped" || row?.status === "Delivered";

  const showAddressField = wantsPrintedBook;

  const saveDisabled =
    !nickname.trim() ||
    !contact.trim() ||
    pending ||
    (showAddressField &&
      !pipelineLocked &&
      address.trim().length < 2);

  function save() {
    startTransition(async () => {
      const res = await saveProfileAction({
        nickname,
        contact,
        wantsPrintedBook: pipelineLocked ? row!.wantsPrintedBook : wantsPrintedBook,
        showOnWall,
        address: wantsPrintedBook ? address : "",
      });
      if (!res.ok) {
        if (res.error === "address_required") {
          toast.error(`${t.myBook.addressLabel}：${t.myBook.addressTooShort}`);
        } else {
          toast.error(res.error);
        }
        return;
      }
      toast.success(t.myBook.saved);
      const refreshed = await getMyBook();
      if (refreshed) setRow(refreshed);
    });
  }

  function confirmReceipt() {
    startTransition(async () => {
      try {
        const res = await confirmDeliveryAction();
        if (!res.ok) {
          toast.error(t.myBook.receiptFailed);
          return;
        }
        toast.success(t.myBook.receiptConfirmed);
        const refreshed = await getMyBook();
        if (refreshed) setRow(refreshed);
      } catch (err) {
        console.error("[myBook] confirmReceipt failed", err);
        toast.error(t.myBook.receiptFailed);
      }
    });
  }

  function cancelExchange() {
    startTransition(async () => {
      try {
        const res = await cancelExchangeAction();
        if (!res.ok) {
          toast.error(
            res.error === "exchange_locked"
              ? t.myBook.exchangeCancelLocked
              : t.myBook.exchangeFailed
          );
          return;
        }
        setWantsPrintedBook(false);
        setAddress("");
        const refreshed = await getMyBook();
        if (refreshed) setRow(refreshed);
      } catch (err) {
        console.error("[myBook] cancelExchange failed", err);
        toast.error(t.myBook.exchangeFailed);
      }
    });
  }

  function signOut() {
    startTransition(async () => {
      await signOutAction();
      onOpenChange(false);
    });
  }

  const profileIncomplete = row && !row.nickname;

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v && profileIncomplete && !nickname.trim()) {
          toast.message(t.myBook.profileTitle);
          return;
        }
        onOpenChange(v);
      }}
    >
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto rounded-t-2xl border-hairline bg-paper p-6 pt-5"
      >
        <SheetHeader className="px-0 text-left">
          <div className="text-eyebrow flex items-center gap-2">
            <Sparkles className="h-3 w-3" />
            <span>{t.myBook.title}</span>
          </div>
          <SheetTitle className="text-display flex items-baseline gap-3 text-3xl text-ink">
            {row ? (
              <>
                <span className="tabular">{padSerial(row.serial)}</span>
                <span className="text-eyebrow text-ink-mute">
                  / {row.magicWord || "—"}
                </span>
              </>
            ) : (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
          </SheetTitle>
          <SheetDescription className="text-ink-mute">
            {t.myBook.profileTitle}
          </SheetDescription>
        </SheetHeader>

        {loading || !row ? (
          <div className="py-8 text-center text-ink-mute">
            {t.common.loading}
          </div>
        ) : (
          <div className="mt-5 flex flex-col gap-5">
            <div className="rounded-lg border border-hairline bg-ivory/40 p-4">
              <div className="text-eyebrow mb-3 text-ink-mute">
                {t.myBook.statusLabel}
              </div>
              <StatusTimeline
                status={row.status}
                wantsExchange={
                  row.wantsPrintedBook ||
                  (row.status !== "Issued" && row.status !== "Profile Complete")
                }
              />
              {row.status === "Exchange Requested" && (
                <p className="mt-3 text-xs leading-relaxed text-ink-mute">
                  {t.myBook.exchangeAwaitingShipHint}
                </p>
              )}
              {row.status === "Shipped" && (
                <p className="mt-3 text-xs leading-relaxed text-ink-mute">
                  {t.myBook.shippedAwaitReceiptHint}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-xs text-ink-mute">{t.myBook.profileNote}</p>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nickname" className="text-eyebrow text-ink-mute">
                  {t.myBook.nicknameLabel}
                </Label>
                <Input
                  id="nickname"
                  required
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="h-11 rounded-md border-hairline bg-ivory/40"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contact" className="text-eyebrow text-ink-mute">
                  {t.myBook.contactLabel}
                </Label>
                <Input
                  id="contact"
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="h-11 rounded-md border-hairline bg-ivory/40"
                />
              </div>

              <label className="mt-1 flex items-start gap-3 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  checked={showOnWall}
                  onChange={(e) => setShowOnWall(e.target.checked)}
                  className="mt-1 h-4 w-4 cursor-pointer accent-ink"
                />
                <span>{t.myBook.showOnWallLabel}</span>
              </label>

              <label className="flex items-start gap-3 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  checked={wantsPrintedBook}
                  disabled={pipelineLocked}
                  onChange={(e) => {
                    const v = e.target.checked;
                    setWantsPrintedBook(v);
                    if (!v) setAddress("");
                  }}
                  className="mt-1 h-4 w-4 cursor-pointer accent-ink disabled:opacity-50"
                />
                <span>{t.myBook.wantPrintedLabel}</span>
              </label>

              {showAddressField && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="address" className="text-eyebrow text-ink-mute">
                    {t.myBook.addressLabel}
                  </Label>
                  <textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    className="min-h-[88px] w-full resize-y rounded-md border border-hairline bg-ivory/40 px-3 py-2 text-sm text-ink placeholder:text-ink-mute/40 focus-visible:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/10"
                  />
                </div>
              )}

              <Button
                type="button"
                onClick={save}
                disabled={saveDisabled}
                className="mt-1 h-11 rounded-full bg-ink text-paper hover:bg-ink/90 disabled:opacity-50"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t.myBook.save
                )}
              </Button>
            </div>

            {row.nickname &&
              row.status === "Exchange Requested" &&
              !pipelineLocked && (
                <div className="rounded-lg border border-hairline bg-paper p-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelExchange}
                    disabled={pending}
                    className="h-9 border-hairline text-ink-soft"
                  >
                    {t.myBook.cancelExchange}
                  </Button>
                </div>
              )}

            {row.nickname && row.status === "Shipped" && (
              <div className="rounded-lg border border-hairline bg-paper p-4">
                <p className="mb-2 text-xs text-ink-mute">
                  {t.myBook.confirmReceiptHint}
                </p>
                <Button
                  type="button"
                  onClick={confirmReceipt}
                  disabled={pending}
                  className="h-10 rounded-full bg-ink px-5 text-paper hover:bg-ink/90"
                >
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t.myBook.confirmReceipt
                  )}
                </Button>
              </div>
            )}

            <button
              type="button"
              onClick={signOut}
              className="mt-2 inline-flex items-center justify-center gap-2 self-center text-xs tracking-wider text-ink-mute hover:text-ink"
            >
              <LogOut className="h-3 w-3" />
              {t.myBook.signOut}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
