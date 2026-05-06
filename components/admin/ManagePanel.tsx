"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Copy as CopyIcon,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";
import {
  issueNewSerialAction,
  listAllSerialsAction,
  markPrintedBookShippedAction,
  resetSerialsAction,
  type AdminSerialRow,
} from "@/app/actions";
import type { SerialStatus } from "@/lib/notion/status";
import type { Copy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 5;

const STATUS_LABEL_KEY: Record<
  SerialStatus,
  keyof Copy["admin"]["statusLabels"]
> = {
  Wished: "wished",
  Issued: "issued",
  "Profile Complete": "profileComplete",
  "Exchange Requested": "exchangeRequested",
  Shipped: "shipped",
  Delivered: "delivered",
};

/**
 * Admin management list. Loads every serial row, paginates them
 * `PAGE_SIZE`-at-a-time. Mini zines are issued offline; the **printed book**
 * trade-up uses “Mark printed book shipped” when status is trade-up requested,
 * then the buyer confirms receipt (final — locked for admin).
 */
type IssuedCredentials = {
  serial: number;
  serialDisplay: string;
  magicWord: string;
};

export function ManagePanel() {
  const t = useT();
  const [rows, setRows] = useState<AdminSerialRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadPending, startLoadTransition] = useTransition();
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [issuePending, startIssueTransition] = useTransition();
  const [issued, setIssued] = useState<IssuedCredentials | null>(null);

  function load() {
    startLoadTransition(async () => {
      const r = await listAllSerialsAction();
      if (!r.ok) {
        setError(r.error);
        setRows(null);
        return;
      }
      setError(null);
      setRows(r.data.rows);
    });
  }

  function issueNew() {
    if (issuePending) return;
    startIssueTransition(async () => {
      const r = await issueNewSerialAction();
      if (!r.ok) {
        toast.error(t.admin.issueNewFailed);
        return;
      }
      setIssued({
        serial: r.data.serial,
        serialDisplay: r.data.serialDisplay,
        magicWord: r.data.magicWord,
      });
      // Land the new row on page 1 so the vendor sees it after closing.
      setPage(0);
    });
  }

  function closeIssueDialog() {
    setIssued(null);
    load();
  }

  useEffect(() => {
    load();
  }, []);

  const filteredRows = useMemo(() => {
    if (!rows) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const nick = row.nickname.toLowerCase();
      const contact = row.contact.toLowerCase();
      const display = row.serialDisplay.toLowerCase();
      const serialStr = String(row.serial);
      const qNoHash = q.startsWith("#") ? q.slice(1) : q;
      if (nick.includes(q)) return true;
      if (contact.includes(q)) return true;
      if (display.includes(qNoHash)) return true;
      if (serialStr.includes(qNoHash)) return true;
      return false;
    });
  }, [rows, searchQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / PAGE_SIZE)
  );
  // Clamp on render rather than via a setState-in-effect, so a row removal
  // (e.g. after Reset) doesn't strand the user on an empty page.
  const safePage = Math.min(page, totalPages - 1);
  const visible = useMemo(() => {
    const start = safePage * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, safePage]);

  const totalCount = filteredRows.length;
  const fullSerialCount = rows?.length ?? 0;
  const showingFrom = totalCount === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const showingTo = Math.min(totalCount, (safePage + 1) * PAGE_SIZE);

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-3 px-5 pb-12 pt-4">
      <div className="flex items-baseline justify-between">
        <div className="text-eyebrow text-ink-mute">
          {t.admin.manageTitle}
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loadPending}
          className="no-print inline-flex items-center gap-1 text-xs text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
          aria-label={t.admin.manageRefresh}
        >
          <RefreshCw
            className={cn("h-3 w-3", loadPending && "animate-spin")}
          />
          {t.admin.manageRefresh}
        </button>
      </div>

      <Button
        type="button"
        onClick={issueNew}
        disabled={issuePending}
        className="no-print h-11 w-full rounded-full bg-ink text-paper hover:bg-ink/90"
      >
        {issuePending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t.admin.issueNewPending}
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" />
            {t.admin.issueNewButton}
          </>
        )}
      </Button>

      {loadPending && rows === null ? (
        <div className="flex h-32 items-center justify-center rounded-xl border border-hairline bg-paper text-sm text-ink-mute">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t.common.loading}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-hairline bg-paper px-5 py-8 text-center text-sm text-ink-mute">
          {t.admin.manageFailed}
        </div>
      ) : !rows || rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-hairline bg-paper px-5 py-8 text-center text-sm text-ink-mute">
          {t.admin.manageEmpty}
        </div>
      ) : (
        <>
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            placeholder={t.admin.manageSearchPlaceholder}
            className="h-11 rounded-xl border-hairline bg-paper text-[15px]"
            autoComplete="off"
            spellCheck={false}
          />

          {filteredRows.length === 0 ? (
            <div className="rounded-xl border border-hairline bg-paper px-5 py-8 text-center text-sm text-ink-mute">
              {t.admin.manageSearchEmpty}
            </div>
          ) : (
            <>
              <ul className="flex flex-col gap-2">
                {visible.map((row) => (
                  <ManageRow key={row.pageId} row={row} onUpdated={load} />
                ))}
              </ul>

              <Pagination
                page={safePage}
                totalPages={totalPages}
                showingFrom={showingFrom}
                showingTo={showingTo}
                total={totalCount}
                onPrev={() => setPage((p) => Math.max(0, p - 1))}
                onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              />
            </>
          )}
        </>
      )}

      <DangerZone
        initialCount={fullSerialCount}
        open={resetOpen}
        onOpenChange={setResetOpen}
        onResetDone={load}
      />

      <IssueResultDialog
        credentials={issued}
        onClose={closeIssueDialog}
      />
    </section>
  );
}

