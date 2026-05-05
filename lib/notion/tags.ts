import "server-only";

/**
 * Shared `next/cache` tags used by the Notion read/write helpers.
 *
 * Lives in its own module so both `repo.ts` (serials) and `waitlist.ts`
 * can reference the same constants without importing each other — the two
 * cross-reference each other's writes (a buyer profile save invalidates the
 * waitlist nickname cache; a waitlist join invalidates the buyer wall) and
 * sharing constants here keeps the dependency graph acyclic.
 */

export const WALL_TAG = "doushu-wall";
export const COUNT_TAG = "doushu-count";
export const NICKNAMES_TAG = "doushu-nicknames";
export const PAGE_TAG = (id: string) => `doushu-page-${id}`;
