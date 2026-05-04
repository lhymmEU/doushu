import "server-only";

import { cacheLife, cacheTag, revalidateTag } from "next/cache";

import {
  dataSourceId,
  isNotionConfigured,
  isWaitlistConfigured,
  notion,
  waitlistDataSourceId,
} from "./client";
import {
  richText,
  rowFromPage,
  rowFromWaitlistPage,
  titleText,
  type NotionPage,
} from "./properties";

/**
 * Tag for the cached union of taken nicknames (waitlist + serials).
 * Bust this whenever a buyer saves a profile (in repo.ts) or when a new
 * waitlist row is added (here).
 */
export const NICKNAMES_TAG = "doushu-nicknames";

export { isWaitlistConfigured } from "./client";

export function normalizeNickname(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Cached union of every taken nickname (lowercased + trimmed) across the
 * waitlist DB and the existing serials DB. Returns a sorted array so the
 * cached payload is stable + serializable. Callers convert to `Set` for
 * O(1) lookups.
 */
export async function listTakenNicknamesLower(): Promise<string[]> {
  "use cache";
  cacheTag(NICKNAMES_TAG);
  cacheLife({ stale: 30, revalidate: 60, expire: 60 * 60 });

  const taken = new Set<string>();

  if (isWaitlistConfigured()) {
    try {
      let cursor: string | undefined;
      do {
        const res = await notion().dataSources.query({
          data_source_id: waitlistDataSourceId(),
          page_size: 100,
          start_cursor: cursor,
        });
        for (const r of res.results) {
          const row = rowFromWaitlistPage(r as unknown as NotionPage);
          if (row.nicknameLower) taken.add(row.nicknameLower);
        }
        cursor = res.next_cursor ?? undefined;
      } while (cursor);
    } catch (err) {
      console.error("[notion] listTakenNicknamesLower (waitlist) failed", err);
    }
  }

  if (isNotionConfigured()) {
    try {
      let cursor: string | undefined;
      do {
        const res = await notion().dataSources.query({
          data_source_id: dataSourceId(),
          page_size: 100,
          start_cursor: cursor,
        });
        for (const r of res.results) {
          const row = rowFromPage(r as unknown as NotionPage);
          const n = normalizeNickname(row.nickname);
          if (n) taken.add(n);
        }
        cursor = res.next_cursor ?? undefined;
      } while (cursor);
    } catch (err) {
      console.error("[notion] listTakenNicknamesLower (serials) failed", err);
    }
  }

  return Array.from(taken).sort();
}

/**
 * Cached availability check used by the debounced UI. Lookup is O(n) over
 * the (usually small) cached array — fine in practice and avoids hitting
 * Notion on every keystroke.
 */
export async function isNicknameTaken(nickname: string): Promise<boolean> {
  const lower = normalizeNickname(nickname);
  if (!lower) return false;
  const taken = await listTakenNicknamesLower();
  return taken.includes(lower);
}

/**
 * Authoritative, non-cached lookup used right before a write to be
 * race-safe. Only queries the waitlist DB (the serials DB is exhaustively
 * covered by `listTakenNicknamesLower`, and serial nicknames can only be
 * set by signed-in buyers — they don't race with anonymous waitlist
 * joiners in any meaningful way).
 */
async function isNicknameTakenInWaitlistAuthoritative(
  nickname: string
): Promise<boolean> {
  const lower = normalizeNickname(nickname);
  if (!lower) return false;
  const res = await notion().dataSources.query({
    data_source_id: waitlistDataSourceId(),
    filter: { property: "Nickname Lower", rich_text: { equals: lower } },
    page_size: 1,
  });
  return res.results.length > 0;
}

export type WaitlistJoinResult =
  | { ok: true; pageId: string }
  | { ok: false; error: "nickname_taken" | "nickname_required" };

/**
 * Adds a row to the waitlist DB. Re-checks uniqueness (non-cached) right
 * before insert to avoid races with concurrent submissions. Busts the
 * cached nickname set on success.
 */
export async function addToWaitlist(nickname: string): Promise<WaitlistJoinResult> {
  const trimmed = nickname.trim();
  const lower = normalizeNickname(trimmed);
  if (!lower) return { ok: false, error: "nickname_required" };

  if (await isNicknameTakenInWaitlistAuthoritative(trimmed)) {
    return { ok: false, error: "nickname_taken" };
  }

  // Also cross-check against serial nicknames using the cached set so we
  // don't allow an anonymous waitlist row to shadow a buyer's chosen
  // handle. This call hits the cache 99% of the time.
  const cached = await listTakenNicknamesLower();
  if (cached.includes(lower)) {
    return { ok: false, error: "nickname_taken" };
  }

  const created = await notion().pages.create({
    parent: {
      type: "data_source_id",
      data_source_id: waitlistDataSourceId(),
    },
    properties: {
      Nickname: titleText(trimmed),
      "Nickname Lower": richText(lower),
    },
  });
  bustNicknames();
  return { ok: true, pageId: created.id };
}

export function bustNicknames() {
  revalidateTag(NICKNAMES_TAG, "max");
}
