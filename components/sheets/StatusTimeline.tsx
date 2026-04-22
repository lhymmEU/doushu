"use client";

import { Check, Circle, Truck, PackageCheck, MailCheck, BookHeart } from "lucide-react";
import type { SerialStatus } from "@/lib/notion/properties";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const ORDER: SerialStatus[] = [
  "Issued",
  "Profile Complete",
  "Exchange Requested",
  "Shipping Paid",
  "Shipped",
  "Delivered",
];

export function StatusTimeline({
  status,
  wantsExchange,
}: {
  status: SerialStatus;
  wantsExchange: boolean;
}) {
  const t = useT();

  const labels: Record<SerialStatus, string> = {
    Issued: t.myBook.timeline.issued,
    "Profile Complete": t.myBook.timeline.profileComplete,
    "Exchange Requested": t.myBook.timeline.exchangeRequested,
    "Shipping Paid": t.myBook.timeline.shippingPaid,
    Shipped: t.myBook.timeline.shipped,
    Delivered: t.myBook.timeline.delivered,
  };

  const icons: Record<SerialStatus, React.ReactNode> = {
    Issued: <Circle className="h-3 w-3" />,
    "Profile Complete": <Check className="h-3 w-3" />,
    "Exchange Requested": <BookHeart className="h-3 w-3" />,
    "Shipping Paid": <MailCheck className="h-3 w-3" />,
    Shipped: <Truck className="h-3 w-3" />,
    Delivered: <PackageCheck className="h-3 w-3" />,
  };

  const visible = wantsExchange ? ORDER : ORDER.slice(0, 2);
  const currentIdx = visible.indexOf(status);

  return (
    <ol className="relative ml-2 border-l border-hairline pl-5">
      {visible.map((s, i) => {
        const done = currentIdx >= i;
        const active = currentIdx === i;
        return (
          <li
            key={s}
            className={cn(
              "relative pb-3 last:pb-0",
              done ? "text-ink" : "text-ink-mute"
            )}
          >
            <span
              className={cn(
                "absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full border",
                done
                  ? "border-seal bg-seal text-paper"
                  : "border-hairline bg-paper text-ink-mute"
              )}
            >
              {icons[s]}
            </span>
            <div
              className={cn(
                "text-sm",
                active && "font-medium",
                done ? "" : "opacity-70"
              )}
            >
              {labels[s]}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
