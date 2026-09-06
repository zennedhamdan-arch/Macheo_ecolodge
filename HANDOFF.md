# Handoff — Macheo Ecolodge & Camping

The repository (originally *Traveling Roots*, a lakeside frame-sequence
marketing site) was transformed in place into the website + management
system for **Macheo Ecolodge & Camping**, Karongi/Kibuye, Rwanda. This note
orients the next session.

## What the transformation did

- **Removed, not hidden**: the 29-frame scroll sequence and its assets,
  GSAP and all heavy scroll effects, the pickup-order commerce flow
  (`app/order`, orders API, offers, testimonials), and every trace of
  Traveling Roots branding (verified by a repo-wide grep — the only
  remaining mentions are historical comments in migration files 0001–0003).
- **Migration `0007_macheo_transformation.sql`**: accommodations table
  (`kind` = room | camping, slug trigger, images/amenities arrays, tent
  info, nullable price, featured/available/published), `site_content`
  singleton, write-only `contact_messages`, experience categories, gallery
  category swap to STAY / CAMPING / RESTAURANT & BAR / EXPERIENCES /
  LAKE KIVU / NATURE, reservation status ladder `pending/confirmed/declined/
  cancelled/completed`, `stays` storage bucket, and the drop of
  `pickup_orders` / `offers` / `testimonials` with explicit privilege
  revokes (tables created after migration 0002 otherwise inherit grants —
  this bit us in testing and is covered by a check).
- **Public site**: home (hero → intro → five Discover cards → featured
  stays → featured experiences → restaurant preview → photo preview →
  location → final CTA), `/stay`, `/camping`, `/experiences` (+ slug
  pages), `/restaurant`, `/gallery`, `/about`, `/contact`, `/reservation`,
  privacy/terms. Primary CTA always → `/reservation`.
- **Admin** (`/admin`): dashboard with real counts, reservations manager
  (search/filter/status/notes), shared accommodation/camping manager,
  experiences manager, menu editor, gallery manager (upload/caption/alt/
  category/featured/reorder), site-content manager, contact-info manager
  (+ WhatsApp toggle), settings manager.
- **Security**: `npm run db:test` → **63/63 checks pass** (anonymous
  visitor, signed-up intruder, allow-listed admin matrices against an
  in-process Postgres running all seven migrations + seed).
- **Build**: `next build` clean, 30 routes, First Load JS 104–116 kB.

## How it runs

```bash
npm install
npm run dev            # static mode — no Supabase needed
npm run db:test        # security matrix
npm run seed:generate  # regenerate seed from data/ (uses tsx, Node-20 safe)
```

Static mode behaviour (no env vars): `data/*.ts` fallbacks power every page,
forms show an honest "temporarily unavailable" note, the WhatsApp button and
map embed hide themselves, `/admin*` redirects to `/admin/unavailable`.

With Supabase configured (`.env.local` from `.env.example`), everything is
database-driven. The seed ships quiet on purpose: unpublished accommodation,
null prices, `.example` contacts — nothing a visitor could mistake for a
real offer.

## Where things live

| Concern | File |
| --- | --- |
| Brand, facilities, address | `data/macheo.ts` |
| Nav, sections, SEO defaults | `data/site.ts` |
| Neutral demo menu | `data/menu.ts` (`MENU_STATUS.isPlaceholder`) |
| Content fallback loader | `lib/content.ts` |
| DB types | `lib/supabase/types.ts` |
| Schema change | `supabase/migrations/0007_macheo_transformation.sql` |
| Seed (generated) | `supabase/seed.sql` |
| Security tests | `scripts/test-db.mjs` |
| Design tokens | `app/globals.css` (`--mk-*`) |
| Bundled photos | `public/images/macheo/*.jpg` |

## Known non-issues

- Homepage HTML contains each "Discover →" twice — once in the DOM, once in
  the RSC flight payload. Rendered count is correct.
- `/stay/[slug]` etc. return 404 in static mode because the seed ships
  unpublished; publishing rows in the admin makes them live.
- The logo hook (`scripts/detect-logo.mjs`) intentionally still runs: no
  logo file exists, so the typographic wordmark is used; dropping
  `public/images/logo.png` in later is a zero-code change.

## Rules carried into any future work

Do not invent prices, inventory, routes, schedules, policies, or history —
everything unconfirmed stays admin-editable or null. No payment processing,
ever; the guest copy says requests are not confirmed. The WhatsApp button
never appears inside `/admin`. No fake analytics. Public visitors must not
reach admin data, internal notes, uploads, or admin routes. Run
`npm run db:test` after touching any SQL.
