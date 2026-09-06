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
| `npm run db:test` | **63 security checks** against an in-process Postgres — run after any SQL change |
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
| `/about` | The place and the philosophy — admin-editable copy |
| `/contact` | Contact details, map (only when confirmed), message form |
| `/reservation` | The primary CTA destination — reservation *request* form |
| `/privacy` · `/terms` | Legal pages |

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

Everything the public site shows is editable there: rooms and tents (images,
capacity, beds, amenities, tent details, price, featured/published),
experiences, menu, gallery (upload, caption, alt, category, featured,
reorder), hero media and copy, about text, contact details, WhatsApp number,
socials, footer, map embed URL, and SEO settings.

Sign in at `/admin/login` with the allow-listed owner account. The
middleware redirects every `/admin/*` visitor without a session to the
login page, and login refuses authenticated-but-not-allow-listed users.

## Security model (short version)

- Row Level Security on every table; write policies call `is_admin()`,
  which checks the `admin_users` allow-list — not merely "authenticated".
- **No service-role key exists anywhere.** The dashboard runs under the
  admin's own session and the same policies as everyone else.
- Column-level grants: the public can insert a reservation but cannot set
  its `status` or `admin_notes`; contact messages are write-only.
- Uploads go through Postgres Storage policies (`gallery`, `hero`, `menu`,
  `stays` buckets) — only allow-listed admins may write.
- CSP, strict security headers, Turnstile on public forms — fail-closed:
  without Turnstile keys the forms refuse to submit instead of running
  unprotected, and tell the guest exactly that.
- The full matrix — anonymous visitor, signed-up intruder, allow-listed
  admin — is asserted by `npm run db:test` (63 checks, in-process Postgres).

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
