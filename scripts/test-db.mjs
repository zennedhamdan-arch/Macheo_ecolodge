/**
 * Runs the Supabase migrations against a real Postgres (PGlite, in-process)
 * and asserts that the authorization model actually behaves as intended.
 *
 *   npm run db:test
 *
 * Why this exists
 * ---------------
 * RLS is the only thing standing between the public internet and the lodge's
 * guest list. "It looks right" is not good enough: a missing policy, a
 * missing GRANT, or a policy that accidentally applies to `anon` are all
 * invisible in review and catastrophic in production.
 *
 * This boots Postgres, applies the real migration files, seeds them, then
 * connects as each role and checks what it can and cannot do.
 *
 * Supabase-provided objects (auth schema, storage schema, the anon /
 * authenticated roles) are stubbed here to match Supabase's behaviour.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

const ROOT = process.cwd();
const read = (p) => readFile(path.join(ROOT, p), "utf8");

let passed = 0;
let failed = 0;

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/** Runs `fn` as `role` with an optional auth.uid(), then resets. */
async function as(db, role, uid, fn) {
  await db.exec(`set role ${role};`);
  await db.exec(
    uid
      ? `select set_config('request.jwt.claim.sub', '${uid}', false);`
      : `select set_config('request.jwt.claim.sub', '', false);`,
  );
  try {
    return await fn();
  } finally {
    await db.exec("reset role;");
  }
}

/**
 * Expects a mutation to change NOTHING.
 *
 * An UPDATE or DELETE that RLS filters down to zero rows does not raise — it
 * reports success having touched nothing. That is safe, but "it threw" is the
 * wrong assertion: the property that matters is that the data is unchanged.
 */
async function changesNothing(db, label, run, verify) {
  let affected = null;
  try {
    const result = await run();
    affected = result?.affectedRows ?? 0;
  } catch (error) {
    const message = String(error.message ?? error);
    if (!/permission denied|violates row-level security|policy/i.test(message)) {
      check(label, false, `blocked by the wrong error: ${message}`);
      return;
    }
    check(label, true);
    return;
  }
  const stillCorrect = verify ? await verify() : true;
  check(
    label,
    affected === 0 && stillCorrect,
    affected !== 0
      ? `${affected} row(s) were modified`
      : "the row count was 0 but the stored value changed",
  );
}

/** Expects the callback to throw (a permission or policy violation). */
async function denied(db, label, fn) {
  try {
    await fn();
    check(label, false, "the operation SUCCEEDED but should have been blocked");
  } catch (error) {
    const message = String(error.message ?? error);
    const isAuthz = /permission denied|violates row-level security|policy/i.test(message);
    check(label, isAuthz, isAuthz ? "" : `blocked, but by the wrong error: ${message}`);
  }
}

/** Expects the callback to throw for ANY reason (domain errors included). */
async function throws(db, label, fn) {
  try {
    await fn();
    check(label, false, "the operation SUCCEEDED but should have been refused");
  } catch {
    check(label, true);
  }
}

