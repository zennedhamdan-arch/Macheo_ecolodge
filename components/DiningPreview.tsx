import Image from "next/image";
import Link from "next/link";

import { diningPreview } from "@/data/site";
import styles from "./DiningPreview.module.css";

/**
 * Restaurant & Bar preview on the homepage — food, drinks, atmosphere.
 * Static local photography here; the full (admin-managed) story lives on
 * /restaurant.
 */
export default function DiningPreview(): React.JSX.Element {
  return (
    <div className={styles.wrap}>
      <div className={styles.images}>
        {diningPreview.images.map((img, index) => (
          <div
            key={img.src}
            className={styles.frame}
            data-index={index}
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              sizes="(max-width: 900px) 90vw, 30vw"
            />
          </div>
        ))}
      </div>

      <div className={styles.copy}>
        <p className="eyebrow">{diningPreview.eyebrow}</p>
        <h2 className={styles.headline}>{diningPreview.headline}</h2>
        <p className={styles.body}>{diningPreview.body}</p>
        <Link href="/restaurant" className={styles.cta}>
          {diningPreview.cta}
        </Link>
      </div>
    </div>
  );
}
