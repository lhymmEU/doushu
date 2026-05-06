"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  cancelExchange,
  confirmDelivery,
  findByCredentials,
  getByPageId,
  issueNewSerial,
  listAllSerials as repoListAllSerials,
  markPrintedBookShipped,
  resetAllSerials as repoResetAllSerials,
  saveProfile,
} from "@/lib/notion/repo";
import type { SerialStatus } from "@/lib/notion/status";
import { padSerial, parseSerial } from "@/lib/format";
import {
  checkAdminPassword,
  clearAdminCookie,
  clearBuyerCookie,
  readAdmin,
  readBuyer,
  setAdminCookie,
  setBuyerCookie,
  signAdmin,
  signBuyer,
} from "@/lib/auth/session";
/* ─────────── shared types ─────────── */

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/* ─────────── language ─────────── */

export async function setLang(lang: "zh" | "en"): Promise<void> {
  const { cookies } = await import("next/headers");
  const c = await cookies();
  c.set("lang", lang, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/");
}

/* ─────────── buyer auth ─────────── */

const signInSchema = z.object({
  serial: z.string().min(1),
  magicWord: z.string().min(2),
});

export async function signInAction(
  input: z.infer<typeof signInSchema>
): Promise<ActionResult<{ serial: number; serialDisplay: string }>> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const serialNum = parseSerial(parsed.data.serial);
  if (!serialNum) return { ok: false, error: "invalid_serial" };

  const row = await findByCredentials(serialNum, parsed.data.magicWord);
  if (!row) return { ok: false, error: "not_found" };

  const tok = await signBuyer({ serial: row.serial, pageId: row.pageId });
  await setBuyerCookie(tok);
  revalidatePath("/");
  return {
    ok: true,
    data: { serial: row.serial, serialDisplay: padSerial(row.serial) },
  };
}

export async function signOutAction(): Promise<void> {
  await clearBuyerCookie();
  revalidatePath("/");
}

const profileSchema = z.object({
  nickname: z.string().min(1).max(40),
  contact: z.string().min(1).max(120),
  wantsPrintedBook: z.boolean(),
  showOnWall: z.boolean(),
  address: z.string().max(400),
});

export async function saveProfileAction(
  input: z.infer<typeof profileSchema>
): Promise<ActionResult> {
  const session = await readBuyer();
  if (!session) return { ok: false, error: "not_signed_in" };

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  try {
    await saveProfile(session.pageId, parsed.data);
  } catch (e) {
    if (e instanceof Error && e.message === "address_required") {
      return { ok: false, error: "address_required" };
    }
    console.error("[actions] saveProfile failed", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "save_failed",
    };
  }
  revalidatePath("/");
  return { ok: true, data: undefined };
}

export async function confirmDeliveryAction(): Promise<ActionResult> {
  const session = await readBuyer();
  if (!session) return { ok: false, error: "not_signed_in" };

  // Only allow confirming when the admin has actually marked the row as
  // shipped — guards against stale UI state on the client.
  const row = await getByPageId(session.pageId);
  if (!row) return { ok: false, error: "not_found" };
  if (row.status !== "Shipped") {
    return { ok: false, error: "not_shipped_yet" };
  }

  try {
    await confirmDelivery(session.pageId);
  } catch (e) {
    console.error("[actions] confirmDelivery failed", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "confirm_failed",
    };
  }
  revalidatePath("/");
  return { ok: true, data: undefined };
}

export async function cancelExchangeAction(): Promise<ActionResult> {
  const session = await readBuyer();
  if (!session) return { ok: false, error: "not_signed_in" };
  try {
    await cancelExchange(session.pageId);
  } catch (e) {
    console.error("[actions] cancelExchange failed", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "cancel_failed",
    };
  }
  revalidatePath("/");
  return { ok: true, data: undefined };
}

const markPrintedBookShippedSchema = z.object({
  pageId: z.string().min(1),
});

/**
 * Admin: mark the trade-up printed book as shipped. Buyer must have
 * status `Exchange Requested`. Final `Delivered` is set when the buyer
 * confirms receipt — not reversible from admin.
 */
