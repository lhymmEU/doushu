import "server-only";

/**
 * Shared `next/cache` tags used by the Notion read/write helpers.
 */

export const WALL_TAG = "doushu-wall";
export const COUNT_TAG = "doushu-count";
export const PAGE_TAG = (id: string) => `doushu-page-${id}`;
