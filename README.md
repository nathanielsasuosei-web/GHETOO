# Young Silence — official streaming & support site

A self-contained platform for Ghanaian artist **Young Silence**: fans stream the music and
videos for free, and support the art by paying **any amount they choose** — Mobile Money
(MTN / Telecel / AirtelTigo) or card. Everything the artist uploads appears on the site
immediately, and every support payment lands in one dashboard.

No third-party CMS, no label, no gatekeepers. One Node process + a JSON file.

---

## What's inside

**Public site**

- Cinematic home page: hero, featured release, catalogue, videos, upcoming shows, merch,
  supporter wall, bio
- `/music` — full catalogue with streaming player, "support from GH₵ X" and per-track
  **lyrics** in a pop-up viewer
- `/videos` — uploaded MP4s or YouTube/Vimeo links in a lightbox player
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

- Password-protected dashboard (default `youngsilence` — change it!)
- Upload releases (MP3/WAV/M4A/FLAC + cover art) with per-release minimum price,
  draft/live toggle, free-streaming toggle, homepage spotlight and **lyrics editor**
- Upload videos or paste a hosted link, with thumbnails and drafts
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

### Changing the homepage hero

Go to **Studio → Website**. Pick a wide photo (2000px+ across is ideal), upload it, and the
live preview updates before you commit. Use the framing buttons to choose whether the photo
sits left, centre or right — the hero text always occupies the left of the frame. Uploads are
limited to 18 MB of JPG/PNG/WebP, land in `data/uploads/site/`, and replacing a photo deletes
the old upload (the bundled `/media` artwork is never touched). "Use original" restores the
image shipped with the site. The hero copy, eyebrow line and announcement bar are edited in
the same tab.

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
  pages/         Home, Music, Videos, Events, Merch, Support, About, ThankYou, Studio
  studio/        Dashboard tabs (Overview, Releases, Videos, Events, Merch, Supporters,
                 Messages, Newsletter, Settings, Website)
  components/    Header, Footer, Player, SupportModal, MerchModal, LyricsModal,
                 TrackRow, VideoSection, EventsSection, MerchSection, Newsletter, …
  context/       Site, Player, Support and Toast providers
scripts/         Demo media generator
public/media/    Bundled artwork, audio and video (served at /media/…)
```

### Data collections

Everything still lives in one `data/db.json`: `settings`, `tracks`, `videos`, `orders`
(music support), `events`, `products`, `merchOrders` and `subscribers`. Merch orders are
kept separate from support orders so fundraising stats never include shop revenue, and
both share the same `YS-XXXXXX` references and MoMo/card confirmation flow.

## Deploying

Any Node host works (Render, Railway, Fly, a VPS). Build, then run `node server/index.js`
behind HTTPS — required for card payments and for a professional look. Make sure
`DATA_DIR` is on persistent storage, otherwise uploads and orders are lost on redeploy.
Point Paystack's webhook at `https://your-domain/api/payments/webhook`.

---

Built for Young Silence · Accra, Ghana 🇬🇭
