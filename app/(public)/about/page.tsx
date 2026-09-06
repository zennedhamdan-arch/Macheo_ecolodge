import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import PageHero from "@/components/PageHero";
import { getSiteContent } from "@/lib/content";
import { lodge } from "@/data/macheo";
import styles from "@/components/ListingPage.module.css";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "About Macheo",
  description:
    "Macheo Ecolodge & Camping — a natural, peaceful place on the shores of Lake Kivu in Karongi, Rwanda. Stay, camp, eat and explore.",
  openGraph: {
    title: "About | Macheo Ecolodge & Camping",
    description:
      "The story, the place and the philosophy behind Macheo on Lake Kivu.",
  },
};

/**
 * /about — words first, no invented history.
 *
 * Every section reads from the site_content table; the defaults below are
 * neutral, honest placeholders that the owners replace from Admin → Site
 * content. Nothing here claims a founding date, a family lineage or any
 * other fact that has not been confirmed.
 */
export default async function AboutPage(): Promise<React.JSX.Element> {
  const content = await getSiteContent();

  const sections = [
    {
      id: "story",
      eyebrow: "Our story",
      heading: "A place that grew around the lake.",
      body:
        content.about_story ??
        "Macheo began with a simple idea: a place on Lake Kivu where travellers could stay, camp and eat well — close to nature, far from noise. The rest has been growing ever since, season by season, guest by guest. (The full story will be told here in the owners' own words.)",
    },
    {
      id: "place",
      eyebrow: "Our place",
      heading: "Karongi, on the water's edge.",
      body:
        content.about_place ??
        "Macheo sits in Karongi district — Kibuye to those who know it — on Rwanda's western edge. The lake is the centre of everything here: the views, the food, the pace of the day, and the trails that lead out from the shore.",
    },
    {
      id: "philosophy",
      eyebrow: "Our philosophy",
      heading: "Premium, but never artificial.",
      body:
        content.about_philosophy ??
        "We believe comfort and nature belong together. Nothing at Macheo tries to be something it is not — the materials are natural, the welcome is warm, and the luxury is the place itself.",
    },
    {
      id: "nature",
      eyebrow: "Nature & hospitality",
      heading: "Eco is how we work, not a label.",
      body:
        content.about_nature ??
        "An ecolodge earns its name in small daily choices: how the garden is kept, how waste is handled, how the lake is treated, and how guests are invited to enjoy all of it gently. These choices are being documented here as the team formalises them.",
    },
    {
      id: "experience",
      eyebrow: "The Macheo experience",
      heading: "Stay, camp, eat, drink, explore.",
      body:
        content.about_experience ??
        "Days at Macheo can be as full or as quiet as you like — boat trips and cycling for the adventurous, a book on the terrace for the rest. What stays constant is the feeling of being looked after somewhere real.",
    },
  ];

  return (
    <main id="main">
      <PageHero
        eyebrow="About"
        title="Macheo, in its own words."
        lede="A natural, peaceful place on the shores of Lake Kivu — and the people who keep it."
        image="/images/macheo/garden-path.jpg"
        imageAlt=""
      />

      {sections.map((section, index) => (
        <section
          key={section.id}
          className={`section ${index % 2 === 1 ? "sectionTint" : ""}`}
          aria-labelledby={`about-${section.id}-heading`}
        >
          <div className="shell">
            <div className={styles.aboutBlock}>
              <p className="eyebrow">{section.eyebrow}</p>
              <h2 id={`about-${section.id}-heading`} className="displayHeading">
                {section.heading}
              </h2>
              <p className="lede">{section.body}</p>
            </div>
          </div>
        </section>
      ))}

      {/* Facilities strip — confirmed amenities, nothing invented. */}
      <section className="section sectionDark" aria-labelledby="about-facilities-heading">
        <div className="shell">
          <p className="eyebrow">What you will find here</p>
          <h2 id="about-facilities-heading" className="displayHeading">
            Simple things, done well.
          </h2>
          <ul className={styles.facilityGrid}>
            {lodge.facilities.map((facility) => (
              <li key={facility}>{facility}</li>
            ))}
          </ul>
          <div className={styles.planActions} style={{ marginTop: "2rem" }}>
            <Link href="/stay" className={styles.primaryBtn}>
              Stay at Macheo
            </Link>
            <Link href="/contact" className={styles.secondaryBtnInverse}>
              Get in touch
            </Link>
          </div>
        </div>
      </section>

      {/* A few real photographs. */}
      <section className="section" aria-label="Around Macheo">
        <div className="shell">
          <div className={styles.atmosphereGrid}>
            <div className={styles.atmFrame}>
              <Image
                src="/images/macheo/lake-mountains.jpg"
                alt="Lake Kivu and the surrounding mountains"
                fill
                sizes="(max-width: 940px) 100vw, 50vw"
              />
            </div>
            <div className={styles.atmFrame}>
              <Image
                src="/images/macheo/camping-tents.jpg"
                alt="Camping at Macheo near the lake"
                fill
                sizes="(max-width: 940px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
