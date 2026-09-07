import Link from "next/link";

import SiteImage from "@/components/SiteImage";
import { getFeaturedGallery, getGalleryItems } from "@/lib/content";
import type { GalleryItemRow } from "@/lib/supabase/types";
import { gallery as galleryCopy } from "@/data/site";
import styles from "./PhotoShowcase.module.css";

/** Curated selection size — the homepage never dumps the whole archive. */
const SHOWCASE_LIMIT = 6;

/** Fallback selection before any photos are curated in the dashboard. */
const STATIC_SELECTION = [
  { src: "/images/macheo/lake-mountains.jpg", alt: "Lake Kivu and the surrounding mountains" },
  { src: "/images/macheo/camping-tents.jpg", alt: "Camping tents near the lake at dusk" },
  { src: "/images/macheo/boat-lake.jpg", alt: "A boat crossing Lake Kivu in the morning light" },
  { src: "/images/macheo/room-lake.jpg", alt: "A comfortable room at the ecolodge" },
  { src: "/images/macheo/restaurant-terrace.jpg", alt: "The restaurant terrace at dusk" },
  { src: "/images/macheo/garden-path.jpg", alt: "A garden path at Macheo" },
] as const;

function altFor(row: GalleryItemRow): string {
  if (row.alt_text.trim().length > 0) return row.alt_text;
  if (row.caption && row.caption.trim().length > 0) return row.caption;
  return row.category
    ? `Macheo Ecolodge & Camping — ${row.category.toLowerCase()}`
    : "Macheo Ecolodge & Camping";
}

/**
 * The homepage photo strip: a small, curated taste of the gallery. The full
 * collection lives on /gallery — one click away, never duplicated here.
 */
export default async function PhotoShowcase(): Promise<React.JSX.Element> {
  const featured = await getFeaturedGallery(SHOWCASE_LIMIT);
  const rows =
    featured.length > 0 ? featured : (await getGalleryItems()).slice(0, SHOWCASE_LIMIT);

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <p className="eyebrow">{galleryCopy.eyebrow}</p>
          <h2 className={styles.headline}>{galleryCopy.headline}</h2>
          <p className={styles.lede}>{galleryCopy.lede}</p>
        </div>
        <Link href="/gallery" className={styles.cta}>
          {galleryCopy.cta}
        </Link>
      </div>

      {rows.length > 0 ? (
        <ul className={styles.grid}>
          {rows.map((row) => (
            <li key={row.id} className={styles.frame}>
              <SiteImage
                src={row.image_url}
                alt={altFor(row)}
                fill
                sizes="(max-width: 700px) 50vw, 33vw"
              />
              {row.caption ? <span className={styles.caption}>{row.caption}</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <ul className={styles.grid}>
          {STATIC_SELECTION.map((img) => (
            <li key={img.src} className={styles.frame}>
              <SiteImage src={img.src} alt={img.alt} fill sizes="(max-width: 700px) 50vw, 33vw" />
            </li>
          ))}
        </ul>
      )}

      <p className={styles.more}>
        <Link href="/gallery" className={styles.moreLink}>
          {galleryCopy.cta} →
        </Link>
      </p>
    </div>
  );
}
