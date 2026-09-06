import type { Metadata } from "next";
import Link from "next/link";

import PageHero from "@/components/PageHero";
import AccommodationCards from "@/components/AccommodationCards";
import { getAccommodations } from "@/lib/content";
import { lodge } from "@/data/macheo";
import styles from "@/components/ListingPage.module.css";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Stay at Macheo",
  description:
    "Rooms and accommodation at Macheo Ecolodge & Camping in Karongi, Lake Kivu — comfort surrounded by nature, close to the water.",
  openGraph: {
    title: "Stay at Macheo | Macheo Ecolodge & Camping",
    description:
      "Rooms and accommodation at Macheo Ecolodge & Camping on Lake Kivu — comfort surrounded by nature.",
  },
};

/**
 * /stay — every published room and accommodation option, admin-managed.
 * Nothing here is hard-coded inventory: an empty dashboard renders an honest
 * empty state, and new rooms appear within a minute of publishing.
 */
export default async function StayPage(): Promise<React.JSX.Element> {
  const rooms = await getAccommodations("room");

  return (
    <main id="main">
      <PageHero
        eyebrow="Stay"
        title="Stay at Macheo."
        lede="Comfortable rooms surrounded by gardens, with the lake and the hills on your doorstep."
        image="/images/macheo/room-lake.jpg"
        imageAlt=""
      />

      <section className="section" aria-labelledby="stay-list-heading">
        <div className="shell">
          <h2 id="stay-list-heading" className="visuallyHidden">
            Accommodation options
          </h2>
          <AccommodationCards
            rows={rooms}
            basePath="/stay"
            emptyMessage="Our rooms are being prepared for the website — contact us and we will gladly help you plan your stay."
          />
        </div>
      </section>

      <section className="section sectionTint" aria-labelledby="stay-amenities-heading">
        <div className="shell">
          <h2 id="stay-amenities-heading" className={`displayHeading ${styles.subHeading}`}>
            Every stay comes with the essentials.
          </h2>
          <ul className={styles.chipRow}>
            {lodge.facilities.map((facility) => (
              <li key={facility}>{facility}</li>
            ))}
          </ul>
          <p className={styles.note}>
            Looking to sleep even closer to nature?{" "}
            <Link href="/camping" className={styles.inlineCta}>
              Explore camping at Macheo →
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
