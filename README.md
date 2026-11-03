# Young Silence — official streaming & support site

A self-contained platform for Ghanaian artist **Young Silence**: fans can listen on linked
streaming platforms or play available releases on the site, **create a free fan account**, and
support the art at an **artist-set price** — Mobile Money (MTN / Telecel / AirtelTigo) or card.
Fans may give more when the artist allows it. The whole site can wear a switchable **Liquid
Glass** treatment, and the artist can replace the logo, hero, browser icon and *any* picture on
the site at any time. Direct support payments appear in the studio; streaming-platform
royalties are reported separately.

No third-party CMS, no label, no gatekeepers. One Node process + a JSON file.

---

## What's inside

**Public site**

- **V12 interface:** floating glass navigation, an expanding hover/focus **Explore** menu,
  refreshed cards, gradients and responsive mobile navigation
- **Liquid Glass:** refractive translucent panels, specular edges, soft animated caustics and
  glassy buttons. On by default, switchable in **Studio → Appearance** with three intensities
  (Subtle / Balanced / Bold) and a live preview; the setting is stored with the rest of
  `settings`, so every visitor sees the artist's choice
- **Fan accounts:** free sign-up and sign-in from the header or `/account`. Fans get their
  profile, support + merch history, download links, faster checkout (name, email and phone
  prefill) and a place to change their password. Sessions are signed, httpOnly cookies with
  scrypt-hashed passwords — a fan cookie can never open the artist studio
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
- Set the price of direct support in **Settings**: a minimum, one exact price, or curated
  quick-amount buttons
- Upload/replace the **logo**, **browser icon**, **hero**, **portrait** and **every release
  cover, video thumbnail and merch photo** from one **Media** tab, live at any time
- See every registered **fan account** with linked orders and confirmed support in the
  **Fans** tab
- Upload videos or paste a hosted link, with thumbnails, drafts and editable YouTube watch links
- **Events tab** — add shows with date/time, venue, city, price note, ticket link and
  draft/live toggle; past shows are archived automatically
- **Merch tab** — products with photo upload, sizes, price and drafts, plus a separate
  merch-orders inbox where MoMo payments are confirmed (units-sold counters update on
  confirmation, never twice)
- Confirm Mobile Money payments, search by reference/name/email, confirm or cancel
- 30-day support chart, revenue by method, best-performing releases, stream counts,
  merch revenue and newsletter-subscriber stats
- **Newsletter tab** — the subscriber list with one-click **CSV export** and removal
- Messages inbox with reply-by-email links
- **Website tab** — upload/replace the homepage hero photo (with a live preview, framing
  control and "use original" reset), the portrait photo, and the hero copy + announcement bar
- **Appearance tab** — the owner's colour controls: six one-tap presets plus custom accent,
  glow, background, surface and text colours with native pickers and hex entry. Everything
  previews live, shows WCAG contrast grades, and saving restyles the whole public site for
  every visitor (the palette is stored with the rest of `settings`, and the studio also keeps
  a device copy so a lost or not-yet-updated API never silently reverts the owner's colours)
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
| `SESSION_SECRET` | Signing key for studio sessions (auto-generated if unset) |
| `PAYSTACK_SECRET_KEY` | Enables real card payments. Without it, cards run in sandbox. |
| `PORT` | Server port (default `3000`) |
| `DATA_DIR` | Where uploads + `db.json` live (default `./data`) |

### How payments work

Set **Studio → Settings → Minimum support for all art** to an amount from GH₵1 to GH₵50,000.
That one amount drives all direct support (general, songs and videos). Then choose **who
decides how much fans pay**:

| Mode | What fans see |
| --- | --- |
| **Fans choose** (default) | The amount is the minimum. Quick-amount buttons appear and fans can enter any larger amount up to GH₵50,000. |
| **One set price** | Everyone pays exactly that amount — the picker disappears and checkout rejects anything else. |

In **Fans choose** mode the artist can also enter up to six **quick amounts** (e.g. `20, 50, 100, 250`);
leave the field blank for automatic suggestions. Amounts below the minimum are ignored. All of
this is validated server-side, so a crafted checkout cannot bypass the artist's price. Video
cards have a direct-support button. Merchandise prices and royalties from Spotify, Apple Music
or YouTube are separate and are not affected by this setting.

New sites start at GH₵1. For existing databases, the initial global minimum is migrated to
the highest previous per-release minimum, subject to the GH₵50,000 checkout limit, so valid
existing minimums do not silently decrease. The artist can then change the amount in Settings.

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

### Changing the hero, the logo and any picture

**Studio → Website** handles the big brand pieces: the homepage hero (with a live preview and
left/centre/right framing), the portrait, the **logo / brand mark**, the **browser icon
(favicon)**, hero copy and the announcement bar. With no logo uploaded the site draws a
monogram from the artist name; upload a transparent PNG and the header, footer, studio and
browser tab all switch over immediately — no redeploy.

**Studio → Media** lists *every image slot on the site* — hero, portrait, logo, favicon, all
release covers, all video thumbnails and all merch photos — with a preview, a replace button
and a "use original" reset. Any picture can be changed at any time and goes live the instant
the upload finishes.

Uploads are limited to 18 MB of JPG/PNG/WebP/GIF/AVIF (SVG is refused because an SVG favicon
can carry scripts). Site branding lands in `data/uploads/site/`, covers in `covers/`,
thumbnails in `thumbs/` and product photos in `products/`. Replacing a photo deletes the old
upload; the bundled `/media` artwork is never touched. "Use original" restores the bundled
asset (or the monogram for the logo).

### Fan accounts

Fans register with a name, email, phone (optional) and a password of at least 8 characters.
Passwords are hashed with `crypto.scrypt` (random salt per account); the hash never leaves the
server. Sessions are HMAC-signed, httpOnly cookies in a separate `ys_fan` cookie with a `fan`
role, so they are never accepted by `/api/admin`. Logging out or changing a password bumps a
per-account session version, which invalidates copies of an old cookie.

Orders placed while signed in carry a `fanId`, and `/account` lists that fan's support and
merch orders, statuses, references, receipts and active download links. Guest checkout still
works exactly as before. The studio's **Fans** tab lists accounts, linked order counts and
confirmed support, and can delete an account (orders stay in the ledger, just unlinked).

### Liquid Glass

`src/styles-liquidglass.css` keys off `html[data-glass="on"]` and
`html[data-glass-intensity="…"]`, both written by `src/lib/glass.js` from
`/api/site` settings. Turning it off restores the flat V12 surfaces exactly. The palette still
comes from the artist's theme, so glass works with every colour preset. Motion (the caustics
and nav sheen) is disabled for `prefers-reduced-motion`, and browsers without
`backdrop-filter` get an opaque fallback instead of unreadable panels.

