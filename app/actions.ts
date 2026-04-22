"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  cancelExchange,
  findByCredentials,
  getByPageId,
  issueBatchSerials as repoIssueBatchSerials,
  issueNextSerial as repoIssueNextSerial,
  listAllSerials as repoListAllSerials,
  regenerateMagicWord,
  requestExchange,
  resetAllSerials as repoResetAllSerials,
  saveProfile,
} from "@/lib/notion/repo";
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

export async function issueNextSerialAction(): Promise<
  ActionResult<{ serial: number; serialDisplay: string; magicWord: string }>
> {
  if (!(await readAdmin())) return { ok: false, error: "unauthorized" };
  try {
    const { serial, magicWord } = await repoIssueNextSerial();
    revalidatePath("/admin");
    revalidatePath("/");
    return {
      ok: true,
      data: { serial, serialDisplay: padSerial(serial), magicWord },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "issue_failed" };
  }
}

export async function regenerateMagicWordAction(
  pageId: string
): Promise<ActionResult<{ magicWord: string }>> {
  if (!(await readAdmin())) return { ok: false, error: "unauthorized" };
  const word = await regenerateMagicWord(pageId);
  revalidatePath("/admin");
  return { ok: true, data: { magicWord: word } };
}

const batchIssueSchema = z.object({
  count: z.number().int().min(1).max(50),
});

export type IssuedItem = {
  serial: number;
  serialDisplay: string;
  magicWord: string;
};

export async function issueBatchSerialsAction(
  input: z.infer<typeof batchIssueSchema>
): Promise<ActionResult<{ items: IssuedItem[] }>> {
  if (!(await readAdmin())) return { ok: false, error: "unauthorized" };
  const parsed = batchIssueSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  try {
    const issued = await repoIssueBatchSerials(parsed.data.count);
    revalidatePath("/admin");
    revalidatePath("/");
    return {
      ok: true,
      data: {
        items: issued.map((it) => ({
          serial: it.serial,
          serialDisplay: padSerial(it.serial),
          magicWord: it.magicWord,
        })),
      },
    };
  } catch (e) {
    console.error("[actions] issueBatchSerials failed", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "batch_failed",
    };
  }
}

export type AdminSerialRow = {
  pageId: string;
  serial: number;
  serialDisplay: string;
  magicWord: string;
  status: string;
  used: boolean;
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
 * List every issued serial, with a derived `used` flag. Used by the
 * admin management drawer. A row counts as "used" once it has moved past
 * the freshly-issued state — i.e. the buyer has signed in and saved a
 * profile (status moves off "Issued" or a nickname has been set).
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
          used: r.status !== "Issued" || r.nickname.trim().length > 0,
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
