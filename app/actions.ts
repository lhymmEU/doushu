"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  cancelExchange,
  claimWishedSerial,
  confirmDelivery,
  findByCredentials,
  getByPageId,
  listAllSerials as repoListAllSerials,
  requestExchange,
  resetAllSerials as repoResetAllSerials,
  saveProfile,
  setSerialStatus as repoSetSerialStatus,
} from "@/lib/notion/repo";
import { ALL_SERIAL_STATUSES, type SerialStatus } from "@/lib/notion/status";
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
import { readShipReady, setShipReady } from "@/lib/notion/settings";
import {
  bustNicknames,
  isNicknameTaken,
  normalizeNickname,
} from "@/lib/notion/waitlist";
import { isNotionConfigured } from "@/lib/notion/client";

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
});

export async function saveProfileAction(
  input: z.infer<typeof profileSchema>
): Promise<ActionResult> {
  const session = await readBuyer();
  if (!session) return { ok: false, error: "not_signed_in" };

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  await saveProfile(session.pageId, parsed.data);
  revalidatePath("/");
  return { ok: true, data: undefined };
}

const exchangeSchema = z.object({
  // Chinese addresses can be quite short (e.g. "武汉市..."), so we only
  // require a non-trivial trimmed string and leave the upper bound generous.
  address: z
    .string()
    .trim()
    .min(2, "address_too_short")
    .max(400, "address_too_long"),
});

export async function requestExchangeAction(
  input: z.infer<typeof exchangeSchema>
): Promise<ActionResult> {
  const session = await readBuyer();
  if (!session) return { ok: false, error: "not_signed_in" };

  const parsed = exchangeSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "invalid_input" };
  }

  try {
    await requestExchange(session.pageId, parsed.data.address);
  } catch (e) {
    console.error("[actions] requestExchange failed", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "exchange_failed",
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

const setStatusSchema = z.object({
  pageId: z.string().min(1),
  status: z.enum(ALL_SERIAL_STATUSES),
});

/**
 * Admin-only: move a serial row to a new lifecycle status. The new
 * status is rendered immediately in the manage panel via optimistic
 * update — this action is what makes the change durable.
 */
export async function setSerialStatusAction(
  input: z.infer<typeof setStatusSchema>
): Promise<ActionResult<{ pageId: string; status: SerialStatus }>> {
  if (!(await readAdmin())) return { ok: false, error: "unauthorized" };
  const parsed = setStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  try {
    await repoSetSerialStatus(parsed.data.pageId, parsed.data.status);
    revalidatePath("/admin");
    revalidatePath("/");
    return {
      ok: true,
      data: { pageId: parsed.data.pageId, status: parsed.data.status },
    };
  } catch (e) {
    console.error("[actions] setSerialStatus failed", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "status_update_failed",
    };
  }
}

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

/* ─────────── ship-ready toggle + waitlist ─────────── */

const setReadyToShipSchema = z.object({
  ready: z.boolean(),
  // Client must echo back `true` after the user clicks the confirm dialog.
  // Defense-in-depth in addition to the UI prompt.
  confirm: z.literal(true),
});

export async function setReadyToShipAction(
  input: z.infer<typeof setReadyToShipSchema>
): Promise<ActionResult<{ ready: boolean }>> {
  if (!(await readAdmin())) return { ok: false, error: "unauthorized" };
  const parsed = setReadyToShipSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "unconfirmed" };

  try {
    await setShipReady(parsed.data.ready);
  } catch (e) {
    console.error("[actions] setReadyToShip failed", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "ship_toggle_failed",
    };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true, data: { ready: parsed.data.ready } };
}

export async function getReadyToShipAction(): Promise<
  ActionResult<{ ready: boolean }>
> {
  try {
    const ready = await readShipReady();
    return { ok: true, data: { ready } };
  } catch (e) {
    console.error("[actions] getReadyToShip failed", e);
    return { ok: true, data: { ready: false } };
  }
}

const nicknameSchema = z.object({
  nickname: z.string().trim().min(1, "nickname_required").max(40, "nickname_too_long"),
});

export async function checkNicknameAvailableAction(
  input: z.infer<typeof nicknameSchema>
): Promise<ActionResult<{ available: boolean; nickname: string }>> {
  const parsed = nicknameSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "invalid_input" };
  }

  if (!isNotionConfigured()) {
    return { ok: false, error: "not_configured" };
  }

  try {
    const taken = await isNicknameTaken(parsed.data.nickname);
    return {
      ok: true,
      data: {
        available: !taken,
        nickname: normalizeNickname(parsed.data.nickname),
      },
    };
  } catch (e) {
    console.error("[actions] checkNicknameAvailable failed", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "check_failed",
    };
  }
}

export async function joinWaitlistAction(
  input: z.infer<typeof nicknameSchema>
): Promise<
  ActionResult<{ pageId: string; serial: number; serialDisplay: string }>
> {
  const parsed = nicknameSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "invalid_input" };
  }

  if (!isNotionConfigured()) {
    return { ok: false, error: "not_configured" };
  }

  // Race-safe-enough uniqueness check: this is the cached union (60s
  // staleness window). For a low-traffic publisher project that's fine —
  // the only failure mode is two strangers picking identical nicknames in
  // the same minute, which gives the second person a duplicate row that
  // can be cleaned up manually in Notion. Tightening this would require
  // an indexed "Nickname Lower" property on the serials DB.
  try {
    if (await isNicknameTaken(parsed.data.nickname)) {
      return { ok: false, error: "nickname_taken" };
    }

    const claimed = await claimWishedSerial(parsed.data.nickname);
    // Bust the nickname cache so the next visitor sees this name as taken.
    bustNicknames();
    // Refresh the home page so the new chip shows up on the 心愿墙
    // right after the sheet closes — claimWishedSerial already busted
    // WALL_TAG + COUNT_TAG, but the route itself still needs a re-render.
    revalidatePath("/");
    return {
      ok: true,
      data: {
        pageId: claimed.pageId,
        serial: claimed.serial,
        serialDisplay: padSerial(claimed.serial),
      },
    };
  } catch (e) {
    console.error("[actions] joinWaitlist failed", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "waitlist_failed",
    };
  }
}
