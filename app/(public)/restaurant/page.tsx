import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import PageHero from "@/components/PageHero";
import Menu from "@/components/Menu";
import { getMenu } from "@/lib/content";
import { MENU_STATUS } from "@/data/menu";
import styles from "@/components/ListingPage.module.css";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Restaurant & Bar at Macheo",
  description:
    "The restaurant and bar at Macheo Ecolodge & Camping — fresh plates, cool drinks and sundowners with Lake Kivu views.",
  openGraph: {
    title: "Restaurant & Bar | Macheo Ecolodge & Camping",
    description:
      "Fresh plates, cool drinks and sundowners with Lake Kivu views at Macheo.",
  },
};

/**
 * /restaurant — RESTAURANT, BAR, ATMOSPHERE and a FOOD & DRINK GALLERY
 * teaser. The menu itself is admin-managed (three-level structure in the
 * database); until the owners publish their own, the neutral demo menu is
 * shown with a clear notice and no invented prices.
 */
export default async function RestaurantPage(): Promise<React.JSX.Element> {
  const categories = await getMenu();

  return (
    <main id="main">
      <PageHero
        eyebrow="Restaurant & Bar"
        title="Eat well, drink slowly."
        lede="Fresh plates and cool drinks, served with the lake in the background — from first coffee to last light."
        image="/images/macheo/restaurant-terrace.jpg"
        imageAlt=""
      />

      {/* ------------------------------------------------------ RESTAURANT */}
      <section className="section" aria-labelledby="restaurant-heading">
        <div className="shell">
          <div className="sectionHead">
            <p className="eyebrow">Restaurant</p>
            <h2 id="restaurant-heading" className="displayHeading">
              From the kitchen.
            </h2>
          </div>

          {MENU_STATUS.isPlaceholder ? (
            <p className="contentNotice">{MENU_STATUS.notice}</p>
          ) : null}

          <Menu categories={categories} label="Food and drink categories" />
        </div>
      </section>

      {/* ------------------------------------------------------------- BAR */}
      <section className="section sectionTint" aria-labelledby="bar-heading">
        <div className="shell">
          <div className={styles.splitRow}>
            <div className={styles.splitMedia}>
              <Image
                src="/images/macheo/bar-drinks.jpg"
                alt="Drinks served at the Macheo bar"
                fill
                sizes="(max-width: 940px) 100vw, 45vw"
              />
            </div>
            <div>
              <p className="eyebrow">Bar</p>
              <h2 id="bar-heading" className="displayHeading">
                The bar keeps lake time.
              </h2>
              <p className={styles.splitBody}>
                Rwandan coffee in the morning, fresh juice through the heat of
                the day, and a cold drink when the light goes gold. The bar is
                where the day&apos;s plans get made and the evening&apos;s stories get
                told.
              </p>
              <p className={styles.splitBody}>
                Ask about the current selection of beers, wines and cocktails —
                and the mocktails are given just as much care.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- ATMOSPHERE */}
      <section className="section" aria-labelledby="atmosphere-heading">
        <div className="shell">
          <div className="sectionHead">
            <p className="eyebrow">Atmosphere</p>
            <h2 id="atmosphere-heading" className="displayHeading">
              Unhurried, by design.
            </h2>
            <p className="lede">
              Lanterns on wooden tables, gardens around you, the water going
              quiet at dusk. Dinner at Macheo is not a course to rush through —
              it is the evening itself.
            </p>
          </div>
          <div className={styles.atmosphereGrid}>
            <div className={styles.atmFrame} data-wide="true">
              <Image
                src="/images/macheo/restaurant-terrace.jpg"
                alt="The terrace set for dinner at dusk"
                fill
                sizes="(max-width: 940px) 100vw, 60vw"
              />
            </div>
            <div className={styles.atmFrame}>
              <Image
                src="/images/macheo/food-plate.jpg"
                alt="A freshly prepared plate from the kitchen"
                fill
                sizes="(max-width: 940px) 100vw, 38vw"
              />
            </div>
            <div className={styles.atmFrame}>
              <Image
                src="/images/macheo/garden-path.jpg"
                alt="The garden beside the restaurant"
                fill
                sizes="(max-width: 940px) 100vw, 38vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------ FOOD & DRINK GALLERY */}
      <section className="section sectionDark" aria-labelledby="food-gallery-heading">
        <div className="shell">
          <div className={styles.planCta}>
            <p className="eyebrow">Food &amp; drink gallery</p>
            <h2 id="food-gallery-heading" className="displayHeading">
              See the table for yourself.
            </h2>
            <p className={styles.planBody}>
              More photographs of the plates, the bar and the terrace live in
              the gallery, under Restaurant &amp; Bar.
            </p>
            <div className={styles.planActions}>
              <Link href="/gallery" className={styles.primaryBtn}>
                View full gallery
              </Link>
              <Link href="/reservation" className={styles.secondaryBtnInverse}>
                Plan Your Stay
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
