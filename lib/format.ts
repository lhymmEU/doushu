export const TOTAL_GOAL = 3000;

/** Pad a serial number to 4 digits, e.g. 247 → "0247". */
export function padSerial(n: number): string {
  return n.toString().padStart(4, "0");
}

/** Parse a user-typed serial: accept "247", "0247", "#247", trims spaces. */
export function parseSerial(input: string): number | null {
  const cleaned = input.trim().replace(/^#/, "").replace(/^0+/, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isInteger(n) || n < 1 || n > TOTAL_GOAL) return null;
  return n;
}

export function formatRelative(iso: string, lang: "zh" | "en" = "zh"): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return lang === "zh" ? "刚刚" : "just now";
  if (m < 60) return lang === "zh" ? `${m} 分钟前` : `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return lang === "zh" ? `${h} 小时前` : `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 30) return lang === "zh" ? `${days} 天前` : `${days}d ago`;
  return d.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
