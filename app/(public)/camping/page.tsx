import type { Metadata } from "next";
import Link from "next/link";

import PageHero from "@/components/PageHero";
import AccommodationCards from "@/components/AccommodationCards";
import { getAccommodations, getSiteContent } from "@/lib/content";
import styles from "@/components/ListingPage.module.css";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Camping at Macheo",
  description:
    "Camp under the Rwandan sky at Macheo Ecolodge & Camping — tent options near Lake Kivu, with the comfort of the lodge close by.",
  openGraph: {
    title: "Camping at Macheo | Macheo Ecolodge & Camping",
    description:
      "Camp under the Rwandan sky near Lake Kivu — tent options with the comfort of the lodge close by.",
  },
};

/** Why-camp pillars. Copy stays neutral: nature, comfort nearby, community table. */
const WHY_CAMP = [
  {
    title: "Sleep closer to nature",
    body: "The sounds of the lake at night, the light of the hills at dawn — camping puts you right in it.",
  },
  {
    title: "Comfort within reach",
    body: "You are never far from the restaurant, the bar and the lodge's facilities — wild enough, not too wild.",
  },
  {
    title: "A base for adventure",
    body: "Boat trips, cycling and the Congo-Nile Trail start at the doorstep. Pitch once, explore daily.",
  },
];

const WHAT_TO_EXPECT = [
  "Camping spots on green ground near the lake",
  "Access to the lodge's restaurant and bar",
  "Lake and mountain views from camp",
  "Help from our team — before, during and after your stay",
];

/**
 * /camping — a dedicated page because camping is one of Macheo's big
 * differences. The camping OPTIONS themselves are admin-managed rows
 * (accommodations.kind = 'camping'); the surrounding sections are editable
 * through Site content where the business has provided words, and honest,
 * neutral defaults otherwise.
 */
export default async function CampingPage(): Promise<React.JSX.Element> {
  const [tents, content] = await Promise.all([getAccommodations("camping"), getSiteContent()]);

  const natureCopy =
    content.about_nature ??
    "Camp days at Macheo follow the lake: swims and boat time when the water is calm, walks in the gardens when it isn't, and evenings that end around good food with the hills going dark.";

  return (
    <main id="main">
      <PageHero
        eyebrow="Camping"
        title="Camp under the Rwandan sky."
        lede="Tents, open air and Lake Kivu — with the comfort of the lodge never far away."
        image="/images/macheo/camping-tents.jpg"
        imageAlt=""
      />

      {/* WHY CAMP AT MACHEO */}
      <section className="section" aria-labelledby="why-camp-heading">
        <div className="shell">
          <div className="sectionHead">
            <p className="eyebrow">Why camp at Macheo</p>
            <h2 id="why-camp-heading" className="displayHeading">
              The outdoors, done gently.
            </h2>
          </div>
          <div className={styles.whyGrid}>
            {WHY_CAMP.map((item) => (
              <article key={item.title} className={styles.whyCard}>
                <h3 className={styles.whyTitle}>{item.title}</h3>
                <p className={styles.whyBody}>{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CAMPING OPTIONS — admin-managed */}
      <section className="section sectionTint" aria-labelledby="camping-options-heading">
        <div className="shell">
          <div className="sectionHead">
            <p className="eyebrow">Camping options</p>
            <h2 id="camping-options-heading" className="displayHeading">
              Choose your camp.
            </h2>
          </div>
          <AccommodationCards
            rows={tents}
            basePath="/camping"
            emptyMessage="Our camping options are being prepared for the website — contact us to plan your camping experience."
          />
        </div>
      </section>

      {/* WHAT TO EXPECT */}
      <section className="section" aria-labelledby="expect-heading">
        <div className="shell">
          <div className="sectionHead">
            <p className="eyebrow">What to expect</p>
            <h2 id="expect-heading" className="displayHeading">
              Simple, looked after, real.
            </h2>
          </div>
          <ul className={styles.expectList}>
            {WHAT_TO_EXPECT.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* NATURE EXPERIENCE */}
      <section className="section sectionTint" aria-labelledby="nature-heading">
        <div className="shell">
          <div className="sectionHead">
            <p className="eyebrow">Nature experience</p>
            <h2 id="nature-heading" className="displayHeading">
              The lake sets the rhythm.
            </h2>
          </div>
          <p className="lede">{natureCopy}</p>
        </div>
      </section>

      {/* GALLERY teaser */}
      <section className="section" aria-label="Camping gallery">
        <div className="shell">
          <div className={styles.galleryTeaser}>
            <div className={styles.teaserFrame}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/macheo/camping-tents.jpg" alt="Tents at dusk with the lake behind" loading="lazy" />
            </div>
            <div className={styles.teaserFrame}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/macheo/lake-mountains.jpg" alt="Lake Kivu and the mountains" loading="lazy" />
            </div>
            <div className={styles.teaserFrame}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/macheo/garden-path.jpg" alt="The garden path at Macheo" loading="lazy" />
            </div>
          </div>
          <p className={styles.sectionMoreCenter}>
            <Link href="/gallery" className="sectionMoreLink">
              View full gallery →
            </Link>
          </p>
        </div>
      </section>

      {/* PLAN YOUR CAMPING EXPERIENCE */}
      <section className="section sectionDark" aria-labelledby="plan-camping-heading">
        <div className="shell">
          <div className={styles.planCta}>
            <p className="eyebrow">Plan your camping experience</p>
            <h2 id="plan-camping-heading" className="displayHeading">
              Ready to sleep under the stars?
            </h2>
            <p className={styles.planBody}>
              Tell us your dates and how many of you are coming — we will take
              it from there.
            </p>
            <div className={styles.planActions}>
              <Link href="/reservation?interest=camping" className={styles.primaryBtn}>
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
