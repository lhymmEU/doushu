/**
 * Status enum for serial rows. Lives in its own file (with no
 * `server-only` import) so the admin client component can pull the
 * constant + type without dragging the whole Notion adapter into the
 * browser bundle.
 *
 * Listed in pipeline order — the admin status dropdown renders them in
 * this same order, and the buyer timeline collapses `Wished` into the
 * same first slot as `Issued`.
 */
export const ALL_SERIAL_STATUSES = [
  // Auto-created by a waitlist signup ("我想要"). Has nickname +
  // auto-generated magic word, no contact yet — it's a wish.
  "Wished",
  // Publisher has handed the buyer their physical mini-book and the
  // matching credentials. Buyer hasn't signed in yet.
  "Issued",
  "Profile Complete",
  "Exchange Requested",
  "Shipped",
  "Delivered",
] as const;

export type SerialStatus = (typeof ALL_SERIAL_STATUSES)[number];