export async function markPrintedBookShippedAction(
  input: z.infer<typeof markPrintedBookShippedSchema>
): Promise<ActionResult<void>> {
  if (!(await readAdmin())) return { ok: false, error: "unauthorized" };
  const parsed = markPrintedBookShippedSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  try {
    await markPrintedBookShipped(parsed.data.pageId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "mark_failed";
    console.error("[actions] markPrintedBookShipped failed", e);
    if (msg === "status_locked") {
      return { ok: false, error: "status_locked" };
    }
    if (msg === "not_exchange_requested") {
      return { ok: false, error: "not_exchange_requested" };
    }
    return { ok: false, error: msg };
  }
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true, data: undefined };
}

/** Fetch the current buyer's row, used to populate the My Book sheet. */
export async function getMyBook() {
  const session = await readBuyer();
  if (!session) return null;
  const row = await getByPageId(session.pageId);
  return row;
}

/* ─────────── admin ─────────── */

export async function adminSignInAction(
  password: string
): Promise<ActionResult> {
  if (!checkAdminPassword(password)) {
    return { ok: false, error: "bad_password" };
  }
  const tok = await signAdmin();
  await setAdminCookie(tok);
  revalidatePath("/admin");
  return { ok: true, data: undefined };
}

export async function adminSignOutAction(): Promise<void> {
  await clearAdminCookie();
  revalidatePath("/admin");
}

export type AdminSerialRow = {
  pageId: string;
  serial: number;
  serialDisplay: string;
  magicWord: string;
  status: SerialStatus;
  nickname: string;
  contact: string;
  wantsPrintedBook: boolean;
  issuedAt: string;
};

const resetSchema = z.object({
  // Client must echo back the literal string "RESET" to confirm. This
  // prevents accidental resets from a stray click.
  confirm: z.literal("RESET"),
});

export async function resetSerialsAction(
  input: z.infer<typeof resetSchema>
): Promise<ActionResult<{ archived: number }>> {
  if (!(await readAdmin())) return { ok: false, error: "unauthorized" };
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_confirmation" };

  try {
    const archived = await repoResetAllSerials();
    revalidatePath("/admin");
    revalidatePath("/");
    return { ok: true, data: { archived } };
  } catch (e) {
    console.error("[actions] resetSerials failed", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "reset_failed",
    };
  }
}

/**
 * List every serial row, sorted by serial descending. Powers the admin
 * management list. Not cached — admins want fresh data on every load,
 * and the volume is small (a few thousand rows max).
 */
export async function listAllSerialsAction(): Promise<
  ActionResult<{ rows: AdminSerialRow[] }>
> {
  if (!(await readAdmin())) return { ok: false, error: "unauthorized" };
  try {
    const rows = await repoListAllSerials();
    return {
      ok: true,
      data: {
        rows: rows.map((r) => ({
          pageId: r.pageId,
          serial: r.serial,
          serialDisplay: padSerial(r.serial),
          magicWord: r.magicWord,
          status: r.status,
          nickname: r.nickname,
          contact: r.contact,
          wantsPrintedBook: r.wantsPrintedBook,
          issuedAt: r.issuedAt,
        })),
      },
    };
  } catch (e) {
    console.error("[actions] listAllSerials failed", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "list_failed",
    };
  }
}

/**
 * Admin-only: mint a new serial + magic word so the vendor can hand
 * them to a buyer offline. Returns the freshly issued credentials so
 * the admin UI can render them in a copy-friendly dialog.
 */
export async function issueNewSerialAction(): Promise<
  ActionResult<{
    pageId: string;
    serial: number;
    serialDisplay: string;
    magicWord: string;
  }>
> {
  if (!(await readAdmin())) return { ok: false, error: "unauthorized" };

  try {
    const issued = await issueNewSerial();
    revalidatePath("/admin");
    revalidatePath("/");
    return {
      ok: true,
      data: {
        pageId: issued.pageId,
        serial: issued.serial,
        serialDisplay: padSerial(issued.serial),
        magicWord: issued.magicWord,
      },
    };
  } catch (e) {
    console.error("[actions] issueNewSerial failed", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "issue_failed",
    };
  }
}
