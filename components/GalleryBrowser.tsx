"use client";

import { useState } from "react";

import GalleryGrid, { type GalleryPhoto } from "./GalleryGrid";
import styles from "./GalleryBrowser.module.css";

/** Images rendered per page of the "Load more" pagination. */
const PAGE_SIZE = 24;

/**
 * The /gallery collection view: category filters and the lightbox come from
 * the shared GalleryGrid; this wrapper adds progressive rendering so a
 * hundred-photo archive never drops 100 images into the DOM at once.
 */
export default function GalleryBrowser({
  items,
  emptyMessage,
}: Readonly<{ items: readonly GalleryPhoto[]; emptyMessage: string }>): React.JSX.Element {
  const [count, setCount] = useState(PAGE_SIZE);
  const visible = items.slice(0, count);
  const remaining = items.length - visible.length;

  return (
    <>
      <GalleryGrid items={visible} emptyMessage={emptyMessage} />

      {remaining > 0 ? (
        <div className={styles.more}>
          <p className={styles.count} role="status">
            Showing {visible.length} of {items.length} photos
          </p>
          <button
            type="button"
            className={styles.button}
            onClick={() => setCount((current) => current + PAGE_SIZE)}
          >
            Load more ({remaining} remaining)
          </button>
        </div>
      ) : null}
    </>
  );
}
