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
  if (!row || row.kind !== "camping") {
    return { title: "Camping option not found" };
  }
  return {
    title: `${row.name} — Camping at Macheo`,
    description:
      row.description?.slice(0, 155) ??
      `${row.name} at Macheo Ecolodge & Camping on Lake Kivu.`,
  };
}

/** /camping/[slug] — one camping option, fully admin-managed. */
export default async function CampingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const row = await getAccommodationBySlug(slug);

  if (!row || row.kind !== "camping") notFound();

  return (
    <AccommodationDetail row={row} basePath="/camping" backLabel="Back to camping" />
  );
}
