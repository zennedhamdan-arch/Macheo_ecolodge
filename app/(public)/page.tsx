import { SECTION_IDS, introduction } from "@/data/site";
import {
  getAccommodations,
  getExperiences,
  getHeroMedia,
  getSiteContent,
} from "@/lib/content";
import Hero from "@/components/Hero";
import DiscoverGrid from "@/components/DiscoverGrid";
import AccommodationCards from "@/components/AccommodationCards";
import ExperienceCards from "@/components/ExperienceCards";
import DiningPreview from "@/components/DiningPreview";
import PhotoShowcase from "@/components/PhotoShowcase";
import LocationSection from "@/components/LocationSection";
import FinalCta from "@/components/FinalCta";
import Link from "next/link";

/**
 * The Macheo homepage — cinematic but light.
 *
 * Server-rendered end to end: the hero media decision, the featured
 * accommodation and the experiences all come from the content layer (database
 * when configured, committed defaults otherwise). Nothing here blocks on an
 * admin-only API — every query runs on the public anon client.
 *
 * `revalidate = 60`: content reads use the cookie-less public client, so the
 * page stays statically rendered and is served from the CDN. An edit in the
 * dashboard appears within a minute.
 */
export const revalidate = 60;

/** How many featured items each strip shows before linking to its page. */
const FEATURED_LIMIT = 3;

export default async function HomePage(): Promise<React.JSX.Element> {
  const [heroMedia, content, accommodationRows, experienceRows] = await Promise.all([
    getHeroMedia(),
    getSiteContent(),
    getAccommodations(),
    getExperiences(),
  ]);

  /* Featured accommodation: owner-curated first, newest fallback after,
     rooms and camping mixed — the homepage shows the breadth of Macheo. */
  const curated = accommodationRows.filter((row) => row.featured);
  const featuredAccommodation = (
    curated.length > 0 ? curated : accommodationRows
  ).slice(0, FEATURED_LIMIT);

  const featuredExperiences = experienceRows.filter((row) => row.active !== false).slice(0, FEATURED_LIMIT);

  const introHeading = content.intro_heading ?? introduction.headline;
  const introBody =
    content.intro_body ??
    "Macheo is a place on the water's edge — rooms and tents among the gardens, a table worth lingering over, and the lake setting the pace of the day. Come for the views, stay for the quiet, leave with a plan to return.";

  return (
    <>
      <span id={SECTION_IDS.hero} />
      <main id="main">
        <Hero
          media={heroMedia}
          title={content.hero_title}
          subtitle={content.hero_subtitle}
          scrollTargetId={SECTION_IDS.discover}
        />

        {/* ------------------------------------------------ Introduction */}
        <section className="section" aria-labelledby="intro-heading">
          <div className="shell">
            <div className="introGrid">
              <p className="eyebrow">{introduction.eyebrow}</p>
              <h2 id="intro-heading" className="displayHeading">
                {introHeading}
              </h2>
              <p className="lede">{introBody}</p>
              <p className="homeNote">
                Stay · Camp · Eat &amp; Drink · Explore — on the shores of Lake Kivu.
              </p>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ Discover */}
        <section
          id={SECTION_IDS.discover}
          className="section sectionTint"
          aria-labelledby="discover-heading"
        >
          <div className="shell">
            <div className="sectionHead">
              <p className="eyebrow">Discover</p>
              <h2 id="discover-heading" className="displayHeading">
                Find your way around Macheo.
              </h2>
            </div>
            <DiscoverGrid />
          </div>
        </section>

        {/* ----------------------------------------- Featured accommodation */}
        <section className="section" aria-labelledby="stay-heading">
          <div className="shell">
            <div className="sectionHead">
              <p className="eyebrow">Stay &amp; Camp</p>
              <h2 id="stay-heading" className="displayHeading">
                Sleep close to the water.
              </h2>
            </div>
            <AccommodationCards
              rows={featuredAccommodation}
              basePath="/stay"
              emptyMessage="Our rooms and camping options are being prepared for the website — contact us and we will gladly help you plan your stay."
            />
            <p className="sectionMore">
              <Link href="/stay" className="sectionMoreLink">
                See all accommodation →
              </Link>
              <Link href="/camping" className="sectionMoreLink">
                Explore camping →
              </Link>
            </p>
          </div>
        </section>

        {/* ------------------------------------------- Featured experiences */}
        <section className="section sectionTint" aria-labelledby="experiences-heading">
          <div className="shell">
            <div className="sectionHead">
              <p className="eyebrow">Experiences</p>
              <h2 id="experiences-heading" className="displayHeading">
                Days on the lake and in the hills.
              </h2>
            </div>
            <ExperienceCards
              rows={featuredExperiences}
              emptyMessage="Boat trips, cycling and nature experiences are being prepared for the website — ask us what's on when you book."
            />
            <p className="sectionMore">
              <Link href="/experiences" className="sectionMoreLink">
                All experiences →
              </Link>
            </p>
          </div>
        </section>

        {/* ------------------------------------------------- Dining preview */}
        <section className="section" aria-label="Restaurant and bar preview">
          <div className="shell">
            <DiningPreview />
          </div>
        </section>

        {/* -------------------------------------------------- Photo preview */}
        <section className="section sectionTint" aria-label="Gallery preview">
          <div className="shell">
            <PhotoShowcase />
          </div>
        </section>

        {/* -------------------------------------------------------- Location */}
        <LocationSection />

        {/* ------------------------------------------------------- Final CTA */}
        <FinalCta />
      </main>
    </>
  );
}
