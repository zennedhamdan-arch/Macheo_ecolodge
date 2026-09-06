"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ContactMessageRow } from "@/lib/supabase/types";
import { formatLodgeDateTime } from "@/lib/time";

/**
 * The contact-form inbox. Messages are write-only for the public (RLS), so
 * this dashboard view is the only way they are ever read — marking one read
 * simply tidies the list.
 */
export default function ContactInbox({
  initial,
}: Readonly<{ initial: readonly ContactMessageRow[] }>): React.JSX.Element {
  const router = useRouter();
  const [rows, setRows] = useState<readonly ContactMessageRow[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggleRead(row: ContactMessageRow): Promise<void> {
    setBusyId(row.id);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase
        .from("contact_messages")
        .update({ is_read: !row.is_read })
        .eq("id", row.id);
      setRows((current) =>
        current.map((candidate) =>
          candidate.id === row.id ? { ...candidate, is_read: !row.is_read } : candidate,
        ),
      );
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(row: ContactMessageRow): Promise<void> {
    if (!window.confirm("Delete this message? This cannot be undone.")) return;
    setBusyId(row.id);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.from("contact_messages").delete().eq("id", row.id);
      setRows((current) => current.filter((candidate) => candidate.id !== row.id));
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) {
    return <p className="admin-muted">No messages yet.</p>;
  }

  return (
    <ul className="admin-list">
      {rows.map((row) => (
        <li key={row.id} className="admin-list-item" data-active={row.is_read ? "false" : "true"}>
          <div className="admin-list-body">
            <p className="admin-list-meta">
              {!row.is_read ? <span className="admin-badge">new</span> : null}
              <strong>{row.name}</strong>
              {row.subject ? <span>{row.subject}</span> : null}
              <span className="admin-muted">{formatLodgeDateTime(row.created_at)}</span>
            </p>

            <p className="admin-muted">
              <a className="admin-inline-link" href={`mailto:${row.email}`}>
                {row.email}
              </a>
              {row.phone ? (
                <>
                  {" · "}
                  <a className="admin-inline-link" href={`tel:${row.phone}`}>
                    {row.phone}
                  </a>
                </>
              ) : null}
            </p>

            <p className="admin-quote">{row.message}</p>

            <div className="admin-row">
              <button
                type="button"
                className="admin-button admin-button-quiet"
                disabled={busyId === row.id}
                onClick={() => void toggleRead(row)}
              >
                {row.is_read ? "Mark unread" : "Mark read"}
              </button>
              <button
                type="button"
                className="admin-button admin-button-danger"
                disabled={busyId === row.id}
                onClick={() => void remove(row)}
              >
                Delete
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
