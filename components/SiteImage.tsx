"use client";

import Image from "next/image";
import { useState } from "react";

import styles from "./SiteImage.module.css";

/**
 * One image component for every admin-managed photograph on the site.
 *
 * It exists because a stored URL can always turn out to be wrong — a deleted
 * object, a bucket renamed, a phone that captured a file the CDN cannot
 * serve. The default browser behaviour in that case is a broken-image glyph
 * next to raw alt text, which looks like a bug in someone's lobby. This
 * swaps in a clean, neutral tile instead and keeps the description available
 * to screen readers (role="img" + aria-label) rather than painting it on
 * screen.
 *
 * Two render modes, because the two contexts really are different:
 *
 *  - `optimized` (default): next/image, for the public site. Remote Supabase
 *    hosts are allow-listed by `images.remotePatterns` in next.config.ts —
 *    without that entry next/image throws instead of rendering, so an
 *    uploaded photo would never reach the page.
 *  - `optimized={false}`: a plain <img>, for the dashboard's own thumbnails,
 *    where the box is already sized by CSS and the optimiser round-trip buys
 *    nothing behind an authenticated page.
 *
 * Nothing here converts or re-encodes a file: a WebP stays a WebP, a JPG
 * stays a JPG. Whatever the admin uploaded is what the URL points at.
 */

type Props = Readonly<{
  /** Storage/public URL, or null when nothing has been uploaded yet. */
  src?: string | null;
  alt: string;
  /** Fill the (already positioned) parent — the next/image `fill` mode. */
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  className?: string;
  /** false = plain <img> (dashboard thumbnails). */
  optimized?: boolean;
}>;

/** Small line-art mountain/photo glyph — decorative, never carries meaning. */
function PlaceholderGlyph(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.4" />
      <path d="m4.5 17 4.6-4.6 4 4 2.9-2.9 3.5 3.5" />
    </svg>
  );
}

export default function SiteImage({
  src,
  alt,
  fill = false,
  sizes,
  priority = false,
  className,
  optimized = true,
}: Props): React.JSX.Element {
  /* Tracked per-src, not as a boolean: when a row's image changes (a new
     upload replacing a broken one) the fallback must clear itself. */
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const hasSrc = typeof src === "string" && src.length > 0;
  const failed = hasSrc && failedSrc === src;

  if (!hasSrc || failed) {
    return (
      <span
        className={
          fill
            ? `${styles.fallback}${className ? ` ${className}` : ""}`
            : `${styles.fallbackBox}${className ? ` ${className}` : ""}`
        }
        role="img"
        aria-label={alt}
      >
        <PlaceholderGlyph />
      </span>
    );
  }

  if (!optimized) {
    return (
      // Dashboard thumbnails: CSS fixes the box, and these pages are dynamic
      // and behind auth, so the optimiser adds cost without benefit.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={className}
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailedSrc(src)}
      />
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={className}
        onError={() => setFailedSrc(src)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      // Unfixed layout: the element sizes itself from the file's own
      // dimensions. Only used where no `sizes` ladder applies.
      width={0}
      height={0}
      sizes={sizes ?? "100vw"}
      priority={priority}
      className={className}
      onError={() => setFailedSrc(src)}
      style={{ width: "100%", height: "auto" }}
    />
  );
}
