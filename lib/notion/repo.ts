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

import { COUNT_TAG, NICKNAMES_TAG, PAGE_TAG, WALL_TAG } from "./tags";

export { COUNT_TAG, PAGE_TAG, WALL_TAG };

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
 * Counts surfaced on the homepage progress meter and the admin dashboard.
 *
 * - `issued` counts only rows that have actually been distributed (or are in
 *   the distribution pipeline). It excludes `Wished` rows so the
 *   `X / 3000 sold` meter doesn't fill up from people who joined the
 *   waitlist but haven't received a book yet.
 * - `wished` is the count of `Wished` rows — i.e. the live waitlist size.
 * - `onWall` counts every row that the wall renders (any status,
 *   including Wished, as long as Show on Wall + Nickname are set).
 *
 * Tagged separately from the wall so we can invalidate independently.
 */
export async function counts(): Promise<{
  issued: number;
  wished: number;
  goal: number;
  onWall: number;
}> {
  "use cache";
  cacheTag(COUNT_TAG);
  cacheLife({ stale: 30, revalidate: 60, expire: 60 * 60 });

  let issued = 0;
  let wished = 0;
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
      if (row.status === "Wished") {
        wished += 1;
      } else {
        issued += 1;
      }
      if (row.showOnWall && row.nickname) onWall += 1;
    }
    cursor = res.next_cursor ?? undefined;
  } while (cursor);

  return { issued, wished, goal: TOTAL_GOAL, onWall };
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

/**
 * Internal helper: create a serials row at the given number.
 *
 * `wish` mode pre-fills the nickname, sets Status to "Wished", and flips
 * `Show on Wall` on so the user appears on the wall the moment they
 * download the QR. `issued` mode keeps the legacy admin-issued shape
 * (no nickname, hidden from wall, Status = "Issued").
 */
async function createSerialRow(
  next: number,
  variant:
    | { kind: "issued" }
    | { kind: "wished"; nickname: string }
): Promise<IssuedSerial> {
  const magicWord = generateMagicWord();
  const parent = {
    type: "data_source_id" as const,
    data_source_id: dataSourceId(),
  };

  // Two distinct create() calls (rather than a unified `properties` object)
  // because Notion's typed index signature widens any `?: undefined` keys
  // into "missing required property" errors when we union the two shapes.
  const created =
    variant.kind === "wished"
      ? await notion().pages.create({
          parent,
          properties: {
            Serial: titleText(padSerial(next)),
            Number: number(next),
            "Magic Word": richText(magicWord),
            "Wants Printed Book": checkbox(false),
            Status: selectOption("Wished"),
            Nickname: richText(variant.nickname),
            "Show on Wall": checkbox(true),
          },
        })
      : await notion().pages.create({
          parent,
          properties: {
            Serial: titleText(padSerial(next)),
            Number: number(next),
            "Magic Word": richText(magicWord),
            "Wants Printed Book": checkbox(false),
            Status: selectOption("Issued"),
            "Show on Wall": checkbox(false),
          },
        });

  return { serial: next, magicWord, pageId: created.id };
}

export async function issueNextSerial(): Promise<IssuedSerial> {
  const top = await highestSerial();
  const next = top + 1;
  // Note: TOTAL_GOAL (3000) is a printing target, not a hard cap. Wishes
  // are uncapped, and admin-issued serials follow the same sequence — so
  // we don't throw when `next` exceeds the goal. The progress meter just
  // tops out visually.
  const issued = await createSerialRow(next, { kind: "issued" });
  bustCounts();
  return issued;
}

/**
 * Reserve the next serial for a waitlist signup. Status starts as
 * `Wished`; the user's nickname is pinned to the row immediately so it
 * appears on the wall. The publisher pulls the magic word from admin
 * later when handing the user their physical book.
 */
export async function claimWishedSerial(
  nickname: string
): Promise<IssuedSerial> {
  const trimmed = nickname.trim();
  if (!trimmed) throw new Error("nickname_required");
  const top = await highestSerial();
  const next = top + 1;
  const issued = await createSerialRow(next, {
    kind: "wished",
    nickname: trimmed,
  });
  bustWall();
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
 * creates rows sequentially (Notion has no bulk-create endpoint). The
 * 3000 target is aspirational, not a hard cap, so we don't refuse a
 * batch that pushes beyond it.
 */
export async function issueBatchSerials(
  count: number
): Promise<IssuedSerial[]> {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("Batch count must be a positive integer.");
  }
  const top = await highestSerial();
  const issued: IssuedSerial[] = [];
  for (let i = 1; i <= count; i++) {
    issued.push(await createSerialRow(top + i, { kind: "issued" }));
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
