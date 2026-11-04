# Young Silence — official streaming & support site

A self-contained platform for Ghanaian artist **Young Silence**: fans can create a free
account, listen on linked streaming platforms or play available releases on the site, and
support the art at an **artist-set amount** — Mobile Money (MTN / Telecel / AirtelTigo) or
card. The artist can let fans give more or enforce one exact price. Direct support payments
appear in the studio; streaming-platform royalties are reported separately.

No third-party CMS, no label, no gatekeepers. One Node process + a JSON file.

---

## What's inside

**Public site**

- **Liquid Glass finish:** translucent, refractive surfaces, soft moving colour blooms and
  luminous edges; switch to **Midnight Classic** at any time in Studio → Appearance
- **Artist-controlled font size:** a 90–125% type scale adjusts headings, labels, paragraphs
  and inline text across the public site from Studio → Appearance
- **V12 interface:** floating glass navigation, an expanding hover/focus **Explore** menu,
  refreshed cards, gradients and responsive mobile navigation
- **Fan accounts:** create an account from **Join** or `/account`, save checkout details,
  reopen eligible downloads and see support / merch history. Music stays open to everyone
- Clean page intros and a dedicated 404 screen with separate **Back home** and
  **Listen instead** actions; unknown self-hosted paths return a real HTTP 404
- Cinematic home page: hero, featured release, catalogue, videos, upcoming shows, merch,
  supporter wall, bio
- `/music` — full catalogue with links to Spotify, Apple Music and YouTube when configured,
  on-site playback as a fallback, direct support and per-track **lyrics**
- `/videos` — YouTube watch links when configured, with uploaded MP4s or other hosted videos
  available in a lightbox as a fallback
- `/events` — tour dates split into upcoming and past shows, with venue, city, price note
  and external ticket links; upcoming shows also preview on the home page
- `/merch` — product store with photos, sizes and per-unit prices; checkout reuses the
  MoMo/card payment flow and collects name, phone and delivery location
- `/support` — funding goal, where-the-money-goes breakdown, supporter wall, contact form
- `/about` — the artist's story
- Newsletter signup in the footer of every page (deduplicated, rate-limited)
- Persistent bottom player with seeking, volume, queue and lock-screen controls
- Shareable `/thank-you?ref=…` receipt page with a **download link** for supporters and a
  delivery summary for merch orders

**Artist studio (`/studio`)**

- **V12 command centre:** a compact rail expands on hover or keyboard focus, with a pin
  control to keep it open; quick jump via `/` or `Ctrl/Cmd + K`, alerts, a live status pulse,
  glass panels and a refreshed login screen
- Password-protected dashboard (default `youngsilence` — change it!)
- Add releases with streaming-platform links and/or audio (MP3/WAV/M4A/FLAC + cover art),
  draft/live toggle, on-site streaming toggle, homepage spotlight and **lyrics editor**
- Set one direct-support amount for songs, videos and the artist in **Settings**, then choose
  whether fans may give more or must pay that exact price (enforced server-side)
- Upload videos or paste a hosted link, with thumbnails, drafts and editable YouTube watch links
- **Events tab** — add shows with date/time, venue, city, price note, ticket link and
  draft/live toggle; past shows are archived automatically
- **Merch tab** — products with photo upload, sizes, price and drafts, plus a separate
  merch-orders inbox where MoMo payments are confirmed (units-sold counters update on
  confirmation, never twice)
- Confirm Mobile Money payments, search by reference/name/email, confirm or cancel
- 30-day support chart, revenue by method, best-performing releases, stream counts,
  merch revenue, fan-account count and newsletter-subscriber stats
- **Newsletter tab** — the subscriber list with one-click **CSV export** and removal
- Messages inbox with reply-by-email links
- **Website tab** — upload/replace the homepage hero photo (with a live preview, framing
  control and "use original" reset), the portrait photo, and the hero copy + announcement bar
- **Media tab** — replace the logo, hero and portrait, plus every release cover, video
  thumbnail and product photo, at any time. One grid covers all of them; "Use original"
  restores bundled brand imagery
