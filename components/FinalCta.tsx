import Link from "next/link";

import { finalCta } from "@/data/site";
import { getLodge } from "@/lib/content";
import styles from "./FinalCta.module.css";

/**
 * The closing band: PLAN YOUR ESCAPE.
 * Three doors out — the reservation form, the contact page, or WhatsApp
 * (the WhatsApp button only renders when the business has configured a
 * number).
 */
export default async function FinalCta(): Promise<React.JSX.Element> {
  const business = await getLodge();

  return (
    <section className={styles.section} aria-labelledby="final-cta-heading">
      <div className={`shell ${styles.inner}`}>
        <p className="eyebrow">{finalCta.eyebrow}</p>
        <h2 id="final-cta-heading" className={styles.headline}>
          {finalCta.headline}
        </h2>
        <p className={styles.body}>{finalCta.body}</p>

        <div className={styles.actions}>
          <Link href="/reservation" className={styles.primary}>
            Plan Your Stay
          </Link>
          <Link href="/contact" className={styles.secondary}>
            Contact Us
          </Link>
          {business.whatsapp ? (
            <a
              href={business.whatsapp.href}
              className={styles.secondary}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
              <span className="visuallyHidden"> (opens in a new tab)</span>
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
