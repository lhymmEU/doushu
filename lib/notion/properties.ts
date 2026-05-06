import "server-only";

/**
 * Tiny adapters between Notion property objects and our plain-old TS types.
 * Keeping these here means the rest of the app never has to touch Notion's
 * verbose property shape.
 */

export type NotionPage = {
  id: string;
  properties: Record<string, unknown>;
  created_time?: string;
};

type RichText = { plain_text?: string };

function readRichText(prop: unknown): string {
  if (!prop || typeof prop !== "object") return "";
  const p = prop as { rich_text?: RichText[]; title?: RichText[] };
  const arr = p.rich_text ?? p.title ?? [];
  return arr.map((r) => r.plain_text ?? "").join("");
}

function readNumber(prop: unknown): number | null {
  if (!prop || typeof prop !== "object") return null;
  const v = (prop as { number?: number | null }).number;
  return typeof v === "number" ? v : null;
}

function readCheckbox(prop: unknown): boolean {
  if (!prop || typeof prop !== "object") return false;
  return Boolean((prop as { checkbox?: boolean }).checkbox);
}

function readSelect(prop: unknown): string | null {
  if (!prop || typeof prop !== "object") return null;
  return (prop as { select?: { name?: string } | null }).select?.name ?? null;
}

function readCreatedTime(prop: unknown): string | null {
  if (!prop || typeof prop !== "object") return null;
  return (prop as { created_time?: string }).created_time ?? null;
}

// SerialStatus + ALL_SERIAL_STATUSES live in `./status` so they can be
// imported from client components without dragging this `server-only`
// module into the browser bundle.
export { ALL_SERIAL_STATUSES, type SerialStatus } from "./status";
import type { SerialStatus } from "./status";

export type SerialRow = {
  pageId: string;
  serial: number;
  serialDisplay: string;
  magicWord: string;
  status: SerialStatus;
  nickname: string;
  contact: string;
  wantsPrintedBook: boolean;
  showOnWall: boolean;
  address: string;
  trackingNo: string;
  notes: string;
  issuedAt: string;
};

export function rowFromPage(page: NotionPage): SerialRow {
  const p = page.properties;
  const number = readNumber(p["Number"]) ?? 0;
  const serialDisplay = readRichText(p["Serial"]);
  const issuedAt =
    readCreatedTime(p["Issued At"]) ?? page.created_time ?? new Date().toISOString();

  const rawStatus = readSelect(p["Status"]) ?? "Issued";
  // Legacy rows may still carry the deprecated "Shipping Paid" option; treat
  // them as "Shipped" so the timeline keeps highlighting a valid step.
  const status = (rawStatus === "Shipping Paid" ? "Shipped" : rawStatus) as SerialStatus;

  return {
    pageId: page.id,
    serial: number,
    serialDisplay: serialDisplay || number.toString().padStart(4, "0"),
    magicWord: readRichText(p["Magic Word"]).trim(),
    status,
    nickname: readRichText(p["Nickname"]).trim(),
    contact: readRichText(p["Contact"]).trim(),
    wantsPrintedBook: readCheckbox(p["Wants Printed Book"]),
    showOnWall: readCheckbox(p["Show on Wall"]),
    address: readRichText(p["Address"]).trim(),
    trackingNo: readRichText(p["Tracking No"]).trim(),
    notes: readRichText(p["Notes"]).trim(),
    issuedAt,
  };
}

export function richText(value: string) {
  return { rich_text: [{ type: "text" as const, text: { content: value } }] };
}

export function titleText(value: string) {
  return { title: [{ type: "text" as const, text: { content: value } }] };
}

export function selectOption(name: string) {
  return { select: { name } };
}

export function checkbox(value: boolean) {
  return { checkbox: value };
}

export function number(value: number) {
  return { number: value };
}

