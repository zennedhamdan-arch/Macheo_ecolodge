import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ReservationRequestRow } from "@/lib/supabase/types";
import ReservationList from "./ReservationList";

/**
 * Reservation requests.
 *
 * Every row here was created by a guest through the public form; nothing is a
 * confirmed booking until its status says so. Internal notes are stored in
 * `admin_notes`, a column the public can neither write nor read (RLS has no
 * public SELECT on this table at all).
 */
export default async function AdminReservationsPage(): Promise<React.JSX.Element> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("reservation_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300)
    .returns<ReservationRequestRow[]>();

  return (
    <>
      <h1 className="admin-title">Reservations</h1>
      <p className="admin-muted admin-lede">
        Guest stay requests, newest first. A request becomes a booking only
        when you mark it confirmed — guests are told clearly that nothing is
        confirmed or paid until then.
      </p>
      <ReservationList initial={data ?? []} />
    </>
  );
}
