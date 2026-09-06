# Supabase setup

Four steps. About ten minutes.

## 1. Create the project

[database.new](https://database.new) → new project → pick the region closest to
Rwanda (`eu-central-1` is currently the nearest low-latency option). Save the
database password somewhere safe.

## 2. Run the SQL

Supabase dashboard → **SQL Editor** → paste and run each file **in order**:

| Order | File | What it does |
| --- | --- | --- |
| 1 | `migrations/0001_schema.sql` | Original tables, constraints, triggers |
| 2 | `migrations/0002_rls.sql` | Row Level Security and grants |
| 3 | `migrations/0003_storage.sql` | Storage buckets and their policies |
| 4 | `migrations/0004_pickup_orders.sql` | (Historic — superseded by 0007, which drops the table. Kept so the chain replays.) |
| 5 | `migrations/0005_whatsapp_floating.sql` | Floating WhatsApp button settings |
| 6 | `migrations/0006_gallery_featured.sql` | Gallery `featured` column and ordering |
| 7 | `migrations/0007_macheo_transformation.sql` | Macheo schema: accommodations (rooms + camping), site content, contact messages, 5-state reservations, experiences categories, `stays` bucket; drops the retired pickup-order/offer/testimonial tables |
| 8 | `seed.sql` | Neutral demo content (generated — `npm run seed:generate`) |

`seed.sql` is idempotent — running it twice does not duplicate anything. It
ships deliberately quiet: demo contact details, unpublished accommodation
rows, experience rows without prices, and a menu without prices. Nothing in
the seed should ever be read by a visitor as a real offer — the owners fill
in the facts through the admin dashboard.

## 3. Create the owner account

**Authentication → Users → Add user.** Use a real email and a strong password,
and tick *Auto Confirm User*.

Then allow-list that account. This is the step that actually grants access —
creating the auth user alone does nothing:

```sql
insert into public.admin_users (id, email, role)
select id, email, 'owner' from auth.users where email = 'owner@example.com';
```

> **Turn off public sign-ups.** Authentication → Providers → Email → disable
> *Enable sign ups*. The allow-list already blocks a stranger from changing
> anything, but there is no reason to let them create accounts at all.

## 4. Point the site at it

Copy `.env.example` to `.env.local` and fill in the two values from
**Settings → API**. On Vercel, add the same two variables to the project and
redeploy.

---

## Verifying the security model

```bash
npm run db:test
```

This boots a real Postgres in-process, applies these exact migration files,
seeds them, then connects as an anonymous visitor, a signed-up non-admin, and
an allow-listed admin, and asserts what each can and cannot do — 63 checks,
including that a visitor cannot read the reservation list, the contact
inbox, or internal notes; cannot self-confirm a reservation; cannot publish
or edit accommodation rows or site content; cannot see unpublished content;
and that the admin may do all of it (including uploads to the `stays`
bucket).

Run it after any change to the SQL.

## The authorization model in one paragraph

Supabase Auth answers *who are you*. It does not answer *may you edit the
site* — with sign-ups enabled, "authenticated" describes any stranger with an
email address. So authorization is a row in `admin_users`, checked by an
`is_admin()` function that every write policy calls. The public may read
published content, submit a reservation request, and send a contact message
(write-only — it can never be read back); that is all. Column-level grants
add what RLS cannot express: a visitor may insert a reservation but may not
choose its `status` or write `admin_notes`.

Reservations are requests, not bookings. Their five states are
`pending → confirmed → completed`, with `declined` and `cancelled` as exits.
No payment happens anywhere in the system and the public copy says so.

There is no service-role key anywhere in the application. The dashboard runs
under the signed-in admin's own session and is subject to exactly the same
policies, so there is one authorization path rather than two.

## Tables after migration 0007

| Table | Public can | Admin can |
| --- | --- | --- |
| `accommodations` | read published rows (rooms *and* camping tents, via `kind`) | full CRUD, upload to `stays` bucket |
| `experiences` | read active rows | full CRUD |
| `gallery_images` | read all | full CRUD, reorder, feature |
| `menu_categories` / `menu_items` | read | full CRUD |
| `reservation_requests` | insert only | read, change status, internal notes |
| `contact_messages` | insert only (write-only) | read, reply offline |
| `site_content` | read | full CRUD (hero copy, about, map, socials…) |
| `business_settings` | read WhatsApp/social/contact fields | full CRUD |
| `hero_media` | read active media | full CRUD |

Retired by 0007: `pickup_orders`, `offers`, `testimonials`.
