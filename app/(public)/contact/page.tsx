import type { Metadata } from "next";
import Link from "next/link";

import PageHero from "@/components/PageHero";
import ContactForm from "@/components/ContactForm";
import { getLodge } from "@/lib/content";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import styles from "@/components/ListingPage.module.css";
import contactStyles from "./page.module.css";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Contact Macheo",
  description:
    "Contact Macheo Ecolodge & Camping in Karongi, Lake Kivu — phone, WhatsApp, email and a message form for stays, camping and experiences.",
  openGraph: {
    title: "Contact | Macheo Ecolodge & Camping",
    description: "Reach the Macheo team — we reply as quickly as we can.",
  },
};

/**
 * /contact — the contact details plus a message form.
 *
 * Contact rows render only when a value exists (committed defaults or
 * admin-configured values in business_info), so the page never displays a
 * fake number. The form is protected by Turnstile and writes through
 * /api/contact into the write-only contact_messages table.
 */
export default async function ContactPage(): Promise<React.JSX.Element> {
  const business = await getLodge();
  const formEnabled = isSupabaseConfigured;
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  return (
    <main id="main">
      <PageHero
        eyebrow="Contact"
        title="Contact Macheo."
        lede="Questions about a stay, camping, or a day on the lake — send a message and we will get back to you."
        image="/images/macheo/hero-lake.jpg"
        imageAlt=""
      />

      <section className="section" aria-label="Contact details and form">
        <div className="shell">
          <div className={contactStyles.grid}>
            {/* --- details --- */}
            <div className={contactStyles.details}>
              <h2 className={contactStyles.detailsTitle}>Reach us directly</h2>

              <dl className={contactStyles.list}>
                {business.phone ? (
                  <div className={contactStyles.item}>
                    <dt>Phone</dt>
                    <dd>
                      <a href={`tel:${business.phone.e164}`}>{business.phone.display}</a>
                    </dd>
                  </div>
                ) : null}

                {business.whatsapp ? (
                  <div className={contactStyles.item}>
                    <dt>WhatsApp</dt>
                    <dd>
                      <a
                        href={business.whatsapp.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {business.whatsapp.display}
                        <span className="visuallyHidden"> (opens in a new tab)</span>
                      </a>
                    </dd>
                  </div>
                ) : null}

                {business.email ? (
                  <div className={contactStyles.item}>
                    <dt>Email</dt>
                    <dd>
                      <a href={`mailto:${business.email}`}>{business.email}</a>
                    </dd>
                  </div>
                ) : null}

                <div className={contactStyles.item}>
                  <dt>Location</dt>
                  <dd>
                    {business.city}, {business.country}
                  </dd>
                </div>

                {business.hours.length > 0 ? (
                  <div className={contactStyles.item}>
                    <dt>Opening</dt>
                    <dd>
                      {business.hours.map((row) => (
                        <span key={row.days} className={contactStyles.hoursRow}>
                          {row.days}: {row.opens}–{row.closes}
                        </span>
                      ))}
                    </dd>
                  </div>
                ) : null}
              </dl>

              {!(business.phone || business.whatsapp || business.email) ? (
                <p className={contactStyles.notice}>
                  Phone and WhatsApp details are being finalised — the message
                  form is the fastest way to reach us right now.
                </p>
              ) : null}
            </div>

            {/* --- form --- */}
            <div className={contactStyles.formCol}>
              {formEnabled ? (
                <ContactForm turnstileSiteKey={turnstileSiteKey} />
              ) : (
                <div className={contactStyles.fallback}>
                  <h2 className={contactStyles.detailsTitle}>Online messaging is not switched on yet</h2>
                  <p className="lede">
                    Please reach us by phone or WhatsApp — the details are
                    above — or visit us in Karongi on the shores of Lake Kivu.
                  </p>
                </div>
              )}
            </div>
          </div>

          <p className={`sectionMore ${styles.spacerTop}`}>
            <Link href="/" className="sectionMoreLink">
              ← Back to home
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
