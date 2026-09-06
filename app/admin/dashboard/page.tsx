import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ContactMessageRow, ReservationRequestRow } from "@/lib/supabase/types";
import { formatLodgeDateTime } from "@/lib/time";

/**
 * Overview.
 *
 * Counts are read with the admin's own session, so RLS applies here exactly
 * as it does everywhere else — there is no service-role key in this app at
 * all. A dashboard that bypassed RLS to "just show the numbers" would be a
 * second, untested authorization path.
 *
 * Zero is a real number: an empty lodge shows 0 with a hint, never a spinner
 * that never stops or a misleading dash.
 */
export default async function OverviewPage(): Promise<React.JSX.Element> {
  const supabase = await createSupabaseServerClient();

  const [
    reservations,
    pending,
    confirmed,
    rooms,
    camping,
    experiences,
    gallery,
    unreadMessages,
    recentReservations,
    recentMessages,
  ] = await Promise.all([
    supabase.from("reservation_requests").select("*", { count: "exact", head: true }),
    supabase
      .from("reservation_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("reservation_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "confirmed"),
    supabase
      .from("accommodations")
      .select("*", { count: "exact", head: true })
      .eq("kind", "room"),
    supabase
      .from("accommodations")
      .select("*", { count: "exact", head: true })
      .eq("kind", "camping"),
    supabase.from("experiences").select("*", { count: "exact", head: true }),
    supabase.from("gallery_items").select("*", { count: "exact", head: true }),
    supabase
      .from("contact_messages")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false),
    supabase
      .from("reservation_requests")
      .select(
        "id, reference_code, name, check_in, check_out, adults, children, status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<ReservationRequestRow[]>(),
    supabase
      .from("contact_messages")
      .select("id, name, email, subject, is_read, created_at")
      .order("created_at", { ascending: false })
      .limit(3)
      .returns<ContactMessageRow[]>(),
  ]);

  const stats = [
    {
      label: "Pending requests",
      value: pending.count ?? 0,
      href: "/admin/dashboard/reservations",
      highlight: (pending.count ?? 0) > 0,
    },
    { label: "Confirmed stays", value: confirmed.count ?? 0, href: "/admin/dashboard/reservations" },
    { label: "All reservations", value: reservations.count ?? 0, href: "/admin/dashboard/reservations" },
    { label: "Rooms", value: rooms.count ?? 0, href: "/admin/dashboard/accommodation" },
    { label: "Camping options", value: camping.count ?? 0, href: "/admin/dashboard/camping" },
    { label: "Experiences", value: experiences.count ?? 0, href: "/admin/dashboard/experiences" },
    { label: "Gallery photos", value: gallery.count ?? 0, href: "/admin/dashboard/gallery" },
    {
      label: "Unread messages",
      value: unreadMessages.count ?? 0,
      href: "/admin/dashboard/contact-info",
      highlight: (unreadMessages.count ?? 0) > 0,
    },
  ];

  const quickActions = [
    { label: "Review reservation requests", href: "/admin/dashboard/reservations" },
    { label: "Add a room", href: "/admin/dashboard/accommodation" },
    { label: "Add a camping option", href: "/admin/dashboard/camping" },
    { label: "Upload gallery photos", href: "/admin/dashboard/gallery" },
    { label: "Edit site content", href: "/admin/dashboard/content" },
  ];

  const formatDate = (value: string | null): string =>
    value
      ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
          new Date(`${value}T12:00:00`),
        )
      : "—";

  return (
    <>
      <h1 className="admin-title">Overview</h1>

      <div className="admin-stats">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="admin-stat"
            data-highlight={stat.highlight ? "true" : "false"}
          >
            <span className="admin-stat-value">{stat.value}</span>
            <span className="admin-stat-label">{stat.label}</span>
          </Link>
        ))}
      </div>

      <h2 className="admin-section-title">Quick actions</h2>
      <div className="admin-row">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href} className="admin-button admin-button-quiet">
            {action.label}
          </Link>
        ))}
      </div>

      <h2 className="admin-section-title">Recent reservation activity</h2>
      {(recentReservations.data ?? []).length === 0 ? (
        <p className="admin-muted">
          No reservation requests yet. New requests appear here and under
          Reservations the moment a guest submits the form.
        </p>
      ) : (
        <ul className="admin-list">
          {(recentReservations.data ?? []).map((row) => (
            <li key={row.id} className="admin-list-item">
              <div className="admin-list-body">
                <p className="admin-list-meta">
                  <span className="admin-badge" data-status={row.status}>
                    {row.status}
                  </span>
                  <strong>{row.name}</strong>
                  <span className="admin-muted">{row.reference_code}</span>
                  <span>
                    {formatDate(row.check_in)} → {formatDate(row.check_out)}
                  </span>
                  <span>
                    {row.adults} {row.adults === 1 ? "adult" : "adults"}
                    {row.children > 0
                      ? ` + ${row.children} ${row.children === 1 ? "child" : "children"}`
                      : ""}
                  </span>
                </p>
                <p className="admin-muted">
                  Received {formatLodgeDateTime(row.created_at)} ·{" "}
                  <Link className="admin-inline-link" href="/admin/dashboard/reservations">
                    manage
                  </Link>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="admin-section-title">Recent contact messages</h2>
      {(recentMessages.data ?? []).length === 0 ? (
        <p className="admin-muted">No contact messages yet.</p>
      ) : (
        <ul className="admin-list">
          {(recentMessages.data ?? []).map((row) => (
            <li key={row.id} className="admin-list-item">
              <div className="admin-list-body">
                <p className="admin-list-meta">
                  {!row.is_read ? <span className="admin-badge">new</span> : null}
                  <strong>{row.name}</strong>
                  {row.subject ? <span>{row.subject}</span> : null}
                </p>
                <p className="admin-muted">
                  {row.email} · {formatLodgeDateTime(row.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
