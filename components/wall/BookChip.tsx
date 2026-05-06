import { Check } from "lucide-react";
import { padSerial } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SerialStatus } from "@/lib/notion/properties";

const COVERS = [
  { bg: "#D6515C", spine: "#A0303B", chain: "#E8B4B8" },
  { bg: "#F0C24A", spine: "#7A5C20", chain: "#C9A24A" },
  { bg: "#5B8DBE", spine: "#2D567C", chain: "#9CB7CC" },
  { bg: "#7AB07C", spine: "#3A6B41", chain: "#A8C9A6" },
  { bg: "#C97FB1", spine: "#7A2E62", chain: "#D9A6C7" },
  { bg: "#E68A4F", spine: "#8C4514", chain: "#E8B997" },
  { bg: "#9A8CB8", spine: "#4F4279", chain: "#C0B5D6" },
];

function coverFor(serial: number) {
  return COVERS[serial % COVERS.length]!;
}

/**
 * One of three visual states the chip can occupy. We collapse the full
 * SerialStatus enum into these because the wall only needs to convey
 * "is the book here yet?".
 */
type Variant = "wished" | "active" | "fulfilled";

function variantFor(status: SerialStatus): Variant {
  // Legacy: `Wished` rows are no longer created by the app; kept for any
  // historical Notion rows or archived DB restores.
  if (status === "Wished") return "wished";
  if (status === "Delivered") return "fulfilled";
  return "active";
}

export function BookChip({
  serial,
  nickname,
  status,
  maskName,
  className,
}: {
  serial: number;
  nickname: string;
  status: SerialStatus;
  /** When true, show **** instead of the nickname (privacy). */
  maskName?: boolean;
  className?: string;
}) {
  const v = variantFor(status);
  const c = coverFor(serial);

  return (
    <div
      className={cn(
        "group relative flex w-full flex-col items-center gap-1.5 transition-transform hover:-translate-y-0.5",
        className
      )}
    >
      <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden>
        <circle
          cx="11"
          cy="2"
          r="1.6"
          fill={v === "wished" ? "currentColor" : c.spine}
          className={v === "wished" ? "text-ink-mute/45" : undefined}
        />
        <path
          d="M 11 3 q 4 6 0 11"
          stroke={v === "wished" ? "currentColor" : c.chain}
          strokeWidth="1.1"
          fill="none"
          strokeDasharray="1.6 2"
          strokeLinecap="round"
          className={v === "wished" ? "text-ink-mute/35" : undefined}
        />
      </svg>

      {v === "wished" ? (
        <div
          className="relative flex h-16 w-12 flex-col items-center justify-end rounded-[3px] border border-dashed border-ink-mute/45 bg-ivory/40 pb-1.5"
          aria-label={`心愿编号 ${padSerial(serial)}`}
        >
          <span className="text-display tabular text-[10px] font-medium leading-none text-ink-mute">
            {padSerial(serial)}
          </span>
        </div>
      ) : (
        <div
          className="relative flex h-16 w-12 flex-col items-center justify-end rounded-[3px] pb-1.5 shadow-[0_2px_6px_rgb(0,0,0,0.08)] transition-shadow group-hover:shadow-[0_4px_12px_rgb(0,0,0,0.14)]"
          style={{ background: c.bg }}
        >
          <span
            className="absolute left-0 top-0 h-full w-[2px] rounded-l-[3px]"
            style={{ background: c.spine }}
          />
          <span
            className="absolute right-[2px] top-[2px] bottom-[2px] w-[2px] rounded-sm"
            style={{ background: "#F4ECDB" }}
          />
          <span className="text-display tabular text-[10px] font-medium leading-none text-white/95">
            {padSerial(serial)}
          </span>
          {v === "fulfilled" && (
            <span
              className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_1px_3px_rgb(0,0,0,0.18)]"
              aria-label="已收到"
              title="已收到"
            >
              <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
            </span>
          )}
        </div>
      )}

      <span className="line-clamp-1 max-w-[64px] text-center text-[10px] tracking-tight text-ink-soft">
        {maskName ? "****" : nickname}
      </span>
    </div>
  );
}
