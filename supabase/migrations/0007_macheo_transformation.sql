-- =============================================================================
-- 0007 — Macheo Ecolodge & Camping transformation
-- =============================================================================
-- Transforms the Traveling Roots restaurant schema into a hospitality
-- (stay + camp + eat + drink + explore) schema:
--
--   * accommodations   — rooms AND camping options (one table, `kind` split)
--   * site_content     — admin-editable copy: hero, intro, about, footer, map
--   * contact_messages — write-only inbox for the public contact form
--   * reservation_requests — extended from a table booking to a stay request
--                        (check-in/out, guests, accommodation preference) with
--                        the Macheo status ladder and a guest reference code
--   * experiences      — gains a category
--   * gallery_items    — categories swapped to the Macheo set
--
-- Restaurant-era tables that have no Macheo equivalent are dropped:
-- pickup_orders (with its pricing trigger), offers, testimonials.
--
-- Migration history is immutable, so this file only ever moves forward:
-- 0001–0006 created the original objects, this one adapts them.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- accommodations — rooms and camping options share one table
-- -----------------------------------------------------------------------------
-- The admin dashboard manages them as two sections (Accommodation / Camping)
-- and the public site as two pages (/stay, /camping), but the shape is
-- identical: a bookable place to sleep with images, capacity and amenities.
-- One table means one well-tested manager component instead of two.

create table if not exists public.accommodations (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('room', 'camping')),
  name        text not null check (length(btrim(name)) between 1 and 120),
  slug        text not null unique,
  tagline     text,
  description text,
  -- Ordered list of public image URLs; the first is the card/lead image.
  images      text[] not null default '{}',
  capacity    smallint check (capacity is null or capacity between 1 and 30),
  beds        text,                              -- e.g. "1 queen bed", "2 single beds"
  amenities   text[] not null default '{}',
  -- Camping-only context: what the tent setup is. NULL for rooms.
  tent_info   text,
  -- Prices are integers in RWF (no minor unit). NULL = "ask when booking":
  -- the business decides what to publish; the site never invents a price.
  price       integer check (price is null or price >= 0),
  available   boolean not null default true,
  featured    boolean not null default false,
  published   boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists accommodations_public_idx
  on public.accommodations (kind, published, sort_order);

-- Admins may leave the slug empty; derive it from the name so the public
-- detail page (/stay/[slug]) always has a stable address.
create or replace function public.accommodations_slug()
returns trigger
language plpgsql
as $$
declare
  candidate text;
begin
  if new.slug is null or length(btrim(new.slug)) = 0 then
    candidate := lower(regexp_replace(btrim(new.name), '[^a-zA-Z0-9]+', '-', 'g'));
    candidate := trim(both '-' from candidate);
    if length(candidate) = 0 then
      raise exception 'accommodation needs a name that can become a slug';
    end if;
    -- Keep slugs unique without failing a same-name re-create after delete.
    if exists (select 1 from public.accommodations where slug = candidate and id <> new.id) then
      candidate := candidate || '-' || substr(new.id::text, 1, 4);
    end if;
    new.slug := candidate;
  end if;
  return new;
end;
$$;

drop trigger if exists accommodations_set_slug on public.accommodations;
create trigger accommodations_set_slug
  before insert or update on public.accommodations
  for each row execute function public.accommodations_slug();

-- -----------------------------------------------------------------------------
-- site_content — editable copy for the pages that are mostly words
-- -----------------------------------------------------------------------------
-- Same singleton pattern as site_settings / business_info: exactly one row,
-- world-readable (the public pages render it), admin-only writable. Fields
-- left empty fall back to the neutral defaults built into the code.

create table if not exists public.site_content (
  id               smallint primary key default 1 check (id = 1),
  hero_title       text,
  hero_subtitle    text,
  intro_heading    text,
  intro_body       text,
  about_story      text,
  about_place      text,
  about_philosophy text,
  about_nature     text,
  about_experience text,
  footer_text      text,
  -- A Google Maps embed URL. Deliberately NULL by default: the map only
  -- appears once the exact official location is confirmed.
  map_embed_url    text,
  updated_at       timestamptz not null default now()
);

