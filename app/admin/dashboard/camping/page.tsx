import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AccommodationRow } from "@/lib/supabase/types";
import AccommodationManager from "../accommodation/AccommodationManager";

/**
 * Camping management — the same manager as accommodation, managing the
 * `camping` rows (the public Camping page and its detail pages read these).
 */
export default async function AdminCampingPage(): Promise<React.JSX.Element> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("accommodations")
    .select("*")
    .eq("kind", "camping")
    // Newest first — same ordering contract as the accommodation manager.
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .returns<AccommodationRow[]>();

  return (
    <>
      <h1 className="admin-title">Camping</h1>
      <p className="admin-muted admin-lede">
        Camping options, exactly as guests see them on the Camping page. Only
        publish what is real: the “Tent information” field is for the actual
        setup and gear — leave details blank rather than guessing.
      </p>
      <AccommodationManager kind="camping" noun="camping option" initial={data ?? []} />
    </>
  );
}