function IssueResultDialog({
  credentials,
  onClose,
}: {
  credentials: IssuedCredentials | null;
  onClose: () => void;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  // Reset the "copied" badge whenever a fresh credentials payload lands.
  // "store previous prop in state" so we don't run setState in an effect.
  const [prevSerial, setPrevSerial] = useState<number | null>(null);
  const currentSerial = credentials?.serial ?? null;
  if (currentSerial !== prevSerial) {
    setPrevSerial(currentSerial);
    setCopied(false);
  }

  if (!credentials) return null;

  const combined = `#${credentials.serialDisplay} / ${credentials.magicWord}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(combined);
      setCopied(true);
      toast.success(t.admin.issueDialogCopied);
    } catch (err) {
      console.error("[admin] clipboard write failed", err);
      toast.error(t.admin.issueNewFailed);
    }
  }

  return (
    <Dialog
      open={!!credentials}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-sm border-hairline bg-paper">
        <DialogHeader>
          <DialogTitle className="text-display flex items-center gap-2 text-lg text-ink">
            <Plus className="h-4 w-4 text-seal" />
            {t.admin.issueDialogTitle}
          </DialogTitle>
          <DialogDescription className="text-sm text-ink-soft">
            {t.admin.issueDialogHint}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-1 flex flex-col gap-3 rounded-lg border border-hairline bg-ivory/40 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-eyebrow text-ink-mute">
              {t.admin.issueDialogSerialLabel}
            </span>
            <span className="text-display tabular text-2xl text-ink">
              #{credentials.serialDisplay}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-eyebrow text-ink-mute">
              {t.admin.issueDialogMagicLabel}
            </span>
            <span className="font-mono text-sm tracking-tight text-ink">
              {credentials.magicWord}
            </span>
          </div>
        </div>

        <DialogFooter className="flex-row justify-end gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={copy}
            className="rounded-full border-hairline"
          >
            <CopyIcon className="h-3.5 w-3.5" />
            {copied ? t.admin.issueDialogCopied : t.admin.issueDialogCopy}
          </Button>
          <Button
            type="button"
            onClick={onClose}
            className="rounded-full bg-ink text-paper hover:bg-ink/90"
          >
            {t.admin.issueDialogClose}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Pagination({
  page,
  totalPages,
  showingFrom,
  showingTo,
  total,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  showingFrom: number;
  showingTo: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const t = useT();
  return (
    <div className="no-print mt-1 flex items-center justify-between">
      <div className="text-xs tabular text-ink-mute">
        {t.admin.manageShowing
          .replace("{from}", String(showingFrom))
          .replace("{to}", String(showingTo))
          .replace("{total}", String(total))}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onPrev}
          disabled={page === 0}
          className="h-8 w-8 rounded-full border-hairline p-0 text-ink-soft hover:text-ink disabled:opacity-40"
          aria-label={t.admin.managePrev}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <div className="text-xs tabular text-ink-mute">
          {t.admin.managePageOf
            .replace("{page}", String(page + 1))
            .replace("{total}", String(totalPages))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onNext}
          disabled={page >= totalPages - 1}
          className="h-8 w-8 rounded-full border-hairline p-0 text-ink-soft hover:text-ink disabled:opacity-40"
          aria-label={t.admin.manageNext}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function ManageRow({
  row,
  onUpdated,
}: {
  row: AdminSerialRow;
  onUpdated: () => void;
}) {
  const t = useT();
  const [shipPending, startShipTransition] = useTransition();

  const combined = `#${row.serialDisplay} / ${row.magicWord}`;

  function markPrintedShipped() {
    startShipTransition(async () => {
      const r = await markPrintedBookShippedAction({ pageId: row.pageId });
      if (!r.ok) {
        toast.error(
          r.error === "status_locked"
            ? t.admin.markPrintedBookShippedLocked
            : r.error === "not_exchange_requested"
              ? t.admin.markPrintedBookShippedWrongStatus
              : t.admin.markPrintedBookShippedFailed
        );
        return;
      }
      toast.success(t.admin.markPrintedBookShippedSuccess);
      onUpdated();
    });
  }

  async function copyCredentials() {
    try {
      await navigator.clipboard.writeText(combined);
      toast.success(t.admin.issueDialogCopied);
    } catch (e) {
      console.error("[admin] clipboard write failed", e);
      toast.error(t.admin.issueNewFailed);
    }
  }

  return (
    <li className="rounded-xl border border-hairline bg-paper px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-display tabular text-base text-ink">
            #{row.serialDisplay}
          </div>
          <div className="mt-0.5 font-mono text-[11px] leading-snug text-ink-mute">
            {row.magicWord}
          </div>
        </div>
        <button
          type="button"
          onClick={copyCredentials}
          className="no-print inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-hairline text-ink-soft transition-colors hover:border-ink hover:text-ink"
          aria-label={t.admin.manageRowCopyAria}
        >
          <CopyIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2.5 text-[13px] leading-snug">
        <span className="text-eyebrow text-ink-mute">
          {t.admin.manageNicknameLabel}
        </span>
        <span className="ml-2 font-medium text-ink">
          {row.nickname.trim() ? row.nickname : t.admin.manageNicknameEmpty}
        </span>
      </div>

      {row.contact.trim() ? (
        <div className="mt-1 truncate text-xs text-ink-mute">{row.contact}</div>
      ) : null}

      <div className="mt-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-eyebrow text-ink-mute">
            {t.admin.statusColumn}
          </span>
          <span className="text-xs text-ink">
            {t.admin.statusLabels[STATUS_LABEL_KEY[row.status]]}
          </span>
        </div>

        {row.status === "Exchange Requested" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={markPrintedShipped}
            disabled={shipPending}
            className="h-9 w-full rounded-full border-hairline text-xs"
          >
            {shipPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Truck className="h-3.5 w-3.5" />
                {t.admin.markPrintedBookShippedButton}
              </>
            )}
          </Button>
        )}

        {row.status === "Shipped" && (
          <p className="text-xs leading-relaxed text-ink-mute">
            {t.admin.shippedAwaitingBuyerNote}
          </p>
        )}

        {row.status === "Delivered" && (
          <p className="text-xs leading-relaxed text-ink-mute">
            {t.admin.deliveredFinalNote}
          </p>
        )}
      </div>
    </li>
  );
}

