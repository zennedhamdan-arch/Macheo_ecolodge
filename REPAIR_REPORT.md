# Macheo Ecolodge — final repository repair & admin CMS report

Branch `arena/01a07c2b-macheo-ecolodge` @ `adde189` · PR **#1** (open, base `main`) ·
remote `main` is still `e30067e`.

---

## 1. Why the Vercel build failed — and the one thing you still have to do

**The imports were never broken. The files they point at are not in `main`.**

`origin/main` (`e30067e`, "auth removal fix") is an **orphan root commit** — it has no
parent and no merge-base with the working branch. Its tree is missing **30 paths**:

```
.env.example
app/api/contact/route.ts            app/api/reservations/route.ts
data/logo.generated.ts  data/macheo.ts  data/menu.ts  data/site.ts
lib/actions.ts  lib/adminSort.ts  lib/content.ts  lib/jsonld.ts  lib/safeRedirect.ts
lib/supabase/{client,env,public,server,types}.ts  lib/time.ts  lib/turnstile.ts
lib/upload.ts  lib/useMediaQuery.ts
public/images/macheo/*.jpg  (10 photos)
```

Every file the two trees *share* is byte-identical, and `main` contains nothing that the
branch does not. So this was a lost-files commit, not a code conflict.

**Reproduced, not assumed.** I checked `e30067e` out into a throwaway worktree and built it:

```
### files main's tree is missing:
  MISSING: lib/supabase/client.ts   MISSING: lib/adminSort.ts   MISSING: lib/upload.ts
  MISSING: lib/content.ts           MISSING: data/macheo.ts     MISSING: app/api/reservations/route.ts

### npm run build on main's tree:
Failed to compile.
Module not found: Can't resolve '@/lib/supabase/client'
Module not found: Can't resolve '@/lib/adminSort'
Module not found: Can't resolve '@/lib/upload'
> Build failed because of webpack errors      exit=1
```

That is your Vercel log verbatim. The three modules named are simply the first ones the
bundler reached; `@/lib/content`, `@/data/macheo` and `@/lib/supabase/server` fail too.
The same tree also 404s on all ten lodge photos at runtime.

**The repair** (`eb23c45`): `git merge --allow-unrelated-histories e30067e` into the working
branch. `git diff --stat 6eddc6a eb23c45` is **empty** — the merge restored every missing
path without altering a single byte of already-verified content, and the branch is now a
descendant of `main`, so `main` can fast-forward to a complete tree. No placeholder modules,
no deleted admin functionality, no architecture change. The logo `ENOENT` fix (`6eddc6a`) is
untouched.

> ### ⚠ What you must do
> `git merge-base --is-ancestor c2f2858 e30067e` → **NO**. `main` is still the broken tree, so
> **Vercel will keep failing until you merge PR #1** (or point the Vercel project at
> `arena/01a07c2b-macheo-ecolodge`). Merging #1 is a clean fast-forward-able merge:
>
> ```bash
> gh pr merge 1 --merge        # or: git checkout main && git merge arena/01a07c2b-macheo-ecolodge
> ```
>
> Do **not** "fix" it by deleting the admin imports — the modules are real and correct.

---

## 2. Modules the build named

| Module | Status | Used by |
|---|---|---|
| `@/lib/supabase/client` | present, real (browser client from `NEXT_PUBLIC_*` env) | `SignOutButton`, `AdminNav`, every manager |
| `@/lib/adminSort` | present, real (`topSortOrder`) | accommodation, camping, experiences, gallery, menu, socials |
| `@/lib/upload` | present, real (chunked upload → Storage path) | all four upload managers |

Audit after the repair — every aliased import in the repo resolves to a file on disk:

```
checked 170 @/ imports
BROKEN: none
```

---

## 3. Admin authentication (unchanged, verified)

