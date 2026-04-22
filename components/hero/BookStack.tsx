import { cn } from "@/lib/utils";

type BookSpec = {
  x: number;
  rotate: number;
  cover: string;
  doodle: "eye" | "smile" | "sun" | "lantern" | "moon" | "flower";
  chain: string;
  pin: string;
  swayClass: string;
};

const BOOKS: BookSpec[] = [
  { x: 28,  rotate: -6, cover: "#D6515C", doodle: "lantern", chain: "#E8B4B8", pin: "#A0303B", swayClass: "animate-sway" },
  { x: 96,  rotate: -2, cover: "#F0C24A", doodle: "sun",     chain: "#C9A24A", pin: "#7A5C20", swayClass: "animate-sway-soft" },
  { x: 168, rotate: 4,  cover: "#5B8DBE", doodle: "eye",     chain: "#9CB7CC", pin: "#2D567C", swayClass: "animate-sway" },
  { x: 240, rotate: -3, cover: "#7AB07C", doodle: "smile",   chain: "#A8C9A6", pin: "#3A6B41", swayClass: "animate-sway-soft" },
  { x: 312, rotate: 5,  cover: "#C97FB1", doodle: "flower",  chain: "#D9A6C7", pin: "#7A2E62", swayClass: "animate-sway" },
];

function Doodle({ kind }: { kind: BookSpec["doodle"] }) {
  switch (kind) {
    case "eye":
      return (
        <g transform="translate(20 26)">
          <ellipse cx="0" cy="0" rx="9" ry="5" fill="white" />
          <circle cx="0" cy="0" r="3" fill="#1a1a1a" />
          <circle cx="-1" cy="-1" r="1" fill="white" />
        </g>
      );
    case "smile":
      return (
        <g transform="translate(20 26)" stroke="white" strokeWidth="1.6" strokeLinecap="round" fill="none">
          <circle cx="0" cy="0" r="9" fill="rgba(255,255,255,0.18)" />
          <circle cx="-3" cy="-2" r="0.8" fill="white" stroke="none" />
          <circle cx="3" cy="-2" r="0.8" fill="white" stroke="none" />
          <path d="M-4 2 q4 4 8 0" />
        </g>
      );
    case "sun":
      return (
        <g transform="translate(20 26)" stroke="white" strokeWidth="1.4" strokeLinecap="round">
          <circle cx="0" cy="0" r="5" fill="white" />
          <g stroke="white">
            <line x1="0" y1="-9" x2="0" y2="-12" />
            <line x1="0" y1="9"  x2="0" y2="12" />
            <line x1="-9" y1="0" x2="-12" y2="0" />
            <line x1="9" y1="0"  x2="12" y2="0" />
            <line x1="-6" y1="-6" x2="-9" y2="-9" />
            <line x1="6" y1="6"   x2="9" y2="9" />
            <line x1="-6" y1="6"  x2="-9" y2="9" />
            <line x1="6" y1="-6"  x2="9" y2="-9" />
          </g>
        </g>
      );
    case "lantern":
      return (
        <g transform="translate(20 26)" stroke="white" strokeWidth="1.4" fill="none">
          <line x1="0" y1="-12" x2="0" y2="-9" />
          <ellipse cx="0" cy="-1" rx="6.5" ry="9" fill="rgba(255,255,255,0.18)" />
          <line x1="-6.5" y1="-1" x2="6.5" y2="-1" />
          <line x1="-2" y1="9" x2="2" y2="9" />
        </g>
      );
    case "moon":
      return (
        <g transform="translate(20 26)" fill="white">
          <path d="M -5 -8 a 9 9 0 1 0 6 16 a 7 7 0 1 1 -6 -16 z" />
        </g>
      );
    case "flower":
      return (
        <g transform="translate(20 26)" fill="white">
          <circle cx="0" cy="-7" r="3.2" />
          <circle cx="6" cy="-2" r="3.2" />
          <circle cx="4" cy="6" r="3.2" />
          <circle cx="-4" cy="6" r="3.2" />
          <circle cx="-6" cy="-2" r="3.2" />
          <circle cx="0" cy="0" r="2.2" fill="#B8884A" />
        </g>
      );
  }
}

function Book({ spec }: { spec: BookSpec }) {
  const w = 40, h = 52;
  return (
    <g transform={`translate(${spec.x} 80)`}>
      {/* ball chain */}
      <g className={spec.swayClass} style={{ transformOrigin: "20px 0px" }}>
        <path
          d={`M 20 0 q 6 22 0 44`}
          stroke={spec.chain}
          strokeWidth="1.4"
          fill="none"
          strokeDasharray="2 2.5"
          strokeLinecap="round"
        />
        <circle cx="20" cy="0" r="3" fill={spec.pin} />
        <g transform={`translate(20 56) rotate(${spec.rotate})`}>
          <g transform={`translate(${-w / 2} 0)`}>
            {/* shadow */}
            <rect x="3" y="4" width={w} height={h} rx="2.5" fill="rgba(0,0,0,0.10)" />
            {/* book back */}
            <rect x="0" y="0" width={w} height={h} rx="2.5" fill={spec.cover} />
            {/* spine */}
            <rect x="0" y="0" width="3" height={h} rx="1" fill="rgba(0,0,0,0.18)" />
            {/* paper edge */}
            <rect x={w - 2} y="2" width="2" height={h - 4} fill="#F4ECDB" />
            {/* doodle */}
            <Doodle kind={spec.doodle} />
            {/* tiny serial bar */}
            <rect x="6" y={h - 10} width={w - 12} height="2" rx="1" fill="rgba(255,255,255,0.55)" />
          </g>
        </g>
      </g>
    </g>
  );
}

/** Hand-drawn cluster of mini-books on ball chains, swaying gently. */
export function BookStack({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 360 200"
      className={cn("w-full h-auto select-none", className)}
      role="img"
      aria-label="A cluster of mini-books on keychains"
    >
      {/* hairline bar — the corkboard rail */}
      <line
        x1="14"
        y1="80"
        x2="346"
        y2="80"
        stroke="var(--gold)"
        strokeOpacity="0.7"
        strokeWidth="0.8"
      />
      <line
        x1="14"
        y1="82"
        x2="346"
        y2="82"
        stroke="var(--ink)"
        strokeOpacity="0.18"
        strokeWidth="0.5"
        strokeDasharray="1 3"
      />
      {BOOKS.map((b, i) => (
        <Book key={i} spec={b} />
      ))}
    </svg>
  );
}
