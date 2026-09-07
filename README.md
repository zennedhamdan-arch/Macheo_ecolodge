# Macheo Ecolodge & Camping

Website and management system for **Macheo Ecolodge & Camping**, a lakeside
stay on Lake Kivu in Karongi (Kibuye), Rwanda — rooms, camping tents,
restaurant and bar, and lake experiences under one roof:
**STAY · CAMP · EAT & DRINK · EXPLORE · EXPERIENCE.**

Next.js (App Router) + TypeScript + Supabase. The public site is fully
server-rendered and works with **zero configuration**; Supabase unlocks the
admin dashboard, dynamic content, and the reservation inbox.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

That is all. Without Supabase credentials the site runs in *static mode*:
it serves the committed neutral content in `data/`, shows honest empty
states where dynamic content would go, and tells visitors that live forms
are unavailable. No error pages, no fake data.

To connect a database, follow `supabase/README.md` (create project → run the
seven migrations → run `seed.sql` → create the owner account → set the two
env vars from `.env.example`).

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server (regenerates the logo detection module first) |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run lint` / `npm run typecheck` | Code quality gates |
| `npm run db:test` | **76 checks** against an in-process Postgres (authorization matrix, admin list ordering, storage image types) — run after any SQL change |
| `npm run seed:generate` | Regenerates `supabase/seed.sql` from `data/` (uses `tsx`) |

## Public site

| Route | Purpose |
| --- | --- |
| `/` | Hero, intro, five Discover cards, featured stays, featured experiences, restaurant preview, photo preview, location, final CTA |
| `/stay` · `/stay/[slug]` | Rooms and lodge accommodation (admin-published) |
| `/camping` · `/camping/[slug]` | Camping and tent options (same table, `kind = 'camping'`) |
| `/experiences` · `/experiences/[slug]` | Boat trips, cycling, village walks… filterable by category |
| `/restaurant` | Restaurant & bar with the menu (tabbed, accessible) |
| `/gallery` | Full collection: categories, lightbox, lazy loading, pagination |
| `/about` | The place and the philosophy — admin-editable copy, closing with the map |
| `/contact` | Contact details and the message form |
| `/reservation` | The primary CTA destination — reservation *request* form |
| `/privacy` · `/terms` | Legal pages |

**Location**: the owner-confirmed Google Maps pin lives in `data/macheo.ts`
(`mapEmbedUrl`) and renders in the shared location section on the homepage and
the About page; the footer links to it ("View the map") and to Google Maps
directions. Admin → Site content → *Google Maps embed URL* overrides it, and
leaving that field empty keeps the built-in pin.

Primary CTA everywhere: **PLAN YOUR STAY → /reservation** (never the contact
page). Secondary: **EXPLORE MACHEO**. A floating WhatsApp button appears on
every public page (never in `/admin`) when a number is configured in the
admin — and only then.

### Reservations are requests, not bookings

The form validates dates (no past check-in, check-out after check-in), uses
`[-] n [+]` steppers for adults and children, and submits to
`/api/reservations` under the **anon key**, so database constraints and RLS
do the enforcing. On success the guest sees a reference code (`MCH-XXXXXX`)
and an explicit message: *your request is received, not yet confirmed — no
payment is taken anywhere in this system.* Statuses:
`pending → confirmed → completed`, with `declined` and `cancelled` as exits.

## Admin dashboard (`/admin`)

Sidebar: **Dashboard** (real counts only — no fake analytics),
**Reservations** (search, filter by status, internal notes that never reach
the public), **Accommodation**, **Camping**, **Experiences**,
**Restaurant & Bar**, **Gallery**, **Site content**, **Contact information**,
**Settings**, **Sign out**.

**Newest item first.** Every CRUD screen — rooms, camping, experiences, menu
categories/sections/dishes, gallery photos, social links — lists what was just
created at the TOP, so it can be edited without scrolling past the archive.
The order comes from the database, not from array shuffling in the browser:
lists read `sort_order asc, created_at desc`, and a new row is inserted with
`sort_order = lowest - 1` (`lib/adminSort.ts`), which places it above
everything already there and keeps it there after a reload. The up/down
reorder buttons still work, and renumber the list back to 0…n-1.

Everything the public site shows is editable there: rooms and tents (images,
capacity, beds, amenities, tent details, price, featured/published),
experiences, menu, gallery (upload, caption, alt, category, featured,
reorder), hero media and copy, about text, contact details, WhatsApp number,
socials, footer, map embed URL, and SEO settings.

Sign in at `/admin/login` with the allow-listed owner account — email and
password only. There is no Google/social login, no MFA, no customer accounts,
and no sign-up form anywhere: this is the owner's dashboard, not a member
area. The middleware redirects every `/admin/*` visitor without a session to
the login page, and login refuses (and signs back out) an account that
authenticates but is not on the allow-list — signing in and being authorized
are separate questions.

## Security model (short version)

- Row Level Security on every table; write policies call `is_admin()`,
  which checks the `admin_users` allow-list — not merely "authenticated".
- **No service-role key exists anywhere.** The dashboard runs under the
  admin's own session and the same policies as everyone else.
- Column-level grants: the public can insert a reservation but cannot set
  its `status` or `admin_notes`; contact messages are write-only.
- Uploads go through Postgres Storage policies (`gallery`, `hero`, `menu`,
  `stays` buckets) — only allow-listed admins may write.
- CSP and strict security headers on every response.
- Turnstile on the public forms is **optional** (a demo should be submittable
  out of the box). With no site key configured the check is skipped; once a
  site key is set it is enforced, and a site key without a secret fails
  **closed** rather than trusting an unverified token. Either way the routes
  validate every field server-side and write with the anon key, so RLS and the
  column grants are what actually protect the data.
- The full matrix — anonymous visitor, signed-up intruder, allow-listed
  admin — is asserted by `npm run db:test` (76 checks, in-process Postgres),
  along with the admin list-ordering contract and the image types each
  storage bucket accepts.

### Images

Admin uploads go to Supabase Storage (`gallery`, `menu`, `stays`, `hero`
buckets, admin-only writes) and the row keeps both the public URL and the
object path. JPG, PNG, WebP and AVIF are stored exactly as uploaded — nothing
is converted or re-encoded, and a file whose MIME type the browser left empty
is still recognised from its extension. `images.remotePatterns` in
`next.config.ts` allow-lists `*.supabase.co`, without which `next/image`
refuses to render a remote photo at all; every image on the public site goes
through `components/SiteImage.tsx`, which shows a neutral tile when a file is
missing or fails to load instead of a broken-image glyph and raw alt text.

## Content policy

Nothing in this repository invents services, prices, room inventory, boat
routes, schedules, policies, or company history. Everything the owners have
not confirmed is either admin-editable or explicitly marked as neutral demo
content (see `MENU_STATUS.isPlaceholder`, unpublished seed rows, null
prices). The seed's demo contact details are marked `.example`. When in
doubt, the site shows an honest empty state rather than plausible fiction.

## Architecture notes

- **Fallback pattern** (`lib/content.ts`): every data source tries Supabase
  first and falls back to `data/*.ts` — the public home page never depends
  on a blocking admin/database call.
- `data/macheo.ts` — lodge identity, facilities, address; `data/site.ts` —
  navigation, section copy, SEO defaults; `data/menu.ts` — neutral demo menu.
- Rooms and tents live in one `accommodations` table discriminated by
  `kind`; the admin screens `/admin/accommodation` and `/admin/camping` are
  one shared manager.
- Design system: `--mk-*` tokens in `app/globals.css` (forest / lake / sand
  palette, cream background), typographic wordmark, no logo required (drop
  `public/images/logo.png` in and the build picks it up automatically).
- Mobile-first, accessible: focus-visible states, labelled inputs, semantic
  landmarks, non-colour error cues, reduced-motion support.

## Deployment

Vercel: set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
(plus the Turnstile pair if used), then deploy. Without the vars, Vercel
serves the static mode. See `HANDOFF.md` for the current state of the
codebase.
