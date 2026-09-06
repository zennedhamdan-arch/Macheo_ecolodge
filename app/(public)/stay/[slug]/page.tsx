import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AccommodationDetail from "@/components/AccommodationDetail";
import { getAccommodationBySlug } from "@/lib/content";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const row = await getAccommodationBySlug(slug);
  if (!row || row.kind !== "room") {
    return { title: "Accommodation not found" };
  }
  return {
    title: `${row.name} — Stay at Macheo`,
    description:
      row.description?.slice(0, 155) ??
      `${row.name} at Macheo Ecolodge & Camping on Lake Kivu.`,
  };
}

/** /stay/[slug] — one room / accommodation option, fully admin-managed. */
export default async function StayDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const row = await getAccommodationBySlug(slug);

  /* RLS already hides unpublished rows from this client; a wrong kind means
     the link belongs to /camping instead. Either way: 404. */
  if (!row || row.kind !== "room") notFound();

  return <AccommodationDetail row={row} basePath="/stay" backLabel="Back to accommodation" />;
}
