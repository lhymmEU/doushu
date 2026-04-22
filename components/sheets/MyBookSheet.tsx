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
  getMyBook,
  requestExchangeAction,
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

  // form state
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

  function save() {
    startTransition(async () => {
      const res = await saveProfileAction({
        nickname,
        contact,
        wantsPrintedBook,
        showOnWall,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t.myBook.saved);
      const refreshed = await getMyBook();
      if (refreshed) setRow(refreshed);
    });
  }

  function submitExchange() {
    if (!address.trim()) {
      toast.error(t.myBook.addressLabel);
      return;
    }
    startTransition(async () => {
      const res = await requestExchangeAction({ address });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("✓");
      const refreshed = await getMyBook();
      if (refreshed) setRow(refreshed);
    });
  }

  function cancelExchange() {
    startTransition(async () => {
      await cancelExchangeAction();
      const refreshed = await getMyBook();
      if (refreshed) setRow(refreshed);
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
        // don't allow dismissal with empty profile
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
            <span>{t.myBook.yours}</span>
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
            {/* timeline */}
            <div className="rounded-lg border border-hairline bg-ivory/40 p-4">
              <div className="text-eyebrow mb-3 text-ink-mute">
                {t.myBook.statusLabel}
              </div>
              <StatusTimeline
                status={row.status}
                wantsExchange={row.wantsPrintedBook || row.status !== "Issued" && row.status !== "Profile Complete"}
              />
            </div>

            {/* profile form */}
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
                <span>{t.wall.title}</span>
              </label>

              <label className="flex items-start gap-3 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  checked={wantsPrintedBook}
                  onChange={(e) => setWantsPrintedBook(e.target.checked)}
                  className="mt-1 h-4 w-4 cursor-pointer accent-ink"
                />
                <span>{t.myBook.wantPrintedLabel}</span>
              </label>

              <Button
                type="button"
                onClick={save}
                disabled={pending || !nickname.trim() || !contact.trim()}
                className="mt-1 h-11 rounded-full bg-ink text-paper hover:bg-ink/90"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t.myBook.save
                )}
              </Button>
            </div>

            {/* exchange flow (visible after profile saved) */}
            {row.nickname && (
              <div className="mt-2 rounded-lg border border-hairline bg-paper p-4">
                {row.status === "Exchange Requested" ||
                row.status === "Shipping Paid" ||
                row.status === "Shipped" ||
                row.status === "Delivered" ? (
                  <div className="flex flex-col gap-2">
                    <div className="text-eyebrow text-ink-mute">
                      {t.myBook.addressLabel}
                    </div>
                    <p className="text-sm text-ink">{row.address || "—"}</p>
                    {row.status === "Exchange Requested" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelExchange}
                        disabled={pending}
                        className="mt-2 h-9 self-start border-hairline text-ink-soft"
                      >
                        {t.myBook.cancelExchange}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="address"
                      className="text-eyebrow text-ink-mute"
                    >
                      {t.myBook.addressLabel}
                    </Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="武汉市..."
                      className="h-11 rounded-md border-hairline bg-ivory/40"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={submitExchange}
                      disabled={pending || !address.trim()}
                      className="mt-1 h-10 rounded-full border-ink text-ink hover:bg-ink hover:text-paper"
                    >
                      {t.myBook.requestExchange}
                    </Button>
                  </div>
                )}
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
