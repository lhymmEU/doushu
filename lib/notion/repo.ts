import "server-only";

import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { dataSourceId, notion } from "./client";
import {
  checkbox,
  number,
  richText,
  rowFromPage,
  selectOption,
  titleText,
  type NotionPage,
  type SerialRow,
  type SerialStatus,
} from "./properties";
import { padSerial, TOTAL_GOAL } from "@/lib/format";
import { generateMagicWord, normalizeMagicWord } from "@/lib/words";

import { NICKNAMES_TAG } from "./waitlist";

export const WALL_TAG = "doushu-wall";
export const COUNT_TAG = "doushu-count";
export const PAGE_TAG = (id: string) => `doushu-page-${id}`;

/* ─────────── reads ─────────── */

/**
 * List all rows visible on the public wall. Cached & tagged.
 * Uses Next 16 'use cache' directive.
 */
export async function listWall(): Promise<SerialRow[]> {
  "use cache";
  cacheTag(WALL_TAG);
  cacheLife({ stale: 30, revalidate: 60, expire: 60 * 60 });

  const out: SerialRow[] = [];
  let cursor: string | undefined = undefined;

  do {
    const res = await notion().dataSources.query({
      data_source_id: dataSourceId(),
      filter: {
        and: [
          { property: "Show on Wall", checkbox: { equals: true } },
          { property: "Nickname", rich_text: { is_not_empty: true } },
        ],
      },
      sorts: [{ property: "Issued At", direction: "descending" }],
      page_size: 100,
      start_cursor: cursor,
    });

    for (const r of res.results) {
      out.push(rowFromPage(r as unknown as NotionPage));
    }
    cursor = res.next_cursor ?? undefined;
  } while (cursor);

  return out;
}

/**
 * Counts: total issued (any row) + total on the wall.
 * Tagged separately so we can invalidate independently.
 */
export async function counts(): Promise<{
  issued: number;
  goal: number;
  onWall: number;
}> {
  "use cache";
  cacheTag(COUNT_TAG);
  cacheLife({ stale: 30, revalidate: 60, expire: 60 * 60 });

  let issued = 0;
  let onWall = 0;
  let cursor: string | undefined = undefined;

  do {
    const res = await notion().dataSources.query({
      data_source_id: dataSourceId(),
      page_size: 100,
      start_cursor: cursor,
      sorts: [{ property: "Number", direction: "descending" }],
    });
    for (const r of res.results) {
      const row = rowFromPage(r as unknown as NotionPage);
      issued += 1;
      if (row.showOnWall && row.nickname) onWall += 1;
    }
    cursor = res.next_cursor ?? undefined;
  } while (cursor);

  return { issued, goal: TOTAL_GOAL, onWall };
}

/** Look up the highest serial number, used for issuing the next one. */
export async function highestSerial(): Promise<number> {
  const res = await notion().dataSources.query({
    data_source_id: dataSourceId(),
    sorts: [{ property: "Number", direction: "descending" }],
    page_size: 1,
  });
  if (res.results.length === 0) return 0;
  const top = rowFromPage(res.results[0] as unknown as NotionPage);
  return top.serial;
}

/** Find a row by exact serial + magic word. Used for sign-in. */
export async function findByCredentials(
  serial: number,
  magicWord: string
): Promise<SerialRow | null> {
  const norm = normalizeMagicWord(magicWord);
  const res = await notion().dataSources.query({
    data_source_id: dataSourceId(),
    filter: {
      and: [
        { property: "Number", number: { equals: serial } },
        { property: "Magic Word", rich_text: { equals: norm } },
      ],
    },
    page_size: 1,
  });
  if (res.results.length === 0) return null;
  return rowFromPage(res.results[0] as unknown as NotionPage);
}

/** Lightweight list, not cached — used inside admin only. */
export async function recentlyIssued(limit = 10): Promise<SerialRow[]> {
  const res = await notion().dataSources.query({
    data_source_id: dataSourceId(),
    sorts: [{ property: "Issued At", direction: "descending" }],
    page_size: limit,
  });
  return res.results.map((r) => rowFromPage(r as unknown as NotionPage));
}

/**
 * List every issued row, sorted by serial descending. Used by the admin
 * management drawer. Not cached because admins want fresh data.
 */
export async function listAllSerials(): Promise<SerialRow[]> {
  const out: SerialRow[] = [];
  let cursor: string | undefined = undefined;

  do {
    const res = await notion().dataSources.query({
      data_source_id: dataSourceId(),
      sorts: [{ property: "Number", direction: "descending" }],
      page_size: 100,
      start_cursor: cursor,
    });
    for (const r of res.results) {
      out.push(rowFromPage(r as unknown as NotionPage));
    }
    cursor = res.next_cursor ?? undefined;
  } while (cursor);

  return out;
}

