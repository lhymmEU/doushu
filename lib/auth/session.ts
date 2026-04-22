import "server-only";

import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

const COOKIE = "doushu_session";
const ADMIN_COOKIE = "doushu_admin";

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "[Doushu] SESSION_SECRET is missing or too short (>= 16 chars)."
    );
  }
  return new TextEncoder().encode(s);
}

export type BuyerSession = {
  serial: number;
  pageId: string;
  iat: number;
};

export async function signBuyer(
  payload: Pick<BuyerSession, "serial" | "pageId">
): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("doushu")
    .setSubject(`buyer:${payload.serial}`)
    .setExpirationTime("180d")
    .sign(secret());
}

export async function readBuyer(): Promise<BuyerSession | null> {
  const c = await cookies();
  const tok = c.get(COOKIE)?.value;
  if (!tok) return null;
  try {
    const { payload } = await jwtVerify(tok, secret(), { issuer: "doushu" });
    return {
      serial: Number(payload.serial),
      pageId: String(payload.pageId),
      iat: Number(payload.iat ?? 0),
    };
  } catch {
    return null;
  }
}

export async function setBuyerCookie(token: string) {
  const c = await cookies();
  c.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
}

export async function clearBuyerCookie() {
  const c = await cookies();
  c.delete(COOKIE);
}

/* ───────── admin ───────── */

export async function signAdmin(): Promise<string> {
  return await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("doushu")
    .setSubject("admin")
    .setExpirationTime("12h")
    .sign(secret());
}

export async function readAdmin(): Promise<boolean> {
  const c = await cookies();
  const tok = c.get(ADMIN_COOKIE)?.value;
  if (!tok) return false;
  try {
    await jwtVerify(tok, secret(), { issuer: "doushu", subject: "admin" });
    return true;
  } catch {
    return false;
  }
}

export async function setAdminCookie(token: string) {
  const c = await cookies();
  c.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearAdminCookie() {
  const c = await cookies();
  c.delete(ADMIN_COOKIE);
}

export function checkAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  if (password.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ password.charCodeAt(i);
  }
  return mismatch === 0;
}
