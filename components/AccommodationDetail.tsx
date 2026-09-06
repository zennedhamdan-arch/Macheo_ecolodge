import Image from "next/image";
import Link from "next/link";

import type { AccommodationRow } from "@/lib/supabase/types";
import { formatPrice } from "@/lib/content";
import styles from "./ListingPage.module.css";

type Props = Readonly<{
  row: AccommodationRow;
  /** "/stay" or "/camping" — where the back link returns to. */
  basePath: string;
  backLabel: string;
}>;

/**
 * The detail view shared by /stay/[slug] and /camping/[slug]. All content
 * comes from the admin-managed accommodations table.
 */
export default function AccommodationDetail({
  row,
  basePath,
  backLabel,
}: Props): React.JSX.Element {
  const [lead, ...rest] = row.images;
  const price = formatPrice(row.price);

  return (
    <main id="main" className={styles.detail}>
      <div className="shell">
        <Link href={basePath} className={styles.backLink}>
          ← {backLabel}
        </Link>

        <div className={styles.detailGrid}>
          <div className={styles.detailMedia}>
            {lead ? (
              <div className={styles.detailImage}>
                <Image
                  src={lead}
                  alt={`${row.name} at Macheo Ecolodge & Camping`}
                  fill
                  priority
                  sizes="(max-width: 960px) 100vw, 55vw"
                />
              </div>
            ) : null}
            {rest.length > 0 ? (
              <div className={styles.thumbRow}>
                {rest.map((src, index) => (
                  <div key={`${src}-${index}`} className={styles.thumb}>
                    <Image
                      src={src}
                      alt={`${row.name} — photo ${index + 2}`}
                      fill
                      sizes="120px"
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className={styles.detailBody}>
            <h1 className={styles.detailTitle}>{row.name}</h1>
            {row.tagline ? <p className={styles.detailTagline}>{row.tagline}</p> : null}

            {row.description ? (
              <p className={styles.detailDescription}>{row.description}</p>
            ) : null}

            <ul className={styles.factList} aria-label="Details">
              {row.capacity ? (
                <li>
                  <span className={styles.factLabel}>Sleeps</span>
                  <span>
                    {row.capacity} {row.capacity === 1 ? "guest" : "guests"}
                  </span>
                </li>
              ) : null}
              {row.beds ? (
                <li>
                  <span className={styles.factLabel}>Beds</span>
                  <span>{row.beds}</span>
                </li>
              ) : null}
              {row.kind === "camping" && row.tent_info ? (
                <li>
                  <span className={styles.factLabel}>Tent</span>
                  <span>{row.tent_info}</span>
                </li>
              ) : null}
              <li>
                <span className={styles.factLabel}>Price</span>
                <span>{price ? `From ${price}` : "Price on request"}</span>
              </li>
              <li>
                <span className={styles.factLabel}>Availability</span>
                <span>{row.available ? "Accepting booking requests" : "Currently unavailable"}</span>
              </li>
            </ul>

            {row.amenities.length > 0 ? (
              <ul className={styles.chipRow} aria-label="Amenities">
                {row.amenities.map((amenity) => (
                  <li key={amenity}>{amenity}</li>
                ))}
              </ul>
            ) : null}

            <div className={styles.detailActions}>
              {row.available ? (
                <Link
                  href={`/reservation?stay=${encodeURIComponent(row.name)}`}
                  className={styles.primaryBtn}
                >
                  Request to book
                </Link>
              ) : null}
              <Link href="/contact" className={styles.secondaryBtn}>
                Ask a question
              </Link>
            </div>

            <p className={styles.availabilityNote}>
              Booking requests are confirmed by our team — usually by phone or
              WhatsApp — rather than charged online.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
