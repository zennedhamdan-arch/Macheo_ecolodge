"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ReservationRequestRow, ReservationStatus } from "@/lib/supabase/types";
import { formatLodgeDateTime } from "@/lib/time";

const STATUSES: readonly ReservationStatus[] = [
  "pending",
  "confirmed",
  "declined",
  "cancelled",
  "completed",
];

/** Human copy for each status change button. */
const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: "Mark pending",
  confirmed: "Confirm",
  declined: "Decline",
  cancelled: "Cancel",
  completed: "Mark completed",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

export default function ReservationList({
  initial,
}: Readonly<{ initial: readonly ReservationRequestRow[] }>): React.JSX.Element {
  const router = useRouter();
  const [filter, setFilter] = useState<ReservationStatus | "all">("pending");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const visible = useMemo(() => {
    const byStatus =
      filter === "all" ? initial : initial.filter((row) => row.status === filter);
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return byStatus;
    return byStatus.filter((row) =>
      [row.name, row.phone, row.email ?? "", row.reference_code]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [initial, filter, query]);

  /**
   * supabase-js RESOLVES with `{ error }` instead of throwing, so an unchecked
   * update looks like success in the UI while the row never changed (an
   * expired session, a revoked admin). Every write here is checked and
   * reported.
   */
  async function setStatus(id: string, next: ReservationStatus): Promise<void> {
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase
        .from("reservation_requests")
        .update({ status: next })
        .eq("id", id);
      if (updateError) throw updateError;
      setNotice(`Marked ${next}.`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update the status.");
    } finally {
      setBusyId(null);
    }
  }

  async function saveNotes(id: string, notes: string): Promise<void> {
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase
        .from("reservation_requests")
        .update({ admin_notes: notes.trim().length > 0 ? notes : null })
        .eq("id", id);
      if (updateError) throw updateError;
      setNotice("Internal notes saved.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the notes.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="admin-stack">
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="admin-success" role="status">
          {notice}
        </p>
      ) : null}

      <div className="admin-res-toolbar">
        <div className="admin-tabs" role="tablist" aria-label="Filter by status">
          {(["all", ...STATUSES] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              className="admin-tab"
              data-selected={filter === value ? "true" : "false"}
              onClick={() => setFilter(value)}
            >
              {value === "all" ? "all" : value}
            </button>
          ))}
        </div>
        <label className="admin-search">
          <span className="visuallyHidden">Search reservations</span>
          <input
            type="search"
            placeholder="Search name, phone, email or reference…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="admin-muted">Nothing here.</p>
      ) : (
        <ul className="admin-list">
          {visible.map((row) => {
            const isOpen = openId === row.id;
            return (
              <li key={row.id} className="admin-list-item">
                <div className="admin-list-body">
                  <button
                    type="button"
                    className="admin-res-head"
                    aria-expanded={isOpen}
                    onClick={() => setOpenId(isOpen ? null : row.id)}
                  >
                    <span className="admin-badge" data-status={row.status}>
                      {row.status}
                    </span>
                    <strong>{row.name}</strong>
                    <span className="admin-muted">{row.reference_code}</span>
                    <span>
                      {formatDate(row.check_in)} → {formatDate(row.check_out)}
                    </span>
                    <span className="admin-res-openhint" aria-hidden="true">
                      {isOpen ? "▴" : "▾"}
                    </span>
                  </button>

                  <p className="admin-muted">
                    {/* Tappable on a phone: the point is to call them back. */}
                    <a className="admin-inline-link" href={`tel:${row.phone}`}>
                      {row.phone}
                    </a>
                    {row.email ? (
                      <>
                        {" · "}
                        <a className="admin-inline-link" href={`mailto:${row.email}`}>
                          {row.email}
                        </a>
                      </>
                    ) : null}
                    {" · "}
                    <a
                      className="admin-inline-link"
                      href={`https://wa.me/${row.phone.replace(/[^\d]/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      WhatsApp
                    </a>
                  </p>

                  {isOpen ? (
                    <div className="admin-res-detail">
                      <dl className="admin-res-facts">
                        <div>
                          <dt>Guests</dt>
                          <dd>
                            {row.adults} {row.adults === 1 ? "adult" : "adults"}
                            {row.children > 0
                              ? ` + ${row.children} ${row.children === 1 ? "child" : "children"}`
                              : ""}
                          </dd>
                        </div>
                        {row.accommodation_pref ? (
                          <div>
                            <dt>Accommodation</dt>
                            <dd>{row.accommodation_pref}</dd>
                          </div>
                        ) : null}
                        {row.camping_pref ? (
                          <div>
                            <dt>Camping</dt>
                            <dd>{row.camping_pref}</dd>
                          </div>
                        ) : null}
                        {row.experience_interest ? (
                          <div>
                            <dt>Experience</dt>
                            <dd>{row.experience_interest}</dd>
                          </div>
                        ) : null}
                        <div>
                          <dt>Received</dt>
                          <dd>{formatLodgeDateTime(row.created_at)}</dd>
                        </div>
                      </dl>

                      {row.notes ? (
                        <p className="admin-quote">
                          <span className="admin-quote-label">Guest request: </span>
                          {row.notes}
                        </p>
                      ) : null}

                      <AdminNotes
                        id={row.id}
                        initial={row.admin_notes ?? ""}
                        busy={busyId === row.id}
                        onSave={saveNotes}
                      />

                      <div className="admin-row">
                        {STATUSES.filter((s) => s !== row.status).map((status) => (
                          <button
                            key={status}
                            type="button"
                            className="admin-button admin-button-quiet"
                            disabled={busyId === row.id}
                            onClick={() => void setStatus(row.id, status)}
                          >
                            {STATUS_LABELS[status]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : row.notes ? (
                    <p className="admin-quote">
                      <span className="admin-quote-label">Guest request: </span>
                      {row.notes}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Internal staff notes — never exposed on any public page or API. */
function AdminNotes({
  id,
  initial,
  busy,
  onSave,
}: Readonly<{
  id: string;
  initial: string;
  busy: boolean;
  onSave: (id: string, notes: string) => Promise<void>;
}>): React.JSX.Element {
  const [draft, setDraft] = useState(initial);
  const dirty = draft !== initial;

  return (
    <label className="admin-field">
      <span className="admin-label">Internal notes (staff only — never shown to guests)</span>
      <textarea
        rows={2}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="e.g. called back 14/09, deposit agreed, arriving ~16:00"
      />
      {dirty ? (
        <span className="admin-row">
          <button
            type="button"
            className="admin-button"
            disabled={busy}
            onClick={() => void onSave(id, draft)}
          >
            {busy ? "Saving…" : "Save notes"}
          </button>
        </span>
      ) : null}
    </label>
  );
}
