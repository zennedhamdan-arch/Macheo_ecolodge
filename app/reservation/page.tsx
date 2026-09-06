import Link from "next/link";
import { Suspense } from "react";

import BrandMark from "@/components/BrandMark";
import ReservationForm from "@/components/ReservationForm";
import { getAccommodations, getExperiences, getLodge } from "@/lib/content";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { primaryActions } from "@/lib/actions";
import styles from "./page.module.css";

export const revalidate = 60;

export const metadata = {
  title: "Plan Your Stay — Macheo Ecolodge & Camping",
  description:
    "Request a stay at Macheo Ecolodge & Camping in Karongi, Lake Kivu. Choose your dates, guests and preferences — we confirm every request personally.",
};

/**
 * The dedicated reservation page — the single destination of every
 * "Plan Your Stay" CTA on the site.
 *
 * It is deliberately a standalone page, not a section of the homepage:
 * booking is a task, and a task deserves an unhindered page with a clear way
 * back. Like the contact flow it renders NO public navbar — just the brand
 * and a real link home — so nothing scrolls the guest away mid-form.
 *
 * A reservation submitted here is a REQUEST: no payment is taken, and the
 * site never claims otherwise.
 */
export default async function ReservationPage(): Promise<React.JSX.Element> {
  const business = await getLodge();
  const formEnabled = isSupabaseConfigured;

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  /* Preference options come from the same published rows the public pages
     show — nothing here exposes unpublished content (RLS wouldn't allow it
     through this client anyway). */
  const [rooms, tents, experiences] = await Promise.all([
    getAccommodations("room"),
    getAccommodations("camping"),
    getExperiences(),
  ]);

  const accommodationOptions = rooms.map((row) => ({ value: row.name, label: row.name }));
  const campingOptions = tents.map((row) => ({ value: row.name, label: row.name }));
  const experienceOptions = experiences.map((row) => ({ value: row.title, label: row.title }));

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.home} aria-label="Macheo Ecolodge & Camping — home">
            <BrandMark size="nav" />
          </Link>
          {/* A real anchor: works without JavaScript, after a direct visit,
              on every screen size, and the browser Back button behaves. */}
          <Link href="/" className={styles.back}>
            ← Back to the site
          </Link>
        </div>
      </header>

      <main id="main" className={styles.main}>
        <div className={`shell ${styles.inner}`}>
          <p className={styles.eyebrow}>Reservations</p>
          <h1 className={styles.headline}>Plan your stay</h1>
          <p className={styles.lede}>
            Tell us your dates and what you are dreaming of — a room, a tent,
            a day on the lake. This sends a <strong>request</strong>: we
            confirm every stay personally, usually by phone or WhatsApp, and
            no payment is taken online.
          </p>

          {formEnabled ? (
            <Suspense fallback={<p className={styles.loading}>Loading the form…</p>}>
              <ReservationForm
                accommodationOptions={accommodationOptions}
                campingOptions={campingOptions}
                experienceOptions={experienceOptions}
                turnstileSiteKey={turnstileSiteKey}
              />
            </Suspense>
          ) : (
            <div className={styles.fallback}>
              <h2 className={styles.fallbackTitle}>Online booking is not switched on yet</h2>
              <p className={styles.fallbackBody}>
                The fastest way to a bed or a tent is still the reliable one —
                call or message us and we will hold it for you.
              </p>
              <div className={styles.fallbackActions}>
                {primaryActions.map((action) => (
                  <a
                    key={action.id}
                    href={action.href}
                    className={styles.fallbackButton}
                    {...(action.external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    {action.label}
                  </a>
                ))}
                {primaryActions.length === 0 ? (
                  <p className={styles.fallbackNote}>
                    Visit us in {business.city}, {business.country} — we are on
                    the shores of Lake Kivu.
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
