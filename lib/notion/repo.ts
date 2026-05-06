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

import { COUNT_TAG, PAGE_TAG, WALL_TAG } from "./tags";

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
      // Wall = anyone with a nickname, but not legacy `Wished` rows from
      // the retired online-waitlist flow. Under the offline-issue flow,
      // Wished rows aren't created anymore; this filter keeps any
      // historical ones from showing up.
      filter: {
        and: [
          { property: "Nickname", rich_text: { is_not_empty: true } },
          { property: "Status", select: { does_not_equal: "Wished" } },
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
 * - `issued` counts every row in the distribution pipeline (any status
 *   other than `Wished`). The `X / 3000 sold` meter ticks up the moment
 *   the vendor hands a serial to a buyer.
 * - `wished` counts legacy `Wished` rows from the retired online
 *   waitlist; under the offline-issue flow this trends to zero.
 * - `onWall` counts rows that would appear on the wish wall (non-empty
 *   nickname AND not `Wished`); names may display masked when
 *   Show on Wall is off.
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
        continue;
      }
      issued += 1;
      if (row.nickname) onWall += 1;
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
 * Admin-only: mint the next serial when a vendor hands a buyer their
 * physical mini zine. Status starts at `Issued` with no nickname — the
 * buyer fills that in later by signing in with the credentials and
 * completing their profile.
 *
 * Magic word is generated up front so the vendor has a copy/screenshot
 * to share privately. `TOTAL_GOAL` (3000) is a printing target, not a
 * hard cap — we never refuse to issue.
 */
export async function issueNewSerial(): Promise<IssuedSerial> {
  const top = await highestSerial();
  const next = top + 1;
  const magicWord = generateMagicWord();

  const created = await notion().pages.create({
    parent: {
      type: "data_source_id" as const,
      data_source_id: dataSourceId(),
    },
    properties: {
      Serial: titleText(padSerial(next)),
      Number: number(next),
      "Magic Word": richText(magicWord),
      "Wants Printed Book": checkbox(false),
      Status: selectOption("Issued"),
      Nickname: richText(""),
      "Show on Wall": checkbox(true),
    },
  });

  bustWall();
  bustCounts();
  return { serial: next, magicWord, pageId: created.id };
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
 * Admin-only: the printed (“real”) book has been mailed. Only when the
 * buyer has requested the trade-up (`Exchange Requested`).
 */
export async function markPrintedBookShipped(pageId: string): Promise<void> {
  const row = await getByPageId(pageId);
  if (!row) throw new Error("not_found");
  if (row.status === "Delivered") {
    throw new Error("status_locked");
  }
  if (row.status === "Shipped") {
    return;
  }
  if (row.status !== "Exchange Requested") {
    throw new Error("not_exchange_requested");
  }
  await notion().pages.update({
    page_id: pageId,
    properties: {
      Status: selectOption("Shipped" as SerialStatus),
    },
  });
  bustWall();
  bustCounts();
}

export async function saveProfile(
  pageId: string,
  input: {
    nickname: string;
    contact: string;
    wantsPrintedBook: boolean;
    showOnWall: boolean;
    address: string;
  }
): Promise<void> {
  const row = await getByPageId(pageId);
  if (!row) throw new Error("not_found");

  const nick = input.nickname.trim();
  const contact = input.contact.trim();
  const addrIn = input.address.trim();

  const locked = row.status === "Shipped" || row.status === "Delivered";

  if (locked) {
    await notion().pages.update({
      page_id: pageId,
      properties: {
        Nickname: richText(nick),
        Contact: richText(contact),
        "Show on Wall": checkbox(input.showOnWall),
        ...(addrIn.length >= 2 ? { Address: richText(addrIn) } : {}),
      },
    });
    bustWall();
    bustCounts();
    return;
  }

  const addressToWrite = input.wantsPrintedBook ? addrIn : "";

  if (input.wantsPrintedBook && addressToWrite.length < 2) {
    throw new Error("address_required");
  }

  const nextStatus: SerialStatus = input.wantsPrintedBook
    ? "Exchange Requested"
    : "Profile Complete";

  await notion().pages.update({
    page_id: pageId,
    properties: {
      Nickname: richText(nick),
      Contact: richText(contact),
      "Wants Printed Book": checkbox(input.wantsPrintedBook),
      "Show on Wall": checkbox(input.showOnWall),
      Address: richText(addressToWrite),
      Status: selectOption(nextStatus),
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
  const row = await getByPageId(pageId);
  if (!row) throw new Error("not_found");
  if (row.status === "Shipped" || row.status === "Delivered") {
    throw new Error("exchange_locked");
  }
  await notion().pages.update({
    page_id: pageId,
    properties: {
      "Wants Printed Book": checkbox(false),
      Address: richText(""),
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
