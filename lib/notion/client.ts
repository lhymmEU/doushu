import "server-only";

import { Client } from "@notionhq/client";

let _client: Client | null = null;

/**
 * Lazy-initialised Notion client. Throws a friendly error if the token
 * isn't configured yet (so the app can still build / show pages that
 * don't need Notion data while you're setting things up).
 */
export function notion(): Client {
  if (_client) return _client;
  const auth = process.env.NOTION_TOKEN;
  if (!auth) {
    throw new Error(
      "[Doushu] NOTION_TOKEN is not set. Create a Notion internal integration, share the Doushu page with it, then put the token in .env.local."
    );
  }
  _client = new Client({ auth });
  return _client;
}

export function dataSourceId(): string {
  const id = process.env.NOTION_DATA_SOURCE_ID;
  if (!id) {
    throw new Error(
      "[Doushu] NOTION_DATA_SOURCE_ID is not set. Run notion-setup or paste the data source ID into .env.local."
    );
  }
  return id;
}

export function settingsDataSourceId(): string {
  const id = process.env.NOTION_SETTINGS_DATA_SOURCE_ID;
  if (!id) {
    throw new Error(
      "[Doushu] NOTION_SETTINGS_DATA_SOURCE_ID is not set. The Doushu Settings database has not been provisioned — see README.md (Settings & Waitlist databases)."
    );
  }
  return id;
}

export function parentPageUrl(): string {
  return process.env.NOTION_PARENT_PAGE_URL ?? "https://www.notion.so";
}

export function isNotionConfigured(): boolean {
  return Boolean(process.env.NOTION_TOKEN && process.env.NOTION_DATA_SOURCE_ID);
}

export function isSettingsConfigured(): boolean {
  return Boolean(process.env.NOTION_TOKEN && process.env.NOTION_SETTINGS_DATA_SOURCE_ID);
}

/**
 * Whether the waitlist (`我想要`) flow can write. Wishes now live in the
 * serials DB, so this is just an alias for the core Notion config —
 * kept for backwards compatibility with callers that still gate on it.
 * `NOTION_WAITLIST_DATA_SOURCE_ID` is no longer read.
 */
export function isWaitlistConfigured(): boolean {
  return isNotionConfigured();
}
