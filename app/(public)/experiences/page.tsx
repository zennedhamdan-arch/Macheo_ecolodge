import type { Metadata } from "next";
import Link from "next/link";

import PageHero from "@/components/PageHero";
import ExperienceCards from "@/components/ExperienceCards";
import { getExperiences } from "@/lib/content";
import type { ExperienceCategory } from "@/lib/supabase/types";
import styles from "@/components/ListingPage.module.css";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Experiences at Macheo",
  description:
    "Lake experiences, nature and adventure at Macheo Ecolodge & Camping — boat trips, cycling and water activities on Lake Kivu.",
  openGraph: {
    title: "Experiences at Macheo | Macheo Ecolodge & Camping",
    description:
      "Boat trips, cycling, water activities and nature experiences at Macheo on Lake Kivu.",
  },
};

const CATEGORIES: readonly { label: string; value: ExperienceCategory }[] = [
  { label: "Lake experiences", value: "Lake" },
  { label: "Nature", value: "Nature" },
  { label: "Adventure", value: "Adventure" },
  { label: "Local experiences", value: "Local" },
];

type SearchParams = Promise<{ category?: string }>;

/**
 * /experiences — every published experience, filterable by category through
 * a plain query string (works without JavaScript, keeps URLs shareable).
 * All rows are admin-managed; durations and prices only appear when the
 * business publishes them.
 */
export default async function ExperiencesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const { category } = await searchParams;
  const rows = await getExperiences();

  const active = CATEGORIES.find((c) => c.value === category)?.value ?? null;
  const visible = active ? rows.filter((row) => row.category === active) : rows;

  return (
    <main id="main">
      <PageHero
        eyebrow="Experiences"
        title="Days worth remembering."
        lede="The lake, the hills and the trail — choose how you want to spend your time at Macheo."
        image="/images/macheo/boat-lake.jpg"
        imageAlt=""
      />

      <section className="section" aria-labelledby="experiences-list-heading">
        <div className="shell">
          <h2 id="experiences-list-heading" className="visuallyHidden">
            Available experiences
          </h2>

          <nav className={styles.filterRow} aria-label="Filter experiences by category">
            <Link
              href="/experiences"
              className={styles.filterChip}
              data-active={active === null ? "true" : "false"}
            >
              All
            </Link>
            {CATEGORIES.map((c) => (
              <Link
                key={c.value}
                href={`/experiences?category=${c.value}`}
                className={styles.filterChip}
                data-active={active === c.value ? "true" : "false"}
              >
                {c.label}
              </Link>
            ))}
          </nav>

          <ExperienceCards
            rows={visible}
            emptyMessage={
              active
                ? "Nothing is published in this category yet — check back soon, or ask us what's possible."
                : undefined
            }
          />
        </div>
      </section>

      <section className="section sectionDark" aria-labelledby="inquire-heading">
        <div className="shell">
          <div className={styles.planCta}>
            <p className="eyebrow">Booking inquiry</p>
            <h2 id="inquire-heading" className="displayHeading">
              Have something specific in mind?
            </h2>
            <p className={styles.planBody}>
              Tell us which experience you are interested in and your dates —
              we will confirm availability and details.
            </p>
            <div className={styles.planActions}>
              <Link href="/reservation" className={styles.primaryBtn}>
                Plan Your Stay
              </Link>
              <Link href="/contact" className={styles.secondaryBtnInverse}>
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
