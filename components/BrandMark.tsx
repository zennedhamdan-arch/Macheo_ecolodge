import Image from "next/image";

import { brand } from "@/data/site";
import { lodge } from "@/data/macheo";
import styles from "./BrandMark.module.css";

type BrandMarkSize = "hero" | "nav" | "footer";

type BrandMarkProps = Readonly<{
  size?: BrandMarkSize;
  className?: string;
  /** Forces the two-line lock-up. Ignored when a logo image is set. */
  stacked?: boolean;
}>;

/** Rendered height in CSS pixels, used for the `sizes` hint. */
const PIXEL_SIZE: Record<BrandMarkSize, number> = {
  hero: 132,
  nav: 44,
  footer: 84,
};

/**
 * The Macheo lock-up.
 *
 * Uses a logo image when one has been dropped into `public/images/`
 * (see `scripts/detect-logo.mjs`), otherwise a typographic lock-up:
 * "MACHEO" over a quiet "Ecolodge & Camping" — never an invented logo.
 */
export default function BrandMark({
  size = "nav",
  className,
  stacked = false,
}: BrandMarkProps): React.JSX.Element {
  const classes = [styles.root, styles[size], className].filter(Boolean).join(" ");
  const logo = brand.logo;

  if (logo) {
    const rendered = PIXEL_SIZE[size];
    return (
      <span className={classes} data-mask={logo.mask}>
        <Image
          src={logo.src}
          alt={`${lodge.name} logo`}
          width={logo.width}
          height={logo.height}
          sizes={`${rendered * 2}px`}
          priority={size === "hero"}
          className={styles.image}
        />
      </span>
    );
  }

  return (
    <span className={classes} data-stacked={stacked ? "true" : "false"}>
      <span className={styles.wordmark}>
        <span className={styles.name}>{brand.wordmark.top}</span>
        <span className={styles.sub}>{brand.wordmark.bottom}</span>
      </span>
    </span>
  );
}
