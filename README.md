# 豆书 · Doushu

A mobile-first single-screen pre-sale site for a 3000-copy mini-book co-publishing event in Wuhan. Built with Next.js 16 (App Router + Cache Components), shadcn/ui, Tailwind v4, and **Notion as the database**.

The publisher takes payment offline (WeChat QR), then hands buyers a serial number + a whimsical two-word **magic word**. Buyers come to the site, sign in, complete their profile, and decide whether they want a printed copy mailed from Wuhan.

---

## Features

- 🎴 Single-screen hero with hanging-mini-book SVG, progress meter (`0247 / 3000`), and segmented tabs
- ✨ Passwordless sign-in via **serial + magic word** (e.g. `0247` + `velvet-otter`)
- 🪪 `/admin` panel to walk every row through its lifecycle (Wished → Issued → Shipped → Delivered) — bigger edits (addresses, tracking numbers, typos) still happen directly in Notion
- 🌏 Bilingual: Simplified Chinese (default) + English, switchable via a top-bar toggle
- 🧱 Notion-backed persistence with Next.js 16 `'use cache'` + `cacheTag` and `revalidateTag('max')` for invalidation
- 🎨 Custom luxury-press design system (paper, ink, seal, gold; Cormorant Garamond + Inter)

---

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in the values, see "Environment variables" below
npm run dev
```

Visit `http://localhost:3000` — and `http://localhost:3000/admin` to manage serials.

### Scripts

| Command         | Purpose                                       |
| --------------- | --------------------------------------------- |
| `npm run dev`   | Start the Turbopack dev server                |
| `npm run build` | Production build (Partial Prerender)          |
| `npm run start` | Run the production build                      |
| `npm run lint`  | ESLint                                        |

---

## Environment variables

All variables live in `.env.local` (gitignored). See `.env.example` for the template.

| Variable                  | Required | What it is                                                                                                                                                       |
| ------------------------- | :------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NOTION_TOKEN`            |    ✅    | Internal-integration secret from <https://www.notion.so/profile/integrations>. Format `ntn_...` (or legacy `secret_...`).                                        |
| `NOTION_DATABASE_ID`      |    ✅    | The 32-char ID of the `Doushu Serials` database. Used for documentation; reads/writes go through the data source.                                                |
| `NOTION_DATA_SOURCE_ID`   |    ✅    | The data-source UUID for the same database (Notion 2025-09-03 API). The admin panel and all queries use this.                                                    |
| `NOTION_PARENT_PAGE_ID`   |    ✅    | The 32-char ID of the parent page that holds the database. Lets the admin "Open in Notion" link work.                                                            |
| `NOTION_PARENT_PAGE_URL`  |    ✅    | Full URL of the parent Notion page (`https://www.notion.so/<id>` or your custom slug). Linked from `/admin`.                                                     |
| ~~`NOTION_SETTINGS_DATA_SOURCE_ID`~~ | — | **Deprecated.** No longer read; remove from `.env.local` if present. |
| ~~`NOTION_WAITLIST_DATA_SOURCE_ID`~~ | — | **Deprecated.** Wishlist signups now write into `Doushu Serials` as `Wished` rows, so a separate waitlist database is no longer needed. The variable is no longer read; you can remove it from `.env.local`. |
| `ADMIN_PASSWORD`          |    ✅    | Password gating `/admin`. Pick something long. Hashed in transit, compared with `timingSafeEqual`.                                                               |
| `SESSION_SECRET`          |    ✅    | 32+ random bytes used to HMAC-sign buyer + admin cookies (JOSE HS256). Generate with `openssl rand -base64 32`.                                                  |

> ℹ️ When the Notion variables are missing, the homepage still renders with `0 / 3000` and the wall shows an empty-state. This is intentional so previews don't crash before configuration.

---

## One-time Notion setup

You only do this once. Walk-through:

### 1. Create a Notion integration

1. Go to <https://www.notion.so/profile/integrations> → **New integration**.
2. Name it `Doushu`. Workspace = the workspace that should own the data.
3. Capabilities: **Read content**, **Update content**, **Insert content**.
4. Copy the **Internal Integration Token** → this is your `NOTION_TOKEN`.

### 2. Create the parent page

In Notion, create a top-level page called `Doushu · 豆书` (or whatever you like). Copy its URL — you'll get the page ID from the URL.

