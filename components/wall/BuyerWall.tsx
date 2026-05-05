import { listWall } from "@/lib/notion/repo";
import { isNotionConfigured } from "@/lib/notion/client";
import { getCopy } from "@/lib/server-i18n";
import { BookChip } from "./BookChip";

/**
 * Server component. Reads from the (cached) serials DB and renders one
 * chip per buyer/wisher. The waitlist used to live in a separate Notion
 * DB; it has since been folded into the serials DB so a wishlist signup
 * IS a serial reservation. That removes the duplication where the same
 * person could appear once as a wish and once as a buyer.
 *
 * BookChip handles the per-status visual:
 * - Wished     → outlined ghost card with serial in muted ink
 * - in-pipeline → solid colourful card with serial
 * - Delivered   → solid card + green ✓ badge ("wish fulfilled")
 */
export async function BuyerWall() {
  const t = await getCopy();

  if (!isNotionConfigured()) {
    return (
      <div className="rounded-lg border border-dashed border-hairline bg-paper p-6 text-center text-sm text-ink-mute">
        {t.wall.empty}
      </div>
    );
  }

  let rows: Awaited<ReturnType<typeof listWall>> = [];
  try {
    rows = await listWall();
  } catch (e) {
    console.error("[wall] listWall failed", e);
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-hairline bg-paper p-6 text-center text-sm text-ink-mute">
        {t.wall.empty}
      </div>
    );
  }

  const recent = rows.slice(0, 8);
  const rest = rows.slice(8);

  return (
    <div className="flex flex-col gap-5">
      {recent.length > 0 && (
        <section>
          <div className="text-eyebrow mb-3 px-1 text-ink-mute">
            {t.wall.recent}
          </div>
          <div className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-6">
            {recent.map((r) => (
              <BookChip
                key={r.pageId}
                serial={r.serial}
                nickname={r.nickname}
                status={r.status}
              />
            ))}
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section>
          <div className="hairline mb-4" />
          <div className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-6">
            {rest.map((r) => (
              <BookChip
                key={r.pageId}
                serial={r.serial}
                nickname={r.nickname}
                status={r.status}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
