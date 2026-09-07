import Link from "next/link";

import SiteImage from "@/components/SiteImage";
import type { AccommodationRow } from "@/lib/supabase/types";
import { formatPrice } from "@/lib/content";
import styles from "./AccommodationCards.module.css";

type Props = Readonly<{
  rows: readonly AccommodationRow[];
  /** URL base for detail pages: "/stay" or "/camping". */
  basePath: string;
  emptyMessage?: string;
}>;

/**
 * Accommodation cards — rooms on /stay, tents on /camping, highlights on the
 * homepage. The data is always admin-managed; when nothing is published yet
 * the section says so honestly instead of inventing rooms.
 */
export default function AccommodationCards({
  rows,
  basePath,
  emptyMessage,
}: Props): React.JSX.Element {
  if (rows.length === 0) {
    return (
      <p className={styles.empty}>
        {emptyMessage ??
          "Our accommodation details are being prepared — contact us and we will gladly help you plan."}
      </p>
    );
  }

  return (
    <ul className={styles.grid}>
      {rows.map((row) => {
        const image = row.images[0] ?? null;
        const price = formatPrice(row.price);

        return (
          <li key={row.id} className={styles.card}>
            <div className={styles.media}>
              <SiteImage
                src={image}
                alt={`${row.name} at Macheo Ecolodge & Camping`}
                fill
                sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
              />
              {!row.available ? (
                <span className={styles.badge} data-tone="quiet">
                  Currently unavailable
                </span>
              ) : null}
            </div>

            <div className={styles.body}>
              <h3 className={styles.name}>{row.name}</h3>
              {row.tagline ? <p className={styles.tagline}>{row.tagline}</p> : null}

              <ul className={styles.meta} aria-label="At a glance">
                {row.capacity ? (
                  <li>
                    <span aria-hidden="true">👥</span> Sleeps {row.capacity}
                  </li>
                ) : null}
                {row.beds ? (
                  <li>
                    <span aria-hidden="true">🛏</span> {row.beds}
                  </li>
                ) : null}
                {row.kind === "camping" && row.tent_info ? (
                  <li>
                    <span aria-hidden="true">⛺</span> {row.tent_info}
                  </li>
                ) : null}
              </ul>

              {row.amenities.length > 0 ? (
                <ul className={styles.amenities} aria-label="Amenities">
                  {row.amenities.slice(0, 4).map((amenity) => (
                    <li key={amenity}>{amenity}</li>
                  ))}
                </ul>
              ) : null}

              <div className={styles.footer}>
                <span className={styles.price}>
                  {price ? `From ${price}` : "Price on request"}
                </span>
                <span className={styles.links}>
                  <Link href={`${basePath}/${row.slug}`} className={styles.detailLink}>
                    View details
                  </Link>
                  <Link href={`/reservation?stay=${encodeURIComponent(row.name)}`} className={styles.bookLink}>
                    Request to book
                  </Link>
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