async function main() {
  const db = await PGlite.create();

  console.log("Bootstrapping Supabase-provided objects…");

  // Roles and schemas that Supabase supplies for us.
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;

    create schema if not exists auth;
    create table auth.users (
      id uuid primary key,
      email text
    );

    -- Supabase reads the JWT subject claim; PGlite has no JWT, so a session
    -- setting stands in for it. Same signature, same return type.
    create or replace function auth.uid() returns uuid
      language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

    create schema if not exists storage;
    create table storage.buckets (
      id text primary key,
      name text not null,
      public boolean not null default false,
      file_size_limit bigint,
      allowed_mime_types text[]
    );
    create table storage.objects (
      id uuid primary key default gen_random_uuid(),
      bucket_id text references storage.buckets (id),
      name text,
      owner uuid
    );
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon, authenticated;
    grant select, insert, update, delete on storage.objects to anon, authenticated;

    -- Supabase's default: broad grants that 0002 is expected to revoke.
    grant usage on schema public to anon, authenticated;
    alter default privileges in schema public
      grant all on tables to anon, authenticated;
  `);

  console.log("Applying migrations…");
  for (const file of [
    "0001_schema.sql",
    "0002_rls.sql",
    "0003_storage.sql",
    "0004_pickup_orders.sql",
    "0005_whatsapp_floating.sql",
    "0006_gallery_featured.sql",
    "0007_macheo_transformation.sql",
  ]) {
    const sql = await read(path.join("supabase", "migrations", file));
    // pgcrypto ships with Supabase; PGlite has gen_random_uuid() in core.
    await db.exec(sql.replace(/create extension if not exists "pgcrypto";/g, ""));
    console.log(`  applied ${file}`);
  }

  console.log("Seeding…");
  await db.exec(await read(path.join("supabase", "seed.sql")));

  // Two accounts: one allow-listed admin, one ordinary signed-up user.
  const ADMIN = "11111111-1111-1111-1111-111111111111";
  const INTRUDER = "22222222-2222-2222-2222-222222222222";
  await db.exec(`
    insert into auth.users (id, email) values
      ('${ADMIN}', 'owner@macheo.rw'),
      ('${INTRUDER}', 'random@signup.com');
    insert into public.admin_users (id, email, role)
      values ('${ADMIN}', 'owner@macheo.rw', 'owner');
  `);

  /* ------------------------------------------------------------------ */
  console.log("\nSeed integrity");
  /* ------------------------------------------------------------------ */

  const counts = await db.query(`
    select
      (select count(*) from public.menu_categories)  as categories,
      (select count(*) from public.menu_items)       as items,
      (select count(*) from public.accommodations)   as stays,
      (select count(*) from public.experiences)      as experiences,
      (select count(*) from public.gallery_items)    as photos
  `);
  const c = counts.rows[0];
  check("3 menu categories seeded (Food / Drinks / Specials)", Number(c.categories) === 3, `got ${c.categories}`);
  check("menu items seeded", Number(c.items) > 0, `got ${c.items}`);
  check("4 demo accommodations seeded (2 rooms, 2 camping)", Number(c.stays) === 4, `got ${c.stays}`);
  check("4 demo experiences seeded", Number(c.experiences) === 4, `got ${c.experiences}`);
  check("10 gallery photos seeded", Number(c.photos) === 10, `got ${c.photos}`);

  const unpublishedStays = await db.query(
    "select count(*) as n from public.accommodations where published",
  );
  check("demo accommodations are seeded UNPUBLISHED", Number(unpublishedStays.rows[0].n) === 0);

  const noPrices = await db.query(
    "select count(*) as n from public.menu_items where price is not null",
  );
  check("the demo menu invents no prices", Number(noPrices.rows[0].n) === 0);

  const seedAgain = await read(path.join("supabase", "seed.sql"));
  await db.exec(seedAgain);
  const after = await db.query(`select count(*) as n from public.accommodations`);
  check("seed is idempotent (re-running adds nothing)", Number(after.rows[0].n) === 4,
    `got ${after.rows[0].n}`);

  /* ------------------------------------------------------------------ */
  console.log("\nRestaurant-era objects are gone");
  /* ------------------------------------------------------------------ */

  const gone = await db.query(`
    select
      to_regclass('public.pickup_orders')  as pickup_orders,
      to_regclass('public.offers')         as offers,
      to_regclass('public.testimonials')   as testimonials
  `);
  const g = gone.rows[0];
  check("pickup_orders dropped", g.pickup_orders === null);
  check("offers dropped", g.offers === null);
  check("testimonials dropped", g.testimonials === null);

  /* ------------------------------------------------------------------ */
  console.log("\nPublic visitor (anon)");
  /* ------------------------------------------------------------------ */

  await as(db, "anon", null, async () => {
    const items = await db.query("select count(*) as n from public.menu_items");
    check("can read the published menu", Number(items.rows[0].n) > 0);

    const business = await db.query("select phone, city from public.business_info");
    check("can read business info", business.rows[0]?.city === "Karongi (Kibuye)");

    const content = await db.query("select id from public.site_content");
    check("can read site content", content.rows.length === 1);

    const hero = await db.query("select count(*) as n from public.hero_media where is_active");
    check("can see the active hero media", Number(hero.rows[0].n) === 1);

    const stays = await db.query("select count(*) as n from public.accommodations");
    check("sees zero unpublished accommodations", Number(stays.rows[0].n) === 0,
      `saw ${stays.rows[0].n}`);
  });

  await denied(db, "CANNOT read reservation requests", () =>
    as(db, "anon", null, () => db.query("select * from public.reservation_requests")),
  );
  await denied(db, "CANNOT read contact messages", () =>
    as(db, "anon", null, () => db.query("select * from public.contact_messages")),
  );
  await denied(db, "CANNOT edit a menu item", () =>
    as(db, "anon", null, () =>
      db.query("update public.menu_items set price = 1 where name = 'Fresh Lake Fish'"),
    ),
  );
  await denied(db, "CANNOT edit accommodations", () =>
    as(db, "anon", null, () =>
      db.query("update public.accommodations set published = true"),
    ),
  );
  await denied(db, "CANNOT edit site content", () =>
    as(db, "anon", null, () =>
      db.query("update public.site_content set hero_title = 'hacked' where id = 1"),
    ),
  );
  await denied(db, "CANNOT read the admin allow-list", () =>
    as(db, "anon", null, () => db.query("select * from public.admin_users")),
  );

  /* A proper stay request goes through. */
  await as(db, "anon", null, async () => {
    await db.query(
      `insert into public.reservation_requests (
         name, phone, email, party_size, preferred_at,
         check_in, check_out, adults, children, accommodation_pref, reference_code
       )
       values (
         'Visitor', '+250780000000', 'visitor@example.com', 3,
         now() + interval '3 days',
         current_date + 3, current_date + 5, 2, 1, 'Lake View Room', 'MCH-TEST01'
       )`,
    );
    check("CAN submit a stay request", true);
  });

  await denied(db, "CANNOT self-approve a reservation (column grant)", () =>
    as(db, "anon", null, () =>
      db.query(
        `insert into public.reservation_requests (
           name, phone, party_size, preferred_at, check_in, check_out, status
         )
         values ('Sneaky', '+250780000001', 2, now() + interval '1 day',
                 current_date + 1, current_date + 2, 'confirmed')`,
      ),
    ),
  );
  await denied(db, "CANNOT write staff-only admin_notes", () =>
    as(db, "anon", null, () =>
      db.query(
        `insert into public.reservation_requests (
           name, phone, party_size, preferred_at, check_in, check_out, admin_notes
         )
         values ('Sneaky', '+250780000002', 2, now() + interval '1 day',
                 current_date + 1, current_date + 2, 'x')`,
      ),
    ),
  );
  await denied(db, "CANNOT backdate check-in into the past", () =>
    as(db, "anon", null, () =>
      db.query(
        `insert into public.reservation_requests (
           name, phone, party_size, preferred_at, check_in, check_out
         )
         values ('Past', '+250780000003', 2, now() - interval '10 days',
                 current_date - 10, current_date - 8)`,
      ),
    ),
  );
  await denied(db, "CANNOT check out before checking in", () =>
    as(db, "anon", null, () =>
      db.query(
        `insert into public.reservation_requests (
           name, phone, party_size, preferred_at, check_in, check_out
         )
         values ('Backwards', '+250780000004', 2, now() + interval '1 day',
                 current_date + 5, current_date + 3)`,
      ),
    ),
  );

  /* Contact form: write-only. */
  await as(db, "anon", null, async () => {
    await db.query(
      `insert into public.contact_messages (name, email, subject, message)
       values ('Visitor', 'visitor@example.com', 'Question', 'Do you take groups?')`,
    );
    check("CAN send a contact message", true);
  });
  await denied(db, "CANNOT read contact messages back", () =>
    as(db, "anon", null, () => db.query("select * from public.contact_messages")),
  );
  await denied(db, "CANNOT mark a contact message read", () =>
    as(db, "anon", null, () => db.query("update public.contact_messages set is_read = true")),
  );

  /* ------------------------------------------------------------------ */
  console.log("\nFloating WhatsApp button settings");
  /* ------------------------------------------------------------------ */

  {
    const row = await db.query(
      `select whatsapp_floating_enabled, whatsapp_default_message
       from public.site_settings where id = 1`,
    );
    check("settings row exists with floating enabled by default",
      row.rows.length === 1 && row.rows[0].whatsapp_floating_enabled === true,
      JSON.stringify(row.rows[0]));
  }

  await as(db, "anon", null, async () => {
    const row = await db.query(
      "select whatsapp_floating_enabled from public.site_settings where id = 1",
    );
    check("the public can read the button setting", row.rows.length === 1);
  });

  await changesNothing(
    db,
    "CANNOT hide the WhatsApp button (non-admin)",
    () =>
      as(db, "authenticated", INTRUDER, () =>
        db.query(
          "update public.site_settings set whatsapp_floating_enabled = false where id = 1",
        ),
      ),
    async () => {
      const r = await db.query(
        "select whatsapp_floating_enabled from public.site_settings where id = 1",
      );
      return r.rows[0].whatsapp_floating_enabled === true;
    },
  );

  await as(db, "authenticated", ADMIN, async () => {
    await db.query(
      `update public.site_settings
       set whatsapp_default_message = 'Karibu Macheo!', whatsapp_floating_enabled = false
       where id = 1`,
    );
    const r = await db.query(
      "select whatsapp_default_message, whatsapp_floating_enabled from public.site_settings where id = 1",
    );
    check("admin can configure the button",
      r.rows[0].whatsapp_default_message === "Karibu Macheo!" &&
        r.rows[0].whatsapp_floating_enabled === false);
    await db.query(
      "update public.site_settings set whatsapp_floating_enabled = true where id = 1",
    );
  });

  /* ------------------------------------------------------------------ */
  console.log("\nSigned-up user who is NOT an admin");
  /* ------------------------------------------------------------------ */
  // This is the case the naive model gets wrong: authentication treated as
  // authorization. If sign-up is open, this user is any stranger on the web.

  await changesNothing(
    db,
    "CANNOT edit the menu",
    () =>
      as(db, "authenticated", INTRUDER, () =>
        db.query("update public.menu_items set price = 1 where name = 'Fresh Lake Fish'"),
      ),
    async () => {
      const r = await db.query(
        "select price from public.menu_items where name = 'Fresh Lake Fish'",
      );
      return r.rows[0].price === null;
    },
  );
  await changesNothing(
    db,
    "CANNOT change business info",
    () =>
      as(db, "authenticated", INTRUDER, () =>
        db.query("update public.business_info set phone = '+000' where id = 1"),
      ),
    async () => {
      const r = await db.query("select phone from public.business_info where id = 1");
      return r.rows[0].phone === "+250788000111";
    },
  );
  await changesNothing(
    db,
    "CANNOT publish accommodations",
    () =>
      as(db, "authenticated", INTRUDER, () =>
        db.query("update public.accommodations set published = true"),
      ),
    async () => {
      const r = await db.query("select count(*) as n from public.accommodations where published");
      return Number(r.rows[0].n) === 0;
    },
  );
  await changesNothing(
    db,
    "CANNOT rewrite site content",
    () =>
      as(db, "authenticated", INTRUDER, () =>
        db.query("update public.site_content set hero_title = 'hacked' where id = 1"),
      ),
    async () => {
      const r = await db.query("select hero_title from public.site_content where id = 1");
      return r.rows[0].hero_title === null;
    },
  );
  await changesNothing(
    db,
    "CANNOT delete gallery photos",
    () => as(db, "authenticated", INTRUDER, () => db.query("delete from public.gallery_items")),
  );
  await denied(db, "CANNOT upload to storage", () =>
    as(db, "authenticated", INTRUDER, () =>
      db.query(`insert into storage.objects (bucket_id, name) values ('hero', 'x.mp4')`),
    ),
  );
  await denied(db, "CANNOT upload accommodation photos", () =>
    as(db, "anon", null, () =>
      db.query(`insert into storage.objects (bucket_id, name) values ('stays', 'x.jpg')`),
    ),
  );

  await as(db, "authenticated", INTRUDER, async () => {
    const rows = await db.query("select count(*) as n from public.reservation_requests");
    check("sees zero reservation requests", Number(rows.rows[0].n) === 0, `saw ${rows.rows[0].n}`);

    const messages = await db.query("select count(*) as n from public.contact_messages");
    check("sees zero contact messages", Number(messages.rows[0].n) === 0, `saw ${messages.rows[0].n}`);
  });

  await denied(db, "CANNOT promote themselves to admin", () =>
    as(db, "authenticated", INTRUDER, () =>
      db.query(
        `insert into public.admin_users (id, email) values ('${INTRUDER}', 'random@signup.com')`,
      ),
    ),
  );

  /* ------------------------------------------------------------------ */
  console.log("\nAllow-listed admin");
  /* ------------------------------------------------------------------ */

  await as(db, "authenticated", ADMIN, async () => {
    await db.query(
      "update public.accommodations set published = true where slug = 'lake-view-room'",
    );
    check("can publish an accommodation", true);

    await db.query("update public.business_info set email = 'stay@macheo.rw' where id = 1");
    check("can edit business info", true);

    await db.query("update public.site_content set hero_title = 'Macheo' where id = 1");
    check("can edit site content", true);

    const reservations = await db.query(
      "select count(*) as n from public.reservation_requests",
    );
    check("can read reservation requests", Number(reservations.rows[0].n) === 1);

    await db.query(
      "update public.reservation_requests set status = 'confirmed', admin_notes = 'called'",
    );
    check("can confirm a reservation and write staff notes", true);

    await db.query(
      "update public.reservation_requests set status = 'completed'",
    );
    check("can use the new status ladder (completed)", true);

    const messages = await db.query("select count(*) as n from public.contact_messages");
    check("can read contact messages", Number(messages.rows[0].n) === 1);

    await db.query(`insert into storage.objects (bucket_id, name) values ('stays', 'room.jpg')`);
    check("can upload to the stays bucket", true);

    await db.query(`insert into storage.objects (bucket_id, name) values ('gallery', 'p.jpg')`);
    check("can upload to the gallery bucket", true);
  });

  /* ------------------------------------------------------------------ */
  console.log("\nUnpublished content is invisible, not merely hidden");
  /* ------------------------------------------------------------------ */

  await db.exec(`
    insert into public.experiences (title, active, category) values ('Secret trip', false, 'Lake');
    insert into public.gallery_items (image_url, alt_text, published)
      values ('https://example.com/draft.jpg', 'an unpublished photo', false);
    insert into public.accommodations (kind, name, slug, published)
      values ('room', 'Hidden Room', 'hidden-room', false);
  `);

  await as(db, "anon", null, async () => {
    const experiences = await db.query("select title from public.experiences order by title");
    check(
      "anon never sees inactive experiences",
      !experiences.rows.some((r) => r.title === "Secret trip"),
    );

    const gallery = await db.query("select image_url from public.gallery_items");
    check(
      "anon never sees unpublished photos",
      !gallery.rows.some((r) => r.image_url.includes("draft.jpg")),
    );

    const stays = await db.query("select slug from public.accommodations");
    check(
      "anon sees only published accommodation (the one admin published)",
      stays.rows.length === 1 && stays.rows[0].slug === "lake-view-room",
      JSON.stringify(stays.rows),
    );
  });

  await as(db, "authenticated", ADMIN, async () => {
    const stays = await db.query("select count(*) as n from public.accommodations");
    check("admin sees unpublished rows too", Number(stays.rows[0].n) === 5);
  });

  /* ------------------------------------------------------------------ */
  console.log("\nGallery categories are the Macheo set");
  /* ------------------------------------------------------------------ */

  await throws(db, "restaurant-era gallery category rejected", () =>
    db.query(
      `insert into public.gallery_items (image_url, alt_text, category)
       values ('x.jpg', 'x', 'Events')`,
    ),
  );
  await db.query(
    `insert into public.gallery_items (image_url, alt_text, category, published)
     values ('kivu.jpg', 'the lake', 'Lake Kivu', false)`,
  );
  check("Macheo gallery category accepted", true);

  /* ------------------------------------------------------------------ */
  console.log("\nSchema invariants");
  /* ------------------------------------------------------------------ */

  await throws(db, "old reservation status 'new' no longer accepted", () =>
    db.query(
      `insert into public.reservation_requests (
         name, phone, party_size, preferred_at, check_in, check_out, status
       )
       values ('Old status', '+250780000009', 1, now() + interval '1 day',
               current_date + 1, current_date + 2, 'new')`,
    ),
  );

  {
    // A reference code is always present, even when the caller sends none.
    await db.query(
      `insert into public.reservation_requests (
         name, phone, party_size, preferred_at, check_in, check_out
       )
       values ('No code sent', '+250780000010', 1, now() + interval '2 days',
               current_date + 2, current_date + 3)`,
    );
    const r = await db.query(
      `select reference_code from public.reservation_requests where phone = '+250780000010'`,
    );
    check(
      "reference code auto-generated when not supplied",
      typeof r.rows[0].reference_code === "string" && r.rows[0].reference_code.startsWith("MCH-"),
      JSON.stringify(r.rows[0]),
    );
  }

  {
    // The slug trigger derives a slug from the name when none is supplied.
    await db.query(
      `insert into public.accommodations (kind, name) values ('camping', 'Bush Camp')`,
    );
    const r = await db.query(`select slug from public.accommodations where name = 'Bush Camp'`);
    check("accommodation slug derived from the name", r.rows[0].slug === "bush-camp", r.rows[0].slug);
  }

  {
    const settings = await db.query("select id from public.site_content");
    check("site_content is a singleton", settings.rows.length === 1);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