function DangerZone({
  initialCount,
  open,
  onOpenChange,
  onResetDone,
}: {
  initialCount: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onResetDone: () => void;
}) {
  const t = useT();
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();

  // Clear the input when the dialog is dismissed without submitting.
  // "store previous prop in state" pattern keeps this off any effect.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) setConfirm("");
  }

  function reset() {
    if (confirm.trim() !== "RESET") return;
    startTransition(async () => {
      const r = await resetSerialsAction({ confirm: "RESET" });
      if (!r.ok) {
        toast.error(t.admin.resetFailed);
        return;
      }
      toast.success(
        t.admin.resetSuccess.replace("{n}", String(r.data.archived))
      );
      onOpenChange(false);
      onResetDone();
    });
  }

  return (
    <>
      <section className="no-print mt-6 rounded-xl border border-dashed border-red-300/60 bg-red-50/30 p-4">
        <div className="text-eyebrow mb-2 flex items-center gap-1.5 text-red-700/80">
          <AlertTriangle className="h-3 w-3" />
          {t.admin.dangerZone}
        </div>
        <p className="mb-3 text-xs leading-relaxed text-ink-soft">
          {t.admin.resetHint}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(true)}
          className="h-10 w-full rounded-full border-red-300/70 bg-paper text-red-700 hover:bg-red-50 hover:text-red-800"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t.admin.resetButton}
        </Button>
      </section>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm border-hairline bg-paper">
          <DialogHeader>
            <DialogTitle className="text-display flex items-center gap-2 text-lg text-ink">
              <AlertTriangle className="h-4 w-4 text-red-700" />
              {t.admin.resetConfirmTitle}
            </DialogTitle>
            <DialogDescription className="text-sm text-ink-soft">
              {(t.admin.resetConfirmBody ?? "").replace(
                "{n}",
                String(Math.max(0, initialCount))
              )}
            </DialogDescription>
          </DialogHeader>

          <Input
            autoFocus
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={t.admin.resetConfirmPlaceholder}
            className="h-10 rounded-md border-hairline bg-ivory/40 font-mono tracking-widest"
          />

          <DialogFooter className="flex-row justify-end gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-full border-hairline"
            >
              {t.common.cancel}
            </Button>
            <Button
              type="button"
              onClick={reset}
              disabled={confirm.trim() !== "RESET" || pending}
              className="rounded-full bg-red-700 text-paper hover:bg-red-800"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t.admin.resetConfirmCta}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