- **Appearance tab** — choose **Liquid Glass** or **Midnight Classic**, set a 90–125% font
  size with presets or a slider, then use six one-tap colour presets plus custom accent, glow,
  background, surface and text pickers. Everything previews live, shows WCAG contrast grades,
  and saving restyles the whole public site for every visitor (the palette, finish and type
  scale are stored with `settings`, with a device copy so a lost or not-yet-updated API never
  silently reverts the owner's choices)
- Edit the artist profile, bio, payout numbers, goal and socials

---

## Quick start

```bash
npm install
npm run build        # builds the React front end into dist/
npm start            # serves API + site on http://localhost:3000
```

Open <http://localhost:3000>. The studio is at <http://localhost:3000/studio>
(password `youngsilence` unless `ARTIST_PASSWORD` is set).

For front-end development with hot reload, run the API and Vite side by side:

```bash
npm start            # terminal 1 — API on :3000
npm run dev:ui       # terminal 2 — Vite on :5173, proxies /api and /media
```

## Configuration

Copy `.env.example` to `.env` (or set the variables in your host) and restart:

| Variable | Purpose |
| --- | --- |
| `ARTIST_PASSWORD` | Studio password. **Change this before going live.** |
| `SESSION_SECRET` | Signing key for studio and fan sessions (auto-generated if unset) |
| `PAYSTACK_SECRET_KEY` | Enables real card payments. Without it, cards run in sandbox. |
| `PORT` | Server port (default `3000`) |
| `DATA_DIR` | Where uploads + `db.json` live (default `./data`). **In production point this at a persistent volume** — otherwise saved themes, settings and uploads are wiped on every restart or redeploy. |

### How payments work

Set **Studio → Settings → Minimum support for all art** to an amount from GH₵1 to GH₵50,000.
Keep **Let fans give more** on for a minimum with optional larger tips, or turn it off to make
that amount an exact price. The server enforces the same rule for general support, songs and
videos — a modified client cannot pay a different amount. Video cards have a direct-support
button. Merchandise prices and royalties from Spotify, Apple Music or YouTube are separate
and are not affected by this setting.

New sites start at GH₵1 in flexible mode. For existing databases, the initial global amount
is migrated to the highest previous per-release minimum, subject to the GH₵50,000 checkout
limit, so valid existing minimums do not silently decrease. The artist can change the amount
and mode in Settings at any time.

**Mobile Money** — the way most independent Ghanaian artists actually get paid. The fan
picks a network, gets the artist's number and a unique reference (`YS-XXXXXX`), sends the
money themselves, and the support sits as *awaiting confirmation* until the artist marks it
confirmed in the studio. Confirmations are never automatic, so nobody can mark a payment
paid without the artist seeing it.

**Cards** — with `PAYSTACK_SECRET_KEY` set, checkout redirects to Paystack and the order is
confirmed via the callback **and** a signature-verified webhook
(`POST /api/payments/webhook`). Without a key, card checkout is simulated end-to-end and
labelled "sandbox" so the whole flow can be tested.

Set the payout numbers in **Studio → Settings → Payout numbers**.

### Streaming platforms and royalties

1. Release your music through a distributor to services such as Spotify or Apple Music, and
   upload videos to your own YouTube channel. Make sure you have the necessary rights and
   meet each service's monetization and payout requirements.
2. In **Studio → Music**, add a release or select **Add/Edit streaming links** on an existing
   one. Paste the official song or album URLs. An audio upload is optional when a platform
   link is provided; upload audio if you also want to offer a supporter download.
3. In **Studio → Videos**, paste a YouTube video URL as the source or add a YouTube watch link
   to an existing uploaded video. Viewers are sent to YouTube when that link is set. Other
   sources and uploads continue to play on the site when there is no YouTube link.
4. Check your distributor's and YouTube's own dashboards for verified streams, earnings,
   eligibility and payouts. The site's counters cover on-site playback or video opens only;
   they do not count platform streams or calculate royalties. On-site playback does not itself
   generate Spotify/YouTube royalties, and not every platform play necessarily earns money.
   Demo data and sandbox payments are not real earnings.

For music, all configured service links are shown to listeners; primary play buttons use the
first configured service (Spotify, then Apple Music, then YouTube). On-site playback is only
offered for tracks without platform links and an enabled audio file. Platform-only releases
can still receive voluntary support, but do not offer a download unless audio is uploaded.

### Fan accounts

Fans can use **Join** in the header or `/account` to register with a name, email and password.
Passwords are salted with `scrypt` and never returned by the API; sessions use a signed,
`httpOnly`, `SameSite=Lax` cookie. Signing out invalidates old session tokens. Signed-in fans
get their name, email and optional phone prefilled at support and merch checkout. `/account`
shows orders placed while signed in and reopens eligible download links. For privacy, older
orders are never linked to a new account by email alone. Email verification and password reset
are deliberately out of scope for this self-contained build; use a transactional email service
before running a large public community.

### Changing the logo, hero and every picture

Go to **Studio → Media**. Every replaceable image is in one grid: the logo, homepage hero,
portrait, release covers, video thumbnails and product photos. Use a square transparent PNG
or WebP for the logo and a wide 2000px+ image for the hero. Uploads are limited to 18 MB of
JPG/PNG/WebP/GIF and land in the matching `data/uploads/...` directory; replacing a custom
upload deletes the old file while bundled `/media` artwork is never touched. "Use original"
restores the shipped brand image. Public tabs pick up changes when they regain focus, and
visitors see them on their next load.

**Studio → Website** keeps the hero live preview, left / centre / right framing, and homepage
copy, eyebrow line and announcement bar. The uploaded logo appears in the header, footer,
studio login and browser icon.

### Media

- Uploads go to `data/uploads/{audio,covers,videos,thumbs,products,site}` and are streamed
  with HTTP range support so seeking works in every browser.
- The bundled demo tracks, artwork and videos are original assets generated for this build
  (`scripts/make-demo-media.py`) — replace them with real masters from the studio.
- Files up to 800 MB are accepted. For production at scale, point `DATA_DIR` at a persistent
  volume, or swap the upload middleware for object storage (S3/R2) — the API responses only
  ever expose `/uploads/...` paths, so that is the only join point.

### Data

Everything lives in `data/db.json` (settings, fan accounts, releases, videos, orders,
messages) and is written atomically. Delete the file to reset to demo content. Uploaded files
live beside it in `data/uploads`. Keep the database private: it contains hashed fan passwords
and order contact details.

---

## Project layout

```
server/
  index.js       Express API: site data, checkout, streaming, studio endpoints
  db.js          JSON store with debounced atomic writes
  seed.js        Demo profile, releases, videos, events, merch, subscribers, orders
  auth.js        Signed studio sessions + login throttling
  fanAuth.js     Scrypt password hashes and separate fan sessions
  media.js       Range-aware media streaming
  payments.js    Paystack client + MoMo network metadata
src/
  pages/         Home, Music, Videos, Events, Merch, Support, About, Account, ThankYou, Studio
  studio/        Dashboard tabs (Overview, Website, Media, Appearance, Releases, Videos,
                 Events, Merch, Supporters, Messages, Newsletter, Settings)
  components/    Header, Footer, Player, SupportModal, FanAuthModal, MerchModal,
                 BrandLogo, LyricsModal, TrackRow, VideoSection, Newsletter, …
  context/       Site, Fan, Player, Support and Toast providers
  styles*.css    Base design system, V12 layer and Liquid Glass layer
scripts/         Demo media generator
public/media/    Bundled artwork, audio and video (served at /media/…)
```

### Data collections

Everything still lives in one `data/db.json`: `settings`, `fans`, `tracks`, `videos`,
`orders` (music support), `events`, `products`, `merchOrders` and `subscribers`. Merch orders
are kept separate from support orders so fundraising stats never include shop revenue, and
both share the same `YS-XXXXXX` references and MoMo/card confirmation flow. Orders placed
while a fan is signed in carry a private `fanId`; older orders remain unlinked.

## Deploying

Any Node host works (Render, Railway, Fly, a VPS). Build, then run `node server/index.js`
behind HTTPS — required for card payments and for a professional look. Make sure
`DATA_DIR` is on persistent storage, otherwise settings (including support pricing, the
theme, visual finish and streaming links), uploads, fan accounts and orders can be lost on
restart or redeploy.
Point Paystack's webhook at `https://your-domain/api/payments/webhook`.

`render.yaml` is the Render Blueprint for the backend. It pins the service to `main` with
`autoDeploy: true` (a blueprint applied from a feature branch otherwise keeps building that
old branch forever), and mounts a 1 GB persistent disk at `/var/data` with
`DATA_DIR=/var/data`. Render's **free plan cannot attach a disk**, so the Blueprint uses
`plan: starter`; on a VPS/Railway/Fly just mount a volume and set `DATA_DIR` to its path.
`vercel.json` proxies `/api/*` to the Render service and disables CDN caching on API
responses, so a saved palette reaches visitors immediately. Both hosts must deploy the
same commit.

### Publishing colours to every visitor

If **Studio → Appearance** says *"These colours are saved on this device only"*, the front
end is current but the API behind it is not. The studio keeps a device copy
(`ys-theme-v1` in localStorage) so the artist never loses a palette while a stale deploy
catches up — but only a server-side save reaches other visitors.

1. **Check the API build.** Open `https://your-api/api/health`. A current backend answers
   with `themeStorage: true`, a `version`, and storage diagnostics
   (`dataDirConfigured`, `dataDirWritable`, `dataBoots`, `dataSurvivedRestart`). No
   `themeStorage` field means an older build is live. In Render: **Settings → Branch =
   `main`** and **Manual Deploy → Deploy latest commit** (or sync the Blueprint);
   `autoDeploy: true` then keeps it current on every push.
2. **Check persistence.** `dataDirConfigured: false` means the API is writing to `./data`
   on an ephemeral filesystem — every restart resets `db.json` and the theme with it. Add
   the disk from `render.yaml` (or set `DATA_DIR` to any persistent volume) and redeploy.
   `dataBoots` should increase across restarts; if it returns to `1`, the volume is still
   ephemeral.
3. **Publish again.** Back in **Studio → Appearance**, press **Publish colours** (the save
   button stays enabled while a device-only palette exists). A save is only accepted after
   a fresh anonymous `GET /api/site` echoes the palette — an older API returning `200`
   while dropping `theme` can no longer report a false success. Verify in a private
   window: `/api/site` should contain `settings.theme` and `settings.themeUpdatedAt`, and
   the colours should be visible without signing in.

---

Built for Young Silence · Accra, Ghana 🇬🇭
