"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  RotateCcw,
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
  listAllSerialsAction,
  resetSerialsAction,
  setSerialStatusAction,
  type AdminSerialRow,
} from "@/app/actions";
import {
  ALL_SERIAL_STATUSES,
  type SerialStatus,
} from "@/lib/notion/status";
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
 * `PAGE_SIZE`-at-a-time, and lets the publisher advance any row to a
 * new lifecycle status with a single dropdown change. Updates apply
 * optimistically and roll back on server error.
 *
 * The legacy "issue next serial" flow lives elsewhere now — every row
 * originates from a waitlist signup (`claimWishedSerial`), and the
 * admin's job is to move existing rows down the pipeline.
 */
export function ManagePanel() {
  const t = useT();
  const [rows, setRows] = useState<AdminSerialRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadPending, startLoadTransition] = useTransition();
  const [page, setPage] = useState(0);
  const [resetOpen, setResetOpen] = useState(false);

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

  useEffect(() => {
    load();
  }, []);

  const totalPages = Math.max(1, Math.ceil((rows?.length ?? 0) / PAGE_SIZE));
  // Clamp on render rather than via a setState-in-effect, so a row removal
  // (e.g. after Reset) doesn't strand the user on an empty page.
  const safePage = Math.min(page, totalPages - 1);
  const visible = useMemo(() => {
    if (!rows) return [];
    const start = safePage * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, safePage]);

  const totalCount = rows?.length ?? 0;
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
          <ul className="flex flex-col gap-2">
            {visible.map((row) => (
              <ManageRow
                key={row.pageId}
                row={row}
                setRows={setRows}
              />
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

      <DangerZone
        initialCount={totalCount}
        open={resetOpen}
        onOpenChange={setResetOpen}
        onResetDone={load}
      />
    </section>
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
  setRows,
}: {
  row: AdminSerialRow;
  setRows: Dispatch<SetStateAction<AdminSerialRow[] | null>>;
}) {
  const t = useT();
  const [pending, startTransition] = useTransition();

  function changeStatus(next: SerialStatus) {
    if (next === row.status) return;
    const previous = row.status;

    // Optimistic update — flip the row immediately, then reconcile.
    setRows((prev) =>
      prev
        ? prev.map((r) =>
            r.pageId === row.pageId ? { ...r, status: next } : r
          )
        : prev
    );

    startTransition(async () => {
      const r = await setSerialStatusAction({
        pageId: row.pageId,
        status: next,
      });
      if (!r.ok) {
        // Rollback on failure.
        setRows((prev) =>
          prev
            ? prev.map((it) =>
                it.pageId === row.pageId ? { ...it, status: previous } : it
              )
            : prev
        );
        toast.error(t.admin.statusUpdateFailed);
        return;
      }
      toast.success(
        t.admin.statusUpdated.replace(
          "{status}",
          t.admin.statusLabels[STATUS_LABEL_KEY[next]]
        )
      );
    });
  }

  return (
    <li className="rounded-xl border border-hairline bg-paper px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-display tabular text-base text-ink">
          #{row.serialDisplay}
        </div>
        <div className="font-mono text-[10px] text-ink-mute">
          {row.magicWord}
        </div>
      </div>

      {(row.nickname || row.contact) && (
        <div className="mt-1.5 flex flex-col gap-0.5">
          {row.nickname && (
            <div className="truncate text-sm text-ink">{row.nickname}</div>
          )}
          {row.contact && (
            <div className="truncate text-xs text-ink-mute">
              {row.contact}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <label
          htmlFor={`status-${row.pageId}`}
          className="text-eyebrow text-ink-mute"
        >
          {t.admin.statusColumn}
        </label>
        <div className="relative">
          <select
            id={`status-${row.pageId}`}
            value={row.status}
            onChange={(e) => changeStatus(e.target.value as SerialStatus)}
            disabled={pending}
            className={cn(
              "h-8 cursor-pointer appearance-none rounded-full border border-hairline bg-ivory/40 pl-3 pr-7 text-xs text-ink",
              "transition-colors hover:border-ink/40 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10",
              "disabled:cursor-not-allowed disabled:opacity-60"
            )}
          >
            {ALL_SERIAL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t.admin.statusLabels[STATUS_LABEL_KEY[s]]}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-soft">
            {pending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </span>
        </div>
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
