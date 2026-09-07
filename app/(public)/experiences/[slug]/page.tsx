import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import SiteImage from "@/components/SiteImage";
import { getExperiences, getLodge, formatPrice, slugify } from "@/lib/content";
import styles from "@/components/ListingPage.module.css";

export const revalidate = 60;

/** Experiences carry no slug column; the URL is derived from the title. */
async function findBySlug(slug: string) {
  const rows = await getExperiences();
  return rows.find((row) => slugify(row.title, row.id) === slug) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const row = await findBySlug(slug);
  if (!row) return { title: "Experience not found" };
  return {
    title: `${row.title} — Experiences at Macheo`,
    description: row.description?.slice(0, 155) ?? `${row.title} at Macheo on Lake Kivu.`,
  };
}

/** /experiences/[slug] — one experience, fully admin-managed. */
export default async function ExperienceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const row = await findBySlug(slug);
  if (!row) notFound();

  const business = await getLodge();
  const price = formatPrice(row.price);
  const whatsappHref = business.whatsapp
    ? `${business.whatsapp.href}?text=${encodeURIComponent(
        `Hello Macheo, I'd like to ask about the "${row.title}" experience.`,
      )}`
    : null;

  return (
    <main id="main" className={styles.detail}>
      <div className="shell">
        <Link href="/experiences" className={styles.backLink}>
          ← Back to experiences
        </Link>

        <div className={styles.detailGrid}>
          <div className={styles.detailMedia}>
            {row.image_url ? (
              <div className={styles.detailImage}>
                <SiteImage
                  src={row.image_url}
                  alt={row.title}
                  fill
                  priority
                  sizes="(max-width: 960px) 100vw, 55vw"
                />
              </div>
            ) : null}
          </div>

          <div className={styles.detailBody}>
            <h1 className={styles.detailTitle}>{row.title}</h1>
            {row.category ? <p className={styles.detailTagline}>{row.category}</p> : null}

            {row.description ? (
              <p className={styles.detailDescription}>{row.description}</p>
            ) : null}

            <ul className={styles.factList} aria-label="Details">
              {row.duration ? (
                <li>
                  <span className={styles.factLabel}>Duration</span>
                  <span>{row.duration}</span>
                </li>
              ) : null}
              <li>
                <span className={styles.factLabel}>Price</span>
                <span>{price ?? "Details on request"}</span>
              </li>
            </ul>

            <div className={styles.detailActions}>
              <Link
                href={`/reservation?experience=${encodeURIComponent(row.title)}`}
                className={styles.primaryBtn}
              >
                Include in my stay
              </Link>
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  className={styles.secondaryBtn}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ask on WhatsApp
                </a>
              ) : (
                <Link href="/contact" className={styles.secondaryBtn}>
                  Ask a question
                </Link>
              )}
            </div>

            <p className={styles.availabilityNote}>
              Experiences are arranged for our guests — availability is confirmed
              when you book or inquire.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
