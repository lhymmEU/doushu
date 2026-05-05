"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Check, Download, Loader2, Sparkles, X } from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  checkNicknameAvailableAction,
  joinWaitlistAction,
} from "@/app/actions";

const QR_SRC = "/waitlist-qr.jpg";
const QR_DOWNLOAD_NAME = "doushu-xhs-qr.jpg";
const CHECK_DEBOUNCE_MS = 350;
const MAX_NICKNAME_LEN = 40;

type Status =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "available" }
  | { kind: "taken" }
  | { kind: "too_long" }
  | { kind: "not_configured" }
  | { kind: "error"; message: string };

/**
 * Bottom sheet shown when the homepage CTA is "我想要" (i.e. the site is
 * not yet ready to ship). Lets a visitor pick a nickname, validates it
 * against the cached union of taken nicknames (debounced), and on the
 * download click registers a row in the waitlist DB *before* triggering
 * the QR-code download.
 */
export function WaitlistSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const t = useT();
  const [nickname, setNickname] = useState("");
  // Tracks async check results only. The displayed `status` below derives the
  // synchronous client-side states (idle / too_long) so we never call setState
  // inside an effect (banned by react-hooks/set-state-in-effect on React 19).
  const [serverStatus, setServerStatus] = useState<Status>({ kind: "idle" });
  const [pending, startTransition] = useTransition();
  // Used to ignore stale debounce callbacks when the user keeps typing.
  const checkSeq = useRef(0);

  const trimmed = nickname.trim();
  const tooLong = trimmed.length > MAX_NICKNAME_LEN;

  // Derived display status: synchronous input checks short-circuit the cached
  // async result, so the UI updates the moment the field becomes (in)valid.
  const status: Status = !trimmed
    ? { kind: "idle" }
    : tooLong
      ? { kind: "too_long" }
      : serverStatus;

  // Reset transient state when the sheet closes. We use the "store previous
  // prop in state" pattern (React 19 docs) instead of an effect so this
  // doesn't trip react-hooks/set-state-in-effect.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setNickname("");
      setServerStatus({ kind: "idle" });
    }
  }

  // Invalidate any in-flight check when the sheet closes. Ref mutation lives
  // in an effect (refs are not allowed during render under react-hooks/refs).
  useEffect(() => {
    if (!open) checkSeq.current++;
  }, [open]);

  const runCheck = useCallback((value: string) => {
    const seq = ++checkSeq.current;
    setServerStatus({ kind: "checking" });
    void (async () => {
      const r = await checkNicknameAvailableAction({ nickname: value });
      if (seq !== checkSeq.current) return;
      if (!r.ok) {
        if (r.error === "not_configured") {
          setServerStatus({ kind: "not_configured" });
        } else if (r.error === "nickname_too_long") {
          setServerStatus({ kind: "too_long" });
        } else if (r.error === "nickname_required") {
          setServerStatus({ kind: "idle" });
        } else {
          setServerStatus({ kind: "error", message: r.error });
        }
        return;
      }
      setServerStatus({ kind: r.data.available ? "available" : "taken" });
    })();
  }, []);

  // Debounced availability check. The effect only schedules the network call
  // (in a setTimeout callback, not synchronously) and bumps the seq guard when
  // the input is invalid; all setState happens off the effect body.
  useEffect(() => {
    if (!open || !trimmed || tooLong) {
      checkSeq.current++;
      return;
    }
    const id = window.setTimeout(() => runCheck(trimmed), CHECK_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [open, trimmed, tooLong, runCheck]);

  async function downloadQrBlob() {
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
    // Revoke after a tick so the click has time to start the download.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmed || pending) return;
    if (status.kind === "taken") {
      toast.error(t.waitlist.nicknameTaken);
      return;
    }
    if (status.kind === "too_long") {
      toast.error(t.waitlist.nicknameTooLong);
      return;
    }
    if (status.kind === "not_configured") {
      toast.error(t.waitlist.notConfigured);
      return;
    }

    startTransition(async () => {
      const r = await joinWaitlistAction({ nickname: trimmed });
      if (!r.ok) {
        if (r.error === "nickname_taken") {
          setServerStatus({ kind: "taken" });
          toast.error(t.waitlist.nicknameTaken);
          return;
        }
        if (r.error === "not_configured") {
          setServerStatus({ kind: "not_configured" });
          toast.error(t.waitlist.notConfigured);
          return;
        }
        toast.error(t.waitlist.downloadFailed);
        return;
      }
      try {
        await downloadQrBlob();
        // Show the reserved serial in the success toast so the user knows
        // they have a real spot, not just an entry in a list.
        toast.success(
          t.waitlist.joinedWithSerial.replace("{serial}", r.data.serialDisplay)
        );
        onOpenChange(false);
      } catch (err) {
        console.error("[waitlist] qr download failed", err);
        toast.error(t.waitlist.downloadFailed);
      }
    });
  }

  const downloadDisabled =
    pending ||
    !trimmed ||
    status.kind === "checking" ||
    status.kind === "taken" ||
    status.kind === "too_long" ||
    status.kind === "not_configured";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl border-hairline bg-paper p-6 pt-5"
      >
        <SheetHeader className="px-0 text-left">
          <div className="text-eyebrow flex items-center gap-2">
            <Sparkles className="h-3 w-3" />
            <span>Doushu</span>
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
        </div>

        <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="waitlist-nickname"
              className="text-eyebrow text-ink-mute"
            >
              {t.waitlist.nicknameLabel}
            </Label>
            <Input
              id="waitlist-nickname"
              autoComplete="off"
              autoFocus
              required
              maxLength={MAX_NICKNAME_LEN + 8}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t.waitlist.nicknamePlaceholder}
              className="h-12 rounded-md border-hairline bg-ivory/50 text-base placeholder:text-ink-mute/40"
            />
            <NicknameStatus status={status} t={t} />
          </div>

          <Button
            type="submit"
            disabled={downloadDisabled}
            size="lg"
            className="mt-2 h-12 rounded-full bg-ink text-paper text-[15px] tracking-wider hover:bg-ink/90"
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

          <p className="text-center text-xs text-ink-mute">
            {t.waitlist.nicknameHint}
          </p>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function NicknameStatus({ status, t }: { status: Status; t: ReturnType<typeof useT> }) {
  const tone = (() => {
    switch (status.kind) {
      case "available":
        return "text-emerald-700";
      case "taken":
      case "too_long":
      case "not_configured":
      case "error":
        return "text-red-700";
      case "checking":
        return "text-ink-mute";
      default:
        return "text-ink-mute";
    }
  })();

  let label: string | null = null;
  let Icon: typeof Check | null = null;
  switch (status.kind) {
    case "checking":
      label = t.waitlist.nicknameChecking;
      Icon = Loader2;
      break;
    case "available":
      label = t.waitlist.nicknameAvailable;
      Icon = Check;
      break;
    case "taken":
      label = t.waitlist.nicknameTaken;
      Icon = X;
      break;
    case "too_long":
      label = t.waitlist.nicknameTooLong;
      Icon = X;
      break;
    case "not_configured":
      label = t.waitlist.notConfigured;
      Icon = X;
      break;
    case "error":
      label = t.waitlist.downloadFailed;
      Icon = X;
      break;
    default:
      label = null;
  }

  if (!label) return <div className="h-4" aria-hidden="true" />;

  return (
    <div className={cn("flex items-center gap-1.5 text-xs", tone)} role="status">
      {Icon && (
        <Icon
          className={cn(
            "h-3 w-3",
            status.kind === "checking" && "animate-spin"
          )}
        />
      )}
      <span>{label}</span>
    </div>
  );
}
