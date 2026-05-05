import "server-only";

import { cacheLife, cacheTag, revalidateTag } from "next/cache";

import { dataSourceId, isNotionConfigured, notion } from "./client";
import { rowFromPage, type NotionPage } from "./properties";
import { NICKNAMES_TAG } from "./tags";

export { NICKNAMES_TAG };

/**
 * Trim + lowercase. Uniqueness on the serials DB is enforced
 * case-insensitively, so this normalised form is what we compare.
 */
export function normalizeNickname(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Cached set of every nickname currently held by a serials row
 * (lowercased + trimmed). Returns a sorted array so the cached payload
 * is stable + serialisable. Callers convert to `Set` for O(1) lookups.
 *
 * Since the waitlist DB was retired (waitlist signups now go straight
 * into the serials DB as `Wished` rows), the union is just the serials
 * DB — no second source to merge.
 */
export async function listTakenNicknamesLower(): Promise<string[]> {
  "use cache";
  cacheTag(NICKNAMES_TAG);
  cacheLife({ stale: 30, revalidate: 60, expire: 60 * 60 });

  const taken = new Set<string>();

  if (!isNotionConfigured()) return [];

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
    console.error("[notion] listTakenNicknamesLower failed", err);
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

export function bustNicknames() {
  revalidateTag(NICKNAMES_TAG, "max");
}
