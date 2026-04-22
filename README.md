# 豆书 · Doushu

A mobile-first single-screen pre-sale site for a 3000-copy mini-book co-publishing event in Wuhan. Built with Next.js 16 (App Router + Cache Components), shadcn/ui, Tailwind v4, and **Notion as the database**.

The publisher takes payment offline (WeChat QR), then hands buyers a serial number + a whimsical two-word **magic word**. Buyers come to the site, sign in, complete their profile, and decide whether they want a printed copy mailed from Wuhan.

---

## Features

- 🎴 Single-screen hero with hanging-mini-book SVG, progress meter (`0247 / 3000`), and segmented tabs
- ✨ Passwordless sign-in via **serial + magic word** (e.g. `0247` + `velvet-otter`)
- 🪪 `/admin` panel to issue the next serial — everything else (edit profile, mark shipped, fix typos) is done directly in Notion
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

Visit `http://localhost:3000` — and `http://localhost:3000/admin` to issue serials.

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
| `Status`              | Select      | Options: `Issued`, `Profile Complete`, `Exchange Requested`, `Shipped`, `Delivered`, `Cancelled` (postage is collected on delivery; the buyer self-confirms receipt to move `Shipped` → `Delivered`) |
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

### 6. Generate `SESSION_SECRET` and pick `ADMIN_PASSWORD`

```bash
openssl rand -base64 32        # → SESSION_SECRET
```

Choose a long random string for `ADMIN_PASSWORD`.

### 7. Done — restart `next dev`

The homepage will show real counts; `/admin` will let you issue your first serial.

---

## Day-to-day workflow for the publisher

1. Buyer pays via WeChat (offline).
2. You open `/admin`, click **Issue next serial** → Notion gets a new row, the screen prints a card with serial + magic word. Hand the card to the buyer with their mini-book.
3. Buyer opens the site, signs in with the serial + magic word, and fills in their profile. They can opt in to the public wall and request a printed copy.
4. To mark someone as `Shipped`, edit the row directly in Notion (the in-app admin stays minimal on purpose). The site will pick up the change within ~60s thanks to `cacheLife({ revalidate: 60 })`, or instantly if you trigger a revalidation.

---

## Architecture notes

- **`app/`** — `page.tsx` (single-screen hero), `admin/page.tsx` (issue serials), `actions.ts` (all server actions, Zod-validated).
- **`components/hero/`** — `HeroShell` (client), `BookStack` (animated SVG), `ProgressMeter`, `SegmentedTabs`, `TopBar`.
- **`components/sheets/`** — `SignInSheet`, `MyBookSheet`, `InfoPanels`, `StatusTimeline`. Bottom sheets keep the experience single-screen on mobile.
- **`components/wall/`** — server-rendered `BuyerWall` + `BookChip`.
- **`components/admin/`** — `AdminLogin`, `SerialPanel`.
- **`components/system/`** — `LangShell` + `LangSync` so the cookie-based language read can sit inside a `<Suspense>` boundary required by `cacheComponents`.
- **`lib/notion/`** — `client.ts` (singleton), `properties.ts` (page ↔ row adapter), `repo.ts` (cached reads via `'use cache'`, writes that `revalidateTag('max', ...)`).
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
