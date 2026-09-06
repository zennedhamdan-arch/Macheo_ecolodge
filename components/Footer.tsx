import Link from "next/link";

import { addressLine, telHref } from "@/data/macheo";
import { footerLinks, legal } from "@/data/site";
import { directionsAction } from "@/lib/actions";
import { getLodge, getSiteContent, getSocialLinks } from "@/lib/content";
import BrandMark from "./BrandMark";
import styles from "./Footer.module.css";

/**
 * The site footer.
 *
 * Every row of contact information renders only when a value actually exists
 * (committed defaults or admin-configured) — the footer never shows a dead
 * phone number or an empty column.
 */
export default async function Footer(): Promise<React.JSX.Element> {
  const [business, socials, content] = await Promise.all([
    getLodge(),
    getSocialLinks(),
    getSiteContent(),
  ]);

  const year = new Date().getFullYear();
  const blurb = content.footer_text ?? business.tagline;
  const hasContact =
    business.phone || business.whatsapp || business.email || socials.length > 0;

  return (
    <footer className={styles.footer}>
      <div className="shell">
        <div className={styles.top}>
          <div className={styles.brandCol}>
            <BrandMark size="footer" stacked />
            {blurb ? <p className={styles.blurb}>{blurb}</p> : null}
            <p className={styles.place}>
              {business.city}, {business.country}
            </p>
          </div>

          <nav className={styles.linkCol} aria-label="Footer">
            <h2 className={styles.colTitle}>Explore</h2>
            <ul>
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={styles.link}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className={styles.linkCol} aria-label="Plan your stay">
            <h2 className={styles.colTitle}>Plan your stay</h2>
            <ul>
              <li>
                <Link href="/reservation" className={styles.link}>
                  Plan Your Stay
                </Link>
              </li>
              <li>
                <Link href="/stay" className={styles.link}>
                  Accommodation
                </Link>
              </li>
              <li>
                <Link href="/camping" className={styles.link}>
                  Camping
                </Link>
              </li>
              <li>
                <a href="/contact" className={styles.link}>
                  Contact us
                </a>
              </li>
            </ul>
          </nav>

          {hasContact ? (
            <div className={styles.contactCol}>
              <h2 className={styles.colTitle}>Contact</h2>
              <ul>
                {business.phone && telHref ? (
                  <li>
                    <a href={telHref} className={styles.link}>
                      {business.phone.display}
                    </a>
                  </li>
                ) : null}
                {business.whatsapp ? (
                  <li>
                    <a
                      href={business.whatsapp.href}
                      className={styles.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      WhatsApp {business.whatsapp.display}
                    </a>
                  </li>
                ) : null}
                {business.email ? (
                  <li>
                    <a href={`mailto:${business.email}`} className={styles.link}>
                      {business.email}
                    </a>
                  </li>
                ) : null}
                {socials.map((social) => (
                  <li key={social.href}>
                    <a
                      href={social.href}
                      className={styles.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${social.label} (opens in a new tab)`}
                    >
                      {social.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className={styles.visitCol}>
            <h2 className={styles.colTitle}>Visit</h2>
            <address className={styles.address}>
              {business.name}
              <br />
              {addressLine}
            </address>
            {business.hours.length > 0 ? (
              <ul className={styles.hours}>
                {business.hours.map((row) => (
                  <li key={row.days}>
                    <span>{row.days}</span>
                    <span className={styles.hoursTime}>
                      {row.opens}–{row.closes}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            {directionsAction ? (
              <a
                href={directionsAction.href}
                className={styles.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                {directionsAction.label}
              </a>
            ) : null}
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copyright}>
            © {year} {business.legalName ?? business.name}. {business.city},{" "}
            {business.country}.
          </p>
          <ul className={styles.legal}>
            <li>
              <a href={legal.privacyHref} className={styles.link}>
                Privacy
              </a>
            </li>
            <li>
              <a href={legal.termsHref} className={styles.link}>
                Terms
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
