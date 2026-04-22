"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  cancelExchange,
  findByCredentials,
  getByPageId,
  issueNextSerial as repoIssueNextSerial,
  regenerateMagicWord,
  requestExchange,
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
  address: z.string().min(8).max(400),
});

export async function requestExchangeAction(
  input: z.infer<typeof exchangeSchema>
): Promise<ActionResult> {
  const session = await readBuyer();
  if (!session) return { ok: false, error: "not_signed_in" };

  const parsed = exchangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  await requestExchange(session.pageId, parsed.data.address);
  revalidatePath("/");
  return { ok: true, data: undefined };
}

export async function cancelExchangeAction(): Promise<ActionResult> {
  const session = await readBuyer();
  if (!session) return { ok: false, error: "not_signed_in" };
  await cancelExchange(session.pageId);
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
