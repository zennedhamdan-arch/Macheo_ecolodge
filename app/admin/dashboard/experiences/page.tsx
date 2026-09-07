import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ExperienceRow } from "@/lib/supabase/types";
import ExperienceManager from "./ExperienceManager";

export default async function ExperiencesPage(): Promise<React.JSX.Element> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("experiences")
    .select("*")
    /* Newest first: the manager inserts at the top of the display order
       (sort_order = min - 1), and `created_at` descending breaks ties
       between rows that share a sort_order (the seed leaves them all at 0). */
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .returns<ExperienceRow[]>();

  return (
    <>
      <h1 className="admin-title">Experiences</h1>
      <p className="admin-muted admin-lede">
        The cards shown in the “More than a meal” section — garden dining, theme
        nights, and whatever else the restaurant actually offers. Photos are
        optional; duration and price appear only when you set them.
      </p>
      <ExperienceManager initial={data ?? []} />
    </>
  );
}
