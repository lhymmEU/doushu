"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Layers,
  List,
  Loader2,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useT } from "@/lib/i18n";
import {
  issueBatchSerialsAction,
  issueNextSerialAction,
  listAllSerialsAction,
  resetSerialsAction,
  type AdminSerialRow,
  type IssuedItem,
} from "@/app/actions";
import { padSerial } from "@/lib/format";
import { cn } from "@/lib/utils";

type Issued = IssuedItem;

export function SerialPanel({
  initialNextSerial,
}: {
  initialNextSerial: number;
}) {
  const t = useT();
  const [issued, setIssued] = useState<Issued | null>(null);
  const [history, setHistory] = useState<Issued[]>([]);
  const [pending, startTransition] = useTransition();

  const [batchCount, setBatchCount] = useState(5);
  const [batchPending, startBatchTransition] = useTransition();
  const [lastBatch, setLastBatch] = useState<Issued[]>([]);

  const [manageOpen, setManageOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

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

  function issueBatch() {
    const n = Math.max(1, Math.min(50, Math.floor(batchCount || 0)));
    startBatchTransition(async () => {
      const r = await issueBatchSerialsAction({ count: n });
      if (!r.ok) {
        toast.error(t.admin.batchFailed);
        return;
      }
      setLastBatch(r.data.items);
      setHistory((h) => [...r.data.items, ...h].slice(0, 50));
      setIssued(r.data.items[r.data.items.length - 1] ?? null);
      toast.success(t.admin.batchIssued.replace("{n}", String(n)));
    });
  }

  function copyAll() {
    if (!issued) return;
    const txt = `#${issued.serialDisplay} · ${issued.magicWord}`;
    navigator.clipboard.writeText(txt);
    toast.success(t.admin.copied);
  }

  function copyBatch() {
    if (lastBatch.length === 0) return;
    const txt = lastBatch
      .map((it) => `#${it.serialDisplay} · ${it.magicWord}`)
      .join("\n");
    navigator.clipboard.writeText(txt);
    toast.success(t.admin.copied);
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 pb-12 pt-4">
      <div className="flex items-baseline justify-between">
        <div className="text-eyebrow text-ink-mute">{t.admin.issueTitle}</div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setManageOpen(true)}
            className="text-eyebrow inline-flex items-center gap-1 text-ink-soft transition-colors hover:text-ink no-print"
          >
            <List className="h-3 w-3" />
            {t.admin.manage}
          </button>
          <div className="text-eyebrow tabular text-ink-mute">
            → {padSerial(issued?.serial ?? initialNextSerial)}
          </div>
        </div>
      </div>

      <PrintableCard issued={issued} hint={t.admin.issueHint} />

      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={issue}
          disabled={pending || batchPending}
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

      {/* Batch issue */}
      <section className="no-print rounded-xl border border-hairline bg-paper/60 p-4">
        <div className="text-eyebrow mb-3 flex items-center gap-1.5 text-ink-mute">
          <Layers className="h-3 w-3" />
          {t.admin.batchTitle}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-ink-mute" htmlFor="batch-count">
            {t.admin.batchCountLabel}
          </label>
          <Input
            id="batch-count"
            type="number"
            min={1}
            max={50}
            value={batchCount}
            onChange={(e) => setBatchCount(Number(e.target.value))}
            className="h-10 w-20 rounded-md border-hairline bg-ivory/40 text-center tabular"
          />
          <Button
            type="button"
            onClick={issueBatch}
            disabled={pending || batchPending}
            className="h-10 flex-1 rounded-full bg-ink text-paper hover:bg-ink/90"
          >
            {batchPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4" />
                {t.admin.batchIssue}
              </>
            )}
          </Button>
        </div>

        {lastBatch.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-eyebrow text-ink-mute">
                {t.admin.manageTotal.replace("{n}", String(lastBatch.length))}
              </span>
              <button
                type="button"
                onClick={copyBatch}
                className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink"
              >
                <Copy className="h-3 w-3" />
                {t.admin.copyAll}
              </button>
            </div>
            <ul className="max-h-56 overflow-y-auto rounded-md border border-hairline bg-paper">
              {lastBatch.map((it) => (
                <li
                  key={it.serial}
                  className="flex items-center justify-between border-b border-hairline px-3 py-2 text-sm last:border-0"
                >
                  <span className="text-display tabular text-ink">
                    {it.serialDisplay}
                  </span>
                  <span className="font-mono text-xs text-ink-soft">
                    {it.magicWord}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {history.length > 0 && (
        <section className="no-print">
          <div className="text-eyebrow mb-3 text-ink-mute">
            {t.admin.recentlyIssued}
          </div>
          <ul className="flex flex-col rounded-lg border border-hairline bg-paper">
            {history.slice(0, 10).map((it) => (
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

      {/* Danger zone */}
      <section className="no-print mt-4 rounded-xl border border-dashed border-red-300/60 bg-red-50/30 p-4">
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
          onClick={() => setResetOpen(true)}
          className="h-10 w-full rounded-full border-red-300/70 bg-paper text-red-700 hover:bg-red-50 hover:text-red-800"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t.admin.resetButton}
        </Button>
      </section>

      <ManageDrawer open={manageOpen} onOpenChange={setManageOpen} />
      {resetOpen && (
        <ResetDialog
          open={resetOpen}
          onOpenChange={setResetOpen}
          initialCount={initialNextSerial - 1}
        />
      )}
    </div>
  );
}

function ResetDialog({
  open,
  onOpenChange,
  initialCount,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialCount: number;
}) {
  const t = useT();
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();

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
      setConfirm("");
      onOpenChange(false);
      // The action revalidates `/admin`, but we also nudge a soft reload
      // so the next-serial counter and stats refresh promptly.
      setTimeout(() => window.location.reload(), 400);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setConfirm("");
        onOpenChange(v);
      }}
    >
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
  );
}

type Filter = "all" | "used" | "unused";

function ManageDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const t = useT();
  const [rows, setRows] = useState<AdminSerialRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  function load() {
    startTransition(async () => {
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
    if (open && rows === null && !pending) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "used" && !r.used) return false;
      if (filter === "unused" && r.used) return false;
      if (q) {
        return (
          r.serialDisplay.includes(q) ||
          r.magicWord.toLowerCase().includes(q) ||
          r.nickname.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rows, filter, query]);

  const totalUsed = rows?.filter((r) => r.used).length ?? 0;
  const totalUnused = (rows?.length ?? 0) - totalUsed;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto flex h-[85vh] max-w-md flex-col gap-0 rounded-t-2xl border-hairline bg-paper p-0"
      >
        {/* Drag indicator */}
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-ink/15" />
        <SheetHeader className="border-b border-hairline px-5 pb-3 pt-3">
          <SheetTitle className="text-display text-xl text-ink">
            {t.admin.manageTitle}
          </SheetTitle>
          <SheetDescription className="text-xs text-ink-mute">
            {t.admin.manageDescription}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 border-b border-hairline px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-mute" />
            <Input
              placeholder={t.admin.searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 rounded-md border-hairline bg-ivory/40 pl-8"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <FilterChip
                active={filter === "all"}
                onClick={() => setFilter("all")}
                label={`${t.admin.filterAll} · ${rows?.length ?? "—"}`}
              />
              <FilterChip
                active={filter === "used"}
                onClick={() => setFilter("used")}
                label={`${t.admin.filterUsed} · ${rows ? totalUsed : "—"}`}
              />
              <FilterChip
                active={filter === "unused"}
                onClick={() => setFilter("unused")}
                label={`${t.admin.filterUnused} · ${rows ? totalUnused : "—"}`}
              />
            </div>
            <button
              type="button"
              onClick={load}
              disabled={pending}
              className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink disabled:opacity-50"
              aria-label={t.admin.manageRefresh}
            >
              <RefreshCw
                className={cn("h-3 w-3", pending && "animate-spin")}
              />
              {t.admin.manageRefresh}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {pending && rows === null ? (
            <div className="flex h-32 items-center justify-center text-sm text-ink-mute">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t.common.loading}
            </div>
          ) : error ? (
            <div className="px-5 py-8 text-center text-sm text-ink-mute">
              {t.admin.manageFailed}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-ink-mute">
              {t.admin.manageEmpty}
            </div>
          ) : (
            <ul className="divide-y divide-hairline">
              {filtered.map((r) => (
                <ManageRow key={r.pageId} row={r} />
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs transition-colors",
        active
          ? "border-ink bg-ink text-paper"
          : "border-hairline text-ink-soft hover:border-ink/50 hover:text-ink"
      )}
    >
      {label}
    </button>
  );
}

function ManageRow({ row }: { row: AdminSerialRow }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  function copyPair() {
    navigator.clipboard.writeText(
      `#${row.serialDisplay} · ${row.magicWord}`
    );
    setCopied(true);
    toast.success(t.admin.copied);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <li className="flex items-center justify-between gap-3 px-5 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-display tabular text-base text-ink">
            {row.serialDisplay}
          </span>
          <span className="font-mono text-xs text-ink-soft">
            {row.magicWord}
          </span>
        </div>
        {row.nickname && (
          <div className="mt-0.5 truncate text-xs text-ink-mute">
            {row.nickname}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide",
            row.used
              ? "border-ink/20 bg-ink/5 text-ink"
              : "border-hairline text-ink-mute"
          )}
        >
          {row.used ? t.admin.used : t.admin.unused}
        </span>
        <button
          type="button"
          onClick={copyPair}
          className="text-ink-mute hover:text-ink"
          aria-label={t.admin.copy}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </li>
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