- A URL like `https://www.notion.so/doushu-3499b256b6b081b78ba6f3135ab7862b` →
  - `NOTION_PARENT_PAGE_ID = 3499b256b6b081b78ba6f3135ab7862b`
  - `NOTION_PARENT_PAGE_URL = https://www.notion.so/3499b256b6b081b78ba6f3135ab7862b`

### 3. Connect the integration to that page

Open the page → `···` (top-right) → **Connections** → search **Doushu** → **Confirm**. Without this step the API will 404.

### 4. Create the `Doushu Serials` database

Inside the parent page, add an inline database called **Doushu Serials** with **exactly** these properties (names matter — the code keys off them):

| Property              | Type        | Notes                                                                                  |
| --------------------- | ----------- | -------------------------------------------------------------------------------------- |
| `Serial`              | Title       | Padded string, e.g. `0247`                                                             |
| `Number`              | Number      | The integer serial (used for ordering and lookups)                                     |
| `Magic Word`          | Text        | Two-word phrase like `velvet-otter`                                                    |
| `Nickname`            | Text        | Set by the buyer                                                                       |
| `Contact`             | Text        | WeChat / phone / email                                                                 |
| `Address`             | Text        | Optional, for printed-book exchange                                                    |
| `Wants Printed Book`  | Checkbox    |                                                                                        |
| `Show on Wall`        | Checkbox    | Buyer toggles this in `MyBookSheet`                                                    |
| `Status`              | Select      | Options: `Wished`, `Issued`, `Profile Complete`, `Exchange Requested`, `Shipped`, `Delivered`, `Cancelled`. Every row enters as `Wished` via the `我想要` QR drawer; the publisher advances it through the pipeline from `/admin` (or directly in Notion). Postage is collected on delivery; the buyer self-confirms receipt to move `Shipped` → `Delivered`. |
| `Issued At`           | Created time |                                                                                        |
| `Updated At`          | Last edited time |                                                                                    |

### 5. Get the database & data-source IDs

Open the database as a full page. URL looks like `https://www.notion.so/<workspace>/<DB_ID>?v=<view>`. The 32-char hex chunk before the `?` is `NOTION_DATABASE_ID`.

