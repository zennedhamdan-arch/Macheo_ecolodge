import Image from "next/image";
import Link from "next/link";

import { discoverCards } from "@/data/site";
import styles from "./DiscoverGrid.module.css";

/**
 * "Discover Macheo" — the five doors into the site: Stay, Camp, Eat & Drink,
 * Explore, Experience. Each card is a big, tappable link to its page.
 */
export default function DiscoverGrid(): React.JSX.Element {
  return (
    <div className={styles.grid}>
      {discoverCards.map((card, index) => (
        <Link
          key={card.id}
          href={card.href}
          className={styles.card}
          data-feature={index === 0 ? "true" : "false"}
        >
          <span className={styles.media}>
            <Image
              src={card.image}
              alt={card.imageAlt}
              fill
              sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
            />
          </span>
          <span className={styles.body}>
            <span className={styles.title}>{card.title}</span>
            <span className={styles.text}>{card.body}</span>
            <span className={styles.more} aria-hidden="true">
              Discover →
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
