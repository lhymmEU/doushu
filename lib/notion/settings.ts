import "server-only";

import { cacheLife, cacheTag, revalidateTag } from "next/cache";

import { isSettingsConfigured, notion, settingsDataSourceId } from "./client";
import {
  checkbox,
  rowFromSettingsPage,
  titleText,
  type NotionPage,
  type SettingsRow,
} from "./properties";

/**
 * Tag used by the `'use cache'` reads in this module. Bust it from any
 * write path that should be reflected on the public site immediately.
 */
export const SETTINGS_TAG = "doushu-settings";

const SITE_KEY = "site";

async function findSiteRow(): Promise<SettingsRow | null> {
  const res = await notion().dataSources.query({
    data_source_id: settingsDataSourceId(),
    filter: { property: "Key", title: { equals: SITE_KEY } },
    page_size: 1,
  });
  if (res.results.length === 0) return null;
  return rowFromSettingsPage(res.results[0] as unknown as NotionPage);
}

/**
 * Reads the global "ready to ship" flag. Cached + tagged so the homepage
 * stays cheap, but degrades gracefully (returns `false` = not ready) when
 * Notion is unavailable or the env vars are missing.
 */
export async function readShipReady(): Promise<boolean> {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife({ stale: 30, revalidate: 60, expire: 60 * 60 });

  if (!isSettingsConfigured()) return false;
  try {
    const row = await findSiteRow();
    return row?.readyToShip ?? false;
  } catch (err) {
    console.error("[notion] readShipReady failed", err);
    return false;
  }
}

/**
 * Writes the "ready to ship" flag. Upserts the single row keyed by
 * `Key = "site"` and busts the settings cache tag so the homepage and
 * admin reflect the change on the next render.
 */
export async function setShipReady(value: boolean): Promise<void> {
  const row = await findSiteRow();
  if (row) {
    await notion().pages.update({
      page_id: row.pageId,
      properties: { "Ready To Ship": checkbox(value) },
    });
  } else {
    await notion().pages.create({
      parent: {
        type: "data_source_id",
        data_source_id: settingsDataSourceId(),
      },
      properties: {
        Key: titleText(SITE_KEY),
        "Ready To Ship": checkbox(value),
      },
    });
  }
  bustSettings();
}

export function bustSettings() {
  revalidateTag(SETTINGS_TAG, "max");
}
