import { padSerial } from "@/lib/format";
import { cn } from "@/lib/utils";

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

export function BookChip({
  serial,
  nickname,
  className,
}: {
  serial: number;
  nickname: string;
  className?: string;
}) {
  const c = coverFor(serial);
  return (
    <div
      className={cn(
        "group relative flex w-full flex-col items-center gap-1.5 transition-transform hover:-translate-y-0.5",
        className
      )}
    >
      {/* tiny chain */}
      <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden>
        <circle cx="11" cy="2" r="1.6" fill={c.spine} />
        <path
          d="M 11 3 q 4 6 0 11"
          stroke={c.chain}
          strokeWidth="1.1"
          fill="none"
          strokeDasharray="1.6 2"
          strokeLinecap="round"
        />
      </svg>

      {/* book card */}
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
      </div>

      {/* nickname */}
      <span className="line-clamp-1 max-w-[64px] text-center text-[10px] tracking-tight text-ink-soft">
        {nickname}
      </span>
    </div>
  );
}
