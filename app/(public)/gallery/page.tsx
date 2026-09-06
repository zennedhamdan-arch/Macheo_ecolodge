import type { Metadata } from "next";
import Link from "next/link";

import PageHero from "@/components/PageHero";
import GalleryBrowser from "@/components/GalleryBrowser";
import { getGalleryItems } from "@/lib/content";
import type { GalleryItemRow } from "@/lib/supabase/types";
import { galleryPage } from "@/data/site";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Photographs of Macheo Ecolodge & Camping — rooms, camping, the restaurant and bar, Lake Kivu and the nature around it.",
  openGraph: {
    title: "Gallery | Macheo Ecolodge & Camping",
    description:
      "Rooms, camping, the table, the lake — the full Macheo photo collection.",
  },
};

function altFor(row: GalleryItemRow): string {
  if (row.alt_text.trim().length > 0) return row.alt_text;
  if (row.caption && row.caption.trim().length > 0) return row.caption;
  return row.category
    ? `Macheo Ecolodge & Camping — ${row.category.toLowerCase()}`
    : "Macheo Ecolodge & Camping";
}

/**
 * /gallery — the complete collection with category filters, lightbox and
 * progressive loading. RLS does the gating: this renders through the public
 * (anon) client, which can only ever select rows where published = true.
 */
export default async function GalleryPage(): Promise<React.JSX.Element> {
  const rows = await getGalleryItems();
  const items = rows.map((row) => ({
    id: row.id,
    src: row.image_url,
    alt: altFor(row),
    ...(row.caption ? { caption: row.caption } : {}),
    ...(row.category ? { category: row.category } : {}),
  }));

  return (
    <main id="main">
      <PageHero
        eyebrow={galleryPage.eyebrow}
        title={galleryPage.headline}
        lede={galleryPage.lede}
        image="/images/macheo/lake-mountains.jpg"
        imageAlt=""
      />

      <section className="section" aria-labelledby="gallery-page-heading">
        <div className="shell">
          <h2 id="gallery-page-heading" className="visuallyHidden">
            All photographs
          </h2>
          <GalleryBrowser items={items} emptyMessage={galleryPage.empty} />

          <p className="sectionMore" style={{ marginTop: "2.5rem" }}>
            <Link href="/" className="sectionMoreLink">
              ← Back to home
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