insert into public.site_content (id) values (1) on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- contact_messages — write-only inbox
-- -----------------------------------------------------------------------------
-- Identical privacy posture to reservation_requests: anyone may submit,
-- nobody unauthenticated may read back. There is no SELECT policy or grant
-- for anon/authenticated-non-admin.

create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) between 1 and 120),
  email      text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone      text check (phone is null or length(btrim(phone)) between 3 and 40),
  subject    text check (subject is null or length(subject) <= 160),
  message    text not null check (length(btrim(message)) between 1 and 3000),
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_unread_idx
  on public.contact_messages (is_read, created_at desc);

-- -----------------------------------------------------------------------------
-- experiences — categorise for the /experiences page
-- -----------------------------------------------------------------------------

alter table public.experiences
  add column if not exists category text
    constraint experiences_category_check
    check (category is null or category in ('Lake', 'Nature', 'Adventure', 'Local'));

-- -----------------------------------------------------------------------------
-- gallery_items — swap the restaurant categories for the Macheo set
-- -----------------------------------------------------------------------------

alter table public.gallery_items
  drop constraint if exists gallery_items_category_check;

alter table public.gallery_items
  add constraint gallery_items_category_check
  check (
    category is null
    or category in ('Stay', 'Camping', 'Restaurant & Bar', 'Experiences', 'Lake Kivu', 'Nature')
  );

-- -----------------------------------------------------------------------------
-- reservation_requests — from a table booking to a stay request
-- -----------------------------------------------------------------------------
-- New columns are nullable: rows created before this migration keep working,
-- and admin views handle their absence. Every NEW submission fills them in.

alter table public.reservation_requests
  add column if not exists check_in           date,
  add column if not exists check_out          date,
  add column if not exists adults             smallint not null default 2
    check (adults between 1 and 30),
  add column if not exists children           smallint not null default 0
    check (children between 0 and 30),
  add column if not exists accommodation_pref text
    check (accommodation_pref is null or length(accommodation_pref) <= 160),
  add column if not exists camping_pref       text
    check (camping_pref is null or length(camping_pref) <= 160),
  add column if not exists experience_interest text
    check (experience_interest is null or length(experience_interest) <= 160),
  add column if not exists reference_code     text unique;

-- A code is always present. The API generates a nice MCH-XXXXXX and sends it
-- (the column grant allows the insert); the default is the safety net for any
-- other write path.
alter table public.reservation_requests
  alter column reference_code set default
    'MCH-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

-- Carry old rows forward into the new status ladder.
update public.reservation_requests set status = 'pending'   where status in ('new', 'contacted');
update public.reservation_requests set status = 'cancelled' where status = 'archived';

alter table public.reservation_requests
  drop constraint if exists reservation_requests_status_check;

alter table public.reservation_requests
  add constraint reservation_requests_status_check
  check (status in ('pending', 'confirmed', 'declined', 'cancelled', 'completed'));

-- The column DEFAULT still said 'new' in 0001; without this, every insert
-- that omits the status (i.e. all of them — the grant excludes it) fails the
-- new constraint.
alter table public.reservation_requests
  alter column status set default 'pending';

-- Backfill legacy rows so date-driven views have something sane to show.
update public.reservation_requests
   set check_in  = (preferred_at at time zone 'Africa/Kigali')::date,
       check_out = (preferred_at at time zone 'Africa/Kigali')::date + 1
 where check_in is null;

-- -----------------------------------------------------------------------------
-- Drop restaurant-era objects
-- -----------------------------------------------------------------------------

drop table if exists public.pickup_orders;
drop function if exists public.pickup_orders_resolve();
drop table if exists public.offers;
drop table if exists public.testimonials;

-- -----------------------------------------------------------------------------
-- updated_at trigger for the new updatable table
-- -----------------------------------------------------------------------------

drop trigger if exists set_updated_at on public.accommodations;
create trigger set_updated_at before update on public.accommodations
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.site_content;
create trigger set_updated_at before update on public.site_content
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Row Level Security for the new tables
-- =============================================================================
-- Same model as everything else: the public READS published content and
-- WRITES its own requests; only allow-listed admins change anything.