- **AuthN**: Supabase email + password only. No OAuth/social, no MFA, no customer accounts.
- **AuthZ is separate**: `getAdminUser()` (`lib/supabase/server.ts:56`) calls
  `supabase.auth.getUser()`, **then** re-reads the `admin_users` allow-list — being
  authenticated is not being an admin.
- `app/admin/dashboard/layout.tsx` re-runs that check on **every** dashboard request and
  redirects to `/admin/login`; `middleware.ts` only bounces anonymous visitors off `/admin`
  and refreshes the session (it inspects a cookie, it never authorises).
- No service-role key anywhere client-side (`db:test` asserts this); visitors need no account.

---

## 4. Ordering — newest first, database-driven

`sort_order` ascending stays the owner's manual order; `created_at` **descending** is the
tie-break; new rows insert at `topSortOrder()` = `min(sort_order) − 1`, so a new item is
first in the database, survives a reload, and is editable immediately. The manual ▲▼ buttons
still renumber `0…n-1` and were not touched.

**Correction to something I told you earlier.** My previous report said the newest-first
ordering had been verified and pushed. It had not: a workspace snapshot reset mid-turn
reverted `lib/content.ts`, and the commit captured that reverted state. `git grep
order("sort_order", "asc") HEAD` returned nothing — the admin *page* queries had the
descending tie-break but the public queries still used **ascending**, so rows sharing a
`sort_order` (all of them, until an owner presses reorder — the seed leaves `sort_order` at 0)
appeared in *opposite* order in the dashboard and on the site. Fixed in `c2f2858`; all six
public queries now match:

```
lib/content.ts:158  .order("sort_order", { ascending: true })
lib/content.ts:159  .order("created_at", { ascending: false }),   ← menu categories
                        … identical for sections, items, accommodations (×2), gallery
```

Applies to Accommodation, Camping, Experiences, Menu (categories/sections/items), Gallery,
Social links, Content entries, Reservations and Contact messages.

---

## 5. Image pipeline (traced, not assumed)

