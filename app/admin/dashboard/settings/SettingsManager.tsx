"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SiteSettingsRow } from "@/lib/supabase/types";

/**
 * Site settings: the technical dials — SEO title/description, canonical URL
 * and maintenance mode. (The hero video switch lives with the hero media in
 * Site content; the floating WhatsApp switch lives with the contact details.)
 */
export default function SettingsManager({
  initial,
}: Readonly<{ initial: SiteSettingsRow | null }>): React.JSX.Element {
  const router = useRouter();
  const [siteTitle, setSiteTitle] = useState(initial?.site_title ?? "");
  const [metaDescription, setMetaDescription] = useState(initial?.meta_description ?? "");
  const [canonicalUrl, setCanonicalUrl] = useState(initial?.canonical_url ?? "");
  const [maintenance, setMaintenance] = useState(initial?.maintenance_mode ?? false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const patch = {
        site_title:
          siteTitle.trim() || "Macheo Ecolodge & Camping | Stay, Camp & Explore Lake Kivu",
        meta_description: metaDescription.trim(),
        canonical_url: canonicalUrl.trim() || null,
        maintenance_mode: maintenance,
      };

      const { error: updateError } = await supabase
        .from("site_settings")
        .upsert({ id: 1, ...patch })
        .eq("id", 1);
      if (updateError) throw updateError;

      setStatus("Saved.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Saving failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-card">
      <h2 className="admin-card-title">Site settings</h2>

      {status ? (
        <p className="admin-success" role="status">
          {status}
        </p>
      ) : null}
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="admin-form-grid">
        <label className="admin-field admin-field-wide">
          <span className="admin-label">SEO title (browser tab / search results)</span>
          <input value={siteTitle} onChange={(e) => setSiteTitle(e.target.value)} maxLength={120} />
        </label>
        <label className="admin-field admin-field-wide">
          <span className="admin-label">SEO description</span>
          <textarea
            rows={3}
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            maxLength={300}
          />
        </label>
        <label className="admin-field admin-field-wide">
          <span className="admin-label">Canonical URL (optional)</span>
          <input
            value={canonicalUrl}
            onChange={(e) => setCanonicalUrl(e.target.value)}
            placeholder="https://www.macheo.rw"
          />
        </label>
        <label className="admin-field admin-field-wide">
          <input
            type="checkbox"
            checked={maintenance}
            onChange={(e) => setMaintenance(e.target.checked)}
          />{" "}
          Maintenance mode (reserved for future use — flagged here so it is never flipped by accident)
        </label>
      </div>

      <div className="admin-row" style={{ marginTop: "1rem" }}>
        <button type="button" className="admin-button" disabled={busy} onClick={() => void save()}>
          {busy ? "Saving…" : "Save settings"}
        </button>
      </div>
    </div>
  );
}