-- Tables created in THIS migration may have inherited broad default grants
-- (0002's `revoke all` only covered tables that existed at the time). Start
-- from nothing again, then hand back exactly what each role needs below.
revoke all on public.accommodations, public.site_content, public.contact_messages
  from anon, authenticated;

alter table public.accommodations   enable row level security;
alter table public.site_content     enable row level security;
alter table public.contact_messages enable row level security;

-- accommodations: public sees published rows only; admins see and write all.
drop policy if exists accommodations_read on public.accommodations;
create policy accommodations_read on public.accommodations
  for select to anon, authenticated using (published);

drop policy if exists accommodations_admin_read on public.accommodations;
create policy accommodations_admin_read on public.accommodations
  for select to authenticated using (public.is_admin());

drop policy if exists accommodations_write on public.accommodations;
create policy accommodations_write on public.accommodations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.accommodations to anon, authenticated;
grant insert, update, delete on public.accommodations to authenticated;

-- site_content: world-readable (it is the public copy), admin-writable.
drop policy if exists site_content_read on public.site_content;
create policy site_content_read on public.site_content
  for select to anon, authenticated using (true);

drop policy if exists site_content_write on public.site_content;
create policy site_content_write on public.site_content
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.site_content to anon, authenticated;
grant insert, update, delete on public.site_content to authenticated;

-- contact_messages: write-only for the public, read/manage for admins.
drop policy if exists contact_messages_insert on public.contact_messages;
create policy contact_messages_insert on public.contact_messages
  for insert to anon, authenticated with check (true);

drop policy if exists contact_messages_admin_read on public.contact_messages;
create policy contact_messages_admin_read on public.contact_messages
  for select to authenticated using (public.is_admin());

drop policy if exists contact_messages_admin_write on public.contact_messages;
create policy contact_messages_admin_write on public.contact_messages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant insert (name, email, phone, subject, message) on public.contact_messages to anon, authenticated;
grant select, update, delete on public.contact_messages to authenticated;

-- -----------------------------------------------------------------------------
-- Reservation insert policy — rewritten for stay requests
-- -----------------------------------------------------------------------------
-- Old rule: preferred_at within [-1h, +1y). New rule is date-based: the stay
-- starts today or later (Kigali wall-clock), ends after it starts, and is not
-- more than two years out. preferred_at is kept populated by the API for
-- compatibility, but the policy no longer depends on it.

drop policy if exists reservations_insert on public.reservation_requests;
create policy reservations_insert on public.reservation_requests
  for insert to anon, authenticated
  with check (
    check_in is not null
    and check_out is not null
    and check_out > check_in
    and check_in >= (timezone('Africa/Kigali', now()))::date
    and check_in <= (timezone('Africa/Kigali', now()))::date + 730
  );

-- Refresh the column grants: guests may fill the request fields — and the
-- reference code their confirmation screen displays — but still never the
-- status or staff notes.
revoke insert on public.reservation_requests from anon, authenticated;
grant insert (
  name, phone, email, party_size, preferred_at, notes,
  check_in, check_out, adults, children,
  accommodation_pref, camping_pref, experience_interest, reference_code
) on public.reservation_requests to anon, authenticated;

-- =============================================================================
-- Storage — one more public bucket for accommodation imagery
-- =============================================================================
-- Accommodation/camping cards are image-heavy; a dedicated bucket keeps the
-- same limits and admin-only writes as the rest of the site media.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'stays',
  'stays',
  true,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read of site media" on storage.objects;
create policy "Public read of site media" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('hero', 'menu', 'gallery', 'stays'));

drop policy if exists "Admins upload site media" on storage.objects;
create policy "Admins upload site media" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('hero', 'menu', 'gallery', 'stays') and public.is_admin());

drop policy if exists "Admins replace site media" on storage.objects;
create policy "Admins replace site media" on storage.objects
  for update to authenticated
  using (bucket_id in ('hero', 'menu', 'gallery', 'stays') and public.is_admin())
  with check (bucket_id in ('hero', 'menu', 'gallery', 'stays') and public.is_admin());

drop policy if exists "Admins delete site media" on storage.objects;
create policy "Admins delete site media" on storage.objects
  for delete to authenticated
  using (bucket_id in ('hero', 'menu', 'gallery', 'stays') and public.is_admin());