### Media

- Uploads go to `data/uploads/{audio,covers,videos,thumbs,products,site}` and are streamed
  with HTTP range support so seeking works in every browser.
- The bundled demo tracks, artwork and videos are original assets generated for this build
  (`scripts/make-demo-media.py`) — replace them with real masters from the studio.
- Files up to 800 MB are accepted. For production at scale, point `DATA_DIR` at a persistent
  volume, or swap the upload middleware for object storage (S3/R2) — the API responses only
  ever expose `/uploads/...` paths, so that is the only join point.

### Data

Everything lives in `data/db.json` (settings, releases, videos, orders, messages) and is
written atomically. Delete the file to reset to demo content. Uploaded files live beside it
in `data/uploads`.

---

## Project layout

```
server/
  index.js       Express API: site data, checkout, streaming, studio endpoints
  db.js          JSON store with debounced atomic writes
  seed.js        Demo profile, releases, videos, events, merch, subscribers, orders
  auth.js        Signed-cookie sessions + login throttling
  media.js       Range-aware media streaming
  payments.js    Paystack client + MoMo network metadata
src/
  pages/         Home, Music, Videos, Events, Merch, Support, About, ThankYou, Account, Studio
  studio/        Dashboard tabs (Overview, Website, Media, Appearance, Releases, Videos,
                 Events, Merch, Supporters, Fans, Messages, Newsletter, Settings)
  components/    Header, Footer, BrandMark, AccountModal, Player, SupportModal, MerchModal,
                 LyricsModal, TrackRow, VideoSection, EventsSection, MerchSection, …
  context/       Site, Fan, Player, Support and Toast providers
  lib/           api, format, streaming, support, pricing, theme, glass
  styles*.css    Base design system, V12 layer, feature UI and Liquid Glass layer
  fans.js        Fan password hashing + signed fan sessions
scripts/         Demo media generator
public/media/    Bundled artwork, audio and video (served at /media/…)
```

### Data collections

Everything still lives in one `data/db.json`: `settings`, `tracks`, `videos`, `orders`
(music support), `events`, `products`, `merchOrders`, `subscribers` and `fans`. Merch orders
are kept separate from support orders so fundraising stats never include shop revenue, and
both share the same `YS-XXXXXX` references and MoMo/card confirmation flow. Fan accounts are
forward-compatible: older databases simply get an empty `fans` array, plus defaults for
`logoImage`, `faviconImage`, `supportMode`, `suggestedAmounts`, `liquidGlass` and
`glassIntensity`.

## Deploying

Any Node host works (Render, Railway, Fly, a VPS). Build, then run `node server/index.js`
behind HTTPS — required for card payments and for a professional look. Make sure
`DATA_DIR` is on persistent storage, otherwise settings (including support minimums and
streaming links), uploads and orders can be lost on restart or redeploy.
Point Paystack's webhook at `https://your-domain/api/payments/webhook`.

---

Built for Young Silence · Accra, Ghana 🇬🇭