export async function getByPageId(pageId: string): Promise<SerialRow | null> {
  try {
    const page = (await notion().pages.retrieve({ page_id: pageId })) as unknown as NotionPage;
    return rowFromPage(page);
  } catch (e) {
    console.error("[notion] getByPageId failed", e);
    return null;
  }
}

/* ─────────── writes ─────────── */

export type IssuedSerial = {
  serial: number;
  magicWord: string;
  pageId: string;
};

async function createSerialRow(next: number): Promise<IssuedSerial> {
  const magicWord = generateMagicWord();
  const created = await notion().pages.create({
    parent: { type: "data_source_id", data_source_id: dataSourceId() },
    properties: {
      Serial: titleText(padSerial(next)),
      Number: number(next),
      "Magic Word": richText(magicWord),
      Status: selectOption("Issued"),
      "Show on Wall": checkbox(false),
      "Wants Printed Book": checkbox(false),
    },
  });
  return { serial: next, magicWord, pageId: created.id };
}

export async function issueNextSerial(): Promise<IssuedSerial> {
  const top = await highestSerial();
  const next = top + 1;
  if (next > TOTAL_GOAL) {
    throw new Error("All 3000 serials have been issued.");
  }
  const issued = await createSerialRow(next);
  bustCounts();
  return issued;
}

/**
 * Archive every issued row. After this, `highestSerial()` returns 0 and
 * the next issue starts at #0001. Existing pages are not deleted — Notion
 * archives them, so they can be restored manually if needed.
 *
 * Returns the number of rows archived.
 */
export async function resetAllSerials(): Promise<number> {
  const rows = await listAllSerials();
  for (const row of rows) {
    await notion().pages.update({ page_id: row.pageId, archived: true });
  }
  bustWall();
  bustCounts();
  return rows.length;
}

/**
 * Issue `count` serials in one batch. Reads the current top once, then
 * creates rows sequentially (Notion has no bulk-create endpoint). Throws
 * if the batch would overflow the total goal.
 */
export async function issueBatchSerials(
  count: number
): Promise<IssuedSerial[]> {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("Batch count must be a positive integer.");
  }
  const top = await highestSerial();
  if (top + count > TOTAL_GOAL) {
    throw new Error(
      `Only ${TOTAL_GOAL - top} serial(s) remain — cannot issue ${count}.`
    );
  }
  const issued: IssuedSerial[] = [];
  for (let i = 1; i <= count; i++) {
    issued.push(await createSerialRow(top + i));
  }
  bustCounts();
  return issued;
}

export async function regenerateMagicWord(pageId: string): Promise<string> {
  const next = generateMagicWord();
  await notion().pages.update({
    page_id: pageId,
    properties: { "Magic Word": richText(next) },
  });
  return next;
}

export async function saveProfile(
  pageId: string,
  input: {
    nickname: string;
    contact: string;
    wantsPrintedBook: boolean;
    showOnWall: boolean;
  }
): Promise<void> {
  const status: SerialStatus = "Profile Complete";
  await notion().pages.update({
    page_id: pageId,
    properties: {
      Nickname: richText(input.nickname.trim()),
      Contact: richText(input.contact.trim()),
      "Wants Printed Book": checkbox(input.wantsPrintedBook),
      "Show on Wall": checkbox(input.showOnWall),
      Status: selectOption(status),
    },
  });
  bustWall();
  bustCounts();
  // A buyer just claimed/changed a nickname — invalidate the cached
  // uniqueness set so the waitlist sees fresh data on its next check.
  revalidateTag(NICKNAMES_TAG, "max");
}

export async function requestExchange(
  pageId: string,
  address: string
): Promise<void> {
  await notion().pages.update({
    page_id: pageId,
    properties: {
      Address: richText(address.trim()),
      "Wants Printed Book": checkbox(true),
      Status: selectOption("Exchange Requested" as SerialStatus),
    },
  });
  bustWall();
  bustCounts();
}

export async function confirmDelivery(pageId: string): Promise<void> {
  await notion().pages.update({
    page_id: pageId,
    properties: {
      Status: selectOption("Delivered" as SerialStatus),
    },
  });
  bustWall();
  bustCounts();
}

export async function cancelExchange(pageId: string): Promise<void> {
  await notion().pages.update({
    page_id: pageId,
    properties: {
      "Wants Printed Book": checkbox(false),
      Status: selectOption("Profile Complete" as SerialStatus),
    },
  });
  bustWall();
  bustCounts();
}

/* ─────────── cache busting ─────────── */

export function bustWall() {
  revalidateTag(WALL_TAG, "max");
}

export function bustCounts() {
  revalidateTag(COUNT_TAG, "max");
}