admin file input → `lib/upload.ts` `uploadFile()` (MIME inferred from the extension so the
CDN `Content-Type` and the bucket's `allowed_mime_types` agree; jpeg/jpg/png/webp/avif) →
Supabase Storage path stored in the DB (`image_url` / `image_path` / `images[]`) →
`components/SiteImage.tsx` renders it with `next/image`, `remotePatterns` covering
`**.supabase.co` + the configured host (`next.config.ts`) → used by 8 public components
(`AccommodationCards`, `AccommodationDetail`, `ExperienceCards`, `GalleryGrid`,
`GalleryLightbox`, `MenuItem`, `PhotoShowcase`, experiences detail) and 4 admin previews.

- No Google Business/Profile URL is used as a listing image; valid WebP is passed through
  unconverted (no `formats` override).
- Missing or broken images fall back to the drawn `SiteImage` placeholder instead of the
  browser's broken-image icon.
- Storage is **not** anonymously writable: public read policy, admin-only
  insert/update/delete (`supabase/migrations/0007_storage.sql:46-63`).

---

## 6. Reservations — demo behaviour (this turn's change)

**Turnstile is now optional**, exactly as asked. `lib/turnstile.ts` gains
`turnstileRequired()` = `Boolean(NEXT_PUBLIC_TURNSTILE_SITE_KEY)`, and both
`app/api/reservations/route.ts` and `app/api/contact/route.ts` wrap their token check in it.
Measured on a production `next start` build:

| Scenario | Result |
|---|---|
| No keys, no token, valid reservation | `HTTP 500` at the DB insert (sandbox uses a fake Supabase URL) — **the captcha gate no longer blocks it** |
| No keys, `check_out` before `check_in` | `HTTP 400 "Check-out must be after check-in."` — validation intact |
| No keys, contact message | `HTTP 500` at the insert, gate passed |
| Site key set, no token | `HTTP 400 "Please complete the anti-bot check."` — still enforced |
| Site key set, no secret | `HTTP 503 "Anti-bot protection is not configured on the server."` — still fails **closed** |
| Built `/reservation` (no keys) | `0` occurrences of the old "submissions may be disabled" warning |

Still a **request**, never a booking: `status` defaults to `'new'`
(`0001_schema.sql:273`), no availability, no payments, no WhatsApp/SMS/email/AI automation,
no customer accounts. Server-side validation, RLS and the column grants are unchanged.
`.env.example` and `README.md` were corrected — both still described the check as mandatory.

---

## 7. Admin UX

Add New at the top of every CRUD screen, obvious Edit/Delete, per-row busy state, success and
error banners, real empty states ("No messages yet — anything a visitor sends through the
contact form lands here."), responsive layout. The mobile menu fix (dropping `backdrop-filter`
while the panel is open, re-stacking `z-index`) is retained; nothing was redesigned.

---

## 8. Security — silent write errors removed

`supabase-js` **resolves** with `{ error }` instead of throwing, so four sites reported
success while the row never changed:

| File | Call | Now |
|---|---|---|
| `ReservationList.tsx` | `setStatus`, `saveNotes` | `{ error }` checked, banner + `role="alert"` |
| `ContactInbox.tsx` | `toggleRead`, `remove` | `{ error }` checked, banner |
| `GalleryManager.tsx` | `move()` reorder `Promise.all` | responses mapped, first `error` thrown |
| `ExperienceManager.tsx` | `move()` reorder `Promise.all` | same |

Storage `.remove()` after a row delete stays best-effort by design (an orphaned object is
harmless; failing the delete would strand the row) and is commented as such. No RLS policy,
grant or authorization check was weakened for the demo.

---

## 9. Validation — all four commands, run on the final tree

| Command | Result |
|---|---|
| `npm run lint` | `eslint .` → clean, **exit 0** |
| `npm run typecheck` | `tsc --noEmit` → clean, **exit 0** |
| `npm run build` | `✓ Compiled successfully`, 16 static pages generated, **exit 0** |
| `npm run db:test` | **76 passed, 0 failed** |

Plus: main's tree builds **exit 1** with your exact error (§1); 170/170 `@/` imports resolve;
the five runtime reservation/contact cases in §6.

### Remaining warnings / not verifiable here
- **No Supabase project is reachable from this sandbox**, so admin CRUD, uploads and the
  reservation insert could not be exercised end-to-end against a real database — the
  `HTTP 500` in §6 is the fake URL, and would be a success against your project.
- `npm install` prints one deprecation notice (`eslint@9.39.5` is EOL). Harmless; upgrading
  is out of scope for "no new dependencies".
- No new dependencies, frameworks, providers or workers were added —
  `git diff 8629753 HEAD -- package.json package-lock.json` is empty.

---

## Files changed this turn (`eb23c45 → adde189`)

```
 .env.example                                       | 11 ++--
 README.md                                          | 10 ++--
 app/admin/dashboard/contact-info/ContactInbox.tsx  | 39 ++++++++++++--
 app/admin/dashboard/experiences/ExperienceManager.tsx | 10 +++-
 app/admin/dashboard/gallery/GalleryManager.tsx     | 11 +++-
 app/admin/dashboard/reservations/ReservationList.tsx | 40 ++++++++++++--
 app/api/contact/route.ts                           | 58 +++++++++++---------
 app/api/reservations/route.ts                      | 61 +++++++++++++---------
 components/ContactForm.tsx                         |  9 +---
 components/ReservationForm.tsx                     | 13 ++---
 lib/content.ts                                     | 32 ++++++------
 lib/turnstile.ts                                   | 22 +++++++-
 12 files changed, 212 insertions(+), 104 deletions(-)
```

Commits on the branch: `3aa16c8` admin UX/images/auth · `7bf03a9` map · `6eddc6a` logo
ENOENT · `eb23c45` merge `main` (the build repair) · `7a7e145` optional Turnstile + write
errors · `c2f2858` ordering · `adde189` docs.
