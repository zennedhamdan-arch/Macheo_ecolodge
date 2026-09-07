import Link from "next/link";

import SiteImage from "@/components/SiteImage";
import type { ExperienceRow } from "@/lib/supabase/types";
import { formatPrice, slugify } from "@/lib/content";
import styles from "./ExperienceCards.module.css";

type Props = Readonly<{
  rows: readonly ExperienceRow[];
  emptyMessage?: string;
  /** Hide the category chip (used in tight homepage strips). */
  compact?: boolean;
}>;

/**
 * Experience cards — boat trips, cycling, water and nature activities.
 * All content is admin-managed; the list renders an honest empty state
 * until experiences are published.
 */
export default function ExperienceCards({
  rows,
  emptyMessage,
  compact = false,
}: Props): React.JSX.Element {
  if (rows.length === 0) {
    return (
      <p className={styles.empty}>
        {emptyMessage ??
          "Our experiences are being prepared — ask us about lake and nature activities when you book."}
      </p>
    );
  }

  return (
    <ul className={compact ? `${styles.grid} ${styles.compact}` : styles.grid}>
      {rows.map((row) => {
        const slug = slugify(row.title, row.id);
        const price = formatPrice(row.price);

        return (
          <li key={row.id} className={styles.card}>
            <Link href={`/experiences/${slug}`} className={styles.media}>
              <SiteImage
                src={row.image_url}
                alt={row.title}
                fill
                sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
              />
              {row.category ? (
                <span className={styles.chip}>{row.category}</span>
              ) : null}
            </Link>

            <div className={styles.body}>
              <h3 className={styles.title}>
                <Link href={`/experiences/${slug}`}>{row.title}</Link>
              </h3>
              {row.description ? (
                <p className={styles.description}>{row.description}</p>
              ) : null}
              <p className={styles.meta}>
                {row.duration ? <span>{row.duration}</span> : null}
                {price ? <span>{price}</span> : <span>Details on request</span>}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