To get `NOTION_DATA_SOURCE_ID` (Notion's 2025-09-03 API split databases into one or more "data sources"), call:

```bash
curl https://api.notion.com/v1/databases/$NOTION_DATABASE_ID \
  -H "Authorization: Bearer $NOTION_TOKEN" \
  -H "Notion-Version: 2025-09-03" | jq '.data_sources[0].id'
```

Or, easier: in the Notion **MCP** plugin, the database response includes `data_sources[].id`. Paste that UUID in.

### 6. Historical note: settings & waitlist databases

The **`Doushu Settings`** database and **`NOTION_SETTINGS_DATA_SOURCE_ID`** env var are **deprecated** — they powered an old admin “ready to ship” toggle. The homepage now always offers both 「我想要」 (waitlist QR) and 「我有一本」 (sign-in).

> **Where did `Doushu Waitlist` go?** It used to be a separate database for the `我想要` drawer, but waitlist signups now write into `Doushu Serials` directly as `Wished` rows. Nickname uniqueness, the wall, and the lifecycle all flow through the single serials DB. If you have an old `Doushu Waitlist` database lying around, you can archive it — the code no longer reads from it.

### 7. Generate `SESSION_SECRET` and pick `ADMIN_PASSWORD`

```bash
openssl rand -base64 32        # → SESSION_SECRET
```

Choose a long random string for `ADMIN_PASSWORD`.

### 8. Done — restart `next dev`

The homepage will show real counts; `/admin` will list every row and let you walk it through the lifecycle.

---

## Day-to-day workflow for the publisher

Every row enters `Doushu Serials` the same way: someone taps `我想要` on the homepage and reserves a wish.

1. **Wish.** Visitor opens the site, taps `我想要`, types a nickname, taps `保存二维码`.
   - The action auto-issues the next serial, generates a magic word, and writes a row with `Status = Wished`, `Nickname = <them>`, `Show on Wall = true`.
   - Their chip appears on `心愿墙` immediately as a dashed/ghost book showing the reserved serial.
   - The QR code downloads and the toast confirms `已加入心愿墙 · 编号 0042 · 二维码已开始下载`.
2. **Hand-off.** When you deliver a physical mini-book to that person:
   - Open `/admin`, find their row in the paginated list, read off the serial + magic word, write them on the inside cover.
   - Flip the row's status from `Wished` → `Issued`. The wall chip flips from ghost to solid.
3. **Sign-in.** They sign in with that pair, fill in contact info — `Status` auto-moves to `Profile Complete`.
4. **Optional printed-book request.** They open `My book`, request the printed edition, type an address — `Status` auto-moves to `Exchange Requested`.
5. **Ship.** When the printed book leaves your hands, advance the row to `Shipped` in `/admin` (one tap on the dropdown).
6. **Receipt.** The buyer taps **Confirm receipt** in `My book` and the row becomes `Delivered` — their wall chip gains a green ✓ ("wish fulfilled"). You can also force this from `/admin` if a buyer never confirms.

Larger fixes (typos in addresses, manual tracking numbers, archiving spam rows) still happen directly in Notion. The site picks up Notion-side edits within ~60s thanks to `cacheLife({ revalidate: 60 })`, or instantly if a server action triggers a revalidation.

**Wall states recap:**

- `Wished` → outlined dashed book chip with serial in muted ink. Reads as "reserved, not delivered yet".
- `Issued` / `Profile Complete` / `Exchange Requested` / `Shipped` → solid colourful book chip with serial. Book is in the pipeline.
- `Delivered` → solid book chip with a green ✓ in the corner. Wish fulfilled.

> **Note on the 3000 cap.** It's a printing target, not a hard cap. Wishes just call `highestSerial() + 1`, so the next serial keeps incrementing — you can have more than 3000 wishes on the wall, and the meter visually tops out at the goal.

---

## Architecture notes

- **`app/`** — `page.tsx` (single-screen hero), `admin/page.tsx` (manage serials), `actions.ts` (all server actions, Zod-validated).
- **`components/hero/`** — `HeroShell` (client), `BookStack` (animated SVG), `ProgressMeter`, `SegmentedTabs`, `TopBar`.
- **`components/sheets/`** — `SignInSheet`, `MyBookSheet`, `WaitlistSheet`, `InfoPanels`, `StatusTimeline`. Bottom sheets keep the experience single-screen on mobile.
- **`components/wall/`** — server-rendered `BuyerWall` + `BookChip` (wished / active / fulfilled variants).
- **`components/admin/`** — `AdminLogin`, `ManagePanel` (paginated 5-per-page status manager + reset danger zone).
- **`components/system/`** — `LangShell` + `LangSync` so the cookie-based language read can sit inside a `<Suspense>` boundary required by `cacheComponents`.
- **`lib/notion/`** — `client.ts` (singleton), `properties.ts` (page ↔ row adapter), `repo.ts` (cached reads via `'use cache'` + writes that `revalidateTag('max', ...)`), `tags.ts` (shared cache-tag constants), `status.ts`.
- **`lib/auth/session.ts`** — JOSE-signed buyer + admin cookies.
- **`lib/i18n.tsx`** + **`lib/server-i18n.ts`** + **`content/copy.{zh,en}.ts`** — i18n.
- **`lib/words.ts`** — magic word generator (`adj-noun`, ~100×100 combinations, normalized for comparison).

### Caching model

Public reads (`listWall`, `counts`) use the Next.js 16 `'use cache'` directive with `cacheTag` and `cacheLife({ stale: 30, revalidate: 60, expire: 3600 })`. Writes call `revalidateTag('max', WALL_TAG | COUNT_TAG)` to invalidate. This means: zero Notion reads on the hot path, eventual consistency under one minute.

---

## Deployment

The site is **platform-agnostic**. Server actions and `'use cache'` are standard Next.js features, not Vercel-only.

- **Vercel**: zero-config. Add the env vars under Project Settings → Environment Variables.
- **Netlify / Cloudflare Pages**: use their official Next.js adapter. Both support server actions on Next.js 16.
- **Self-hosted (Node)**: `npm run build && npm run start`. Make sure the env vars are present at runtime, not just at build time.
- **Docker**: build with `--target runner` (standard Next.js Dockerfile recipe).

The site should run as a single instance — there's no in-memory state to share, but the cache is per-instance, so multi-instance setups will see each instance independently revalidate.

---

## License

Private. © Doushu Press.
