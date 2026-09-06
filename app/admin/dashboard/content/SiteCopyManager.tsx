"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SiteContentRow } from "@/lib/supabase/types";

/**
 * Site copy — the words on the pages that are mostly words.
 *
 * Every field overrides a neutral default built into the site; leaving a
 * field empty keeps the default. This is how the owners publish their own
 * story without a code change (and without anyone inventing a history for
 * them).
 */

type FieldKey =
  | "hero_title"
  | "hero_subtitle"
  | "intro_heading"
  | "intro_body"
  | "about_story"
  | "about_place"
  | "about_philosophy"
  | "about_nature"
  | "about_experience"
  | "footer_text"
  | "map_embed_url";

const FIELDS: readonly {
  key: FieldKey;
  label: string;
  hint: string;
  rows?: number;
}[] = [
  {
    key: "hero_title",
    label: "Hero title",
    hint: "The big headline at the top of the homepage.",
  },
  {
    key: "hero_subtitle",
    label: "Hero subtitle",
    hint: "The supporting line under the title.",
  },
  {
    key: "intro_heading",
    label: "Homepage introduction — heading",
    hint: "Shown above the Discover cards.",
  },
  {
    key: "intro_body",
    label: "Homepage introduction — text",
    hint: "A short welcome paragraph (2–4 sentences).",
    rows: 4,
  },
  {
    key: "about_story",
    label: "About — Our story",
    hint: "Tell it in your own words; nothing is invented for you.",
    rows: 5,
  },
  {
    key: "about_place",
    label: "About — Our place",
    hint: "Karongi, the lake, the surroundings.",
    rows: 4,
  },
  {
    key: "about_philosophy",
    label: "About — Our philosophy",
    hint: "What Macheo believes about nature and hospitality.",
    rows: 4,
  },
  {
    key: "about_nature",
    label: "About — Nature & hospitality",
    hint: "Also shown on the Camping page's nature section.",
    rows: 4,
  },
  {
    key: "about_experience",
    label: "About — The Macheo experience",
    hint: "What a day (or a week) here feels like.",
    rows: 4,
  },
  {
    key: "footer_text",
    label: "Footer line",
    hint: "One short sentence under the logo in the footer.",
  },
  {
    key: "map_embed_url",
    label: "Google Maps embed URL (Location section)",
    hint: "Only set this once the exact official location is confirmed. Leave empty to show the placeholder panel instead.",
  },
];

export default function SiteCopyManager({
  initial,
}: Readonly<{ initial: Partial<SiteContentRow> | null }>): React.JSX.Element {
  const router = useRouter();
  const [values, setValues] = useState<Record<FieldKey, string>>(() => {
    const next = {} as Record<FieldKey, string>;
    for (const field of FIELDS) {
      next[field.key] = (initial?.[field.key] as string | null) ?? "";
    }
    return next;
  });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const baseline = FIELDS.map(
    (field) => `${field.key}=${(initial?.[field.key] as string | null) ?? ""}`,
  ).join("|");
  const current = FIELDS.map((field) => `${field.key}=${values[field.key]}`).join("|");
  const dirty = baseline !== current;

  async function save(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const patch: Record<string, string | null> = {};
      for (const field of FIELDS) {
        patch[field.key] = values[field.key].trim().length > 0 ? values[field.key].trim() : null;
      }

      const { error: updateError } = await supabase
        .from("site_content")
        .upsert({ id: 1, ...patch })
        .eq("id", 1);
      if (updateError) throw updateError;

      setStatus("Saved — changes appear on the site within about a minute.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Saving failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-card">
      <h2 className="admin-card-title">Page copy</h2>

      {status ? (
        <p className="admin-status" role="status">
          {status}
        </p>
      ) : null}
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="admin-form-grid">
        {FIELDS.map((field) => (
          <label
            key={field.key}
            className={`admin-field ${field.rows ? "admin-field-wide" : ""}`}
          >
            <span className="admin-label">{field.label}</span>
            {field.rows ? (
              <textarea
                rows={field.rows}
                value={values[field.key]}
                onChange={(e) =>
                  setValues((state) => ({ ...state, [field.key]: e.target.value }))
                }
              />
            ) : (
              <input
                value={values[field.key]}
                onChange={(e) =>
                  setValues((state) => ({ ...state, [field.key]: e.target.value }))
                }
              />
            )}
            <span className="admin-muted">{field.hint}</span>
          </label>
        ))}
      </div>

      <div className="admin-row" style={{ marginTop: "1rem" }}>
        <button
          type="button"
          className="admin-button"
          disabled={busy || !dirty}
          onClick={() => void save()}
        >
          {busy ? "Saving…" : "Save site content"}
        </button>
      </div>
    </div>
  );
}
