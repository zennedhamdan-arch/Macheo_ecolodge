import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AccommodationRow } from "@/lib/supabase/types";
import AccommodationManager from "./AccommodationManager";

/**
 * Accommodation management (rooms and other non-camping stays).
 *
 * Create, edit, photograph, feature, publish/unpublish and delete. New items
 * are created UNPUBLISHED: nothing appears on the public site until the
 * "Publish" switch is flipped, so a half-written room can never leak out.
 */
export default async function AdminAccommodationPage(): Promise<React.JSX.Element> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("accommodations")
    .select("*")
    .eq("kind", "room")
    /* Newest first: `sort_order` is the owner's display order, and a freshly
       created room is inserted at the TOP of it (min - 1, see the manager),
       so the item just written is the first thing on the page and can be
       edited without scrolling past every older record. `created_at` is the
       tie-break for rows that share a sort_order (the seed sets 0), which
       keeps the order stable instead of arbitrary. */
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .returns<AccommodationRow[]>();

  return (
    <>
      <h1 className="admin-title">Accommodation</h1>
      <p className="admin-muted admin-lede">
        Rooms and other stays, exactly as guests see them on the Stay page.
        Prices are in Rwandan francs, whole numbers — leave the price blank to
        show “Price on request”. Tents and camping setups live under Camping.
      </p>
      <AccommodationManager kind="room" noun="room" initial={data ?? []} />
    </>
  );
}
