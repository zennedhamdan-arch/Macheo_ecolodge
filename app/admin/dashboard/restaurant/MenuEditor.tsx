"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import SiteImage from "@/components/SiteImage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { MenuCategoryRow, MenuItemRow, MenuSectionRow } from "@/lib/supabase/types";
import { topSortOrder } from "@/lib/adminSort";
import {
  buildObjectPath,
  contentTypeFor,
  uploadFile,
  type UploadProgress,
} from "@/lib/upload";

type MenuEditorProps = Readonly<{
  categories: readonly MenuCategoryRow[];
  sections: readonly MenuSectionRow[];
  items: readonly MenuItemRow[];
}>;

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // matches the `menu` bucket's limit
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Menu editor.
 *
 * One category at a time, matching how the public menu is browsed and how a
 * phone screen works. Edits save per item rather than as one giant form, so a
 * dropped connection loses one price, not an evening of work.
 *
 * Adding works the same way as every other CRUD screen: the new category,
 * section or dish is inserted at the TOP of the database ordering
 * (`sort_order` = lowest minus one) and the list is re-read from the server,
 * so what was just created is the first thing on screen and can be edited
 * immediately — no scrolling past the rest of the menu to find it.
 */
export default function MenuEditor({
  categories,
  sections,
  items,
}: MenuEditorProps): React.JSX.Element {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? "");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sectionsForCategory = useMemo(
    () => sections.filter((section) => section.category_id === activeCategory),
    [sections, activeCategory],
  );

  const itemsBySection = useMemo(() => {
    const map = new Map<string, MenuItemRow[]>();
    for (const item of items) {
      const list = map.get(item.section_id) ?? [];
      list.push(item);
      map.set(item.section_id, list);
    }
    return map;
  }, [items]);

  async function save(item: MenuItemRow, patch: Partial<MenuItemRow>): Promise<void> {
    setBusyId(item.id);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase
        .from("menu_items")
        .update(patch)
        .eq("id", item.id);
      if (updateError) throw updateError;
      setStatus(`Saved “${patch.name ?? item.name}”.`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save.");
    } finally {
      setBusyId(null);
    }
  }

  /** New category → new tab, and the tab is opened straight away. */
  async function addCategory(name: string, intro: string): Promise<void> {
    setError(null);
    setStatus(null);
    setBusyId("new-category");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: inserted, error: insertError } = await supabase
        .from("menu_categories")
        .insert({
          name: name.trim(),
          slug: slugFrom(name.trim()),
          intro: intro.trim() || null,
          published: true,
          sort_order: topSortOrder(categories),
        })
        .select()
        .single();
      if (insertError) {
        // `slug` is unique — say so in words rather than quoting Postgres.
        if (/duplicate key/i.test(insertError.message)) {
          throw new Error("A category with that name already exists.");
        }
        throw insertError;
      }
      setActiveCategory(inserted.id);
      setStatus(`Category “${inserted.name}” added — it is the first tab now.`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add the category.");
    } finally {
      setBusyId(null);
    }
  }

  async function addSection(title: string, note: string): Promise<void> {
    setError(null);
    setStatus(null);
    setBusyId("new-section");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: insertError } = await supabase.from("menu_sections").insert({
        category_id: activeCategory,
        title: title.trim() || null,
        note: note.trim() || null,
        sort_order: topSortOrder(sections),
      });
      if (insertError) throw insertError;
      setStatus("Section added — it is at the top of this category.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add the section.");
    } finally {
      setBusyId(null);
    }
  }

  async function addItem(section: MenuSectionRow, name: string, price: string): Promise<void> {
    setError(null);
    setStatus(null);
    setBusyId("new-item");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: insertError } = await supabase.from("menu_items").insert({
        section_id: section.id,
        name: name.trim(),
        price: price.trim().length > 0 ? Number.parseInt(price, 10) : null,
        available: true,
        sort_order: topSortOrder(items),
      });
      if (insertError) throw insertError;
      setStatus(`“${name.trim()}” added — it is at the top of “${section.title ?? "this section"}”.`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add the item.");
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
      {status ? (
        <p className="admin-success" role="status">
          {status}
        </p>
      ) : null}

      <AddCategoryForm
        busy={busyId === "new-category"}
        onAdd={addCategory}
        hasCategories={categories.length > 0}
      />

      {categories.length === 0 ? (
        <p className="admin-muted">
          No menu categories yet. Add the first one above — a category is a tab
          on the public menu, e.g. “Food”, “Drinks”.
        </p>
      ) : (
        <>
          <div className="admin-tabs" role="tablist" aria-label="Menu categories">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                role="tab"
                aria-selected={category.id === activeCategory}
                className="admin-tab"
                data-selected={category.id === activeCategory ? "true" : "false"}
                onClick={() => setActiveCategory(category.id)}
              >
                {category.name}
                {!category.published ? " (hidden)" : ""}
              </button>
            ))}
          </div>

          <AddSectionForm
            busy={busyId === "new-section"}
            onAdd={addSection}
            hasSections={sectionsForCategory.length > 0}
          />

          {sectionsForCategory.length === 0 ? (
            <p className="admin-muted">
              No sections in this category yet. Add one above — a section is a
              titled group of dishes, e.g. “Starters”. Leave the title empty for
              an unlabelled group.
            </p>
          ) : (
            sectionsForCategory.map((section) => (
              <section key={section.id} className="admin-card">
                {section.title ? <h2 className="admin-subtitle">{section.title}</h2> : null}
                {section.note ? <p className="admin-hint">{section.note}</p> : null}
                <ul className="admin-list admin-list-compact">
                  {(itemsBySection.get(section.id) ?? []).map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      isBusy={busyId === item.id}
                      onSave={(patch) => void save(item, patch)}
                    />
                  ))}
                </ul>
                <AddItemForm
                  section={section}
                  busy={busyId === "new-item"}
                  onAdd={addItem}
                />
              </section>
            ))
          )}
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Add forms                                                                  */
/* -------------------------------------------------------------------------- */

function AddCategoryForm({
  busy,
  hasCategories,
  onAdd,
}: Readonly<{
  busy: boolean;
  hasCategories: boolean;
  onAdd: (name: string, intro: string) => Promise<void>;
}>): React.JSX.Element {
  const [name, setName] = useState("");
  const [intro, setIntro] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    if (name.trim().length === 0) {
      setLocalError("Give the category a name, e.g. “Food”.");
      return;
    }
    setLocalError(null);
    await onAdd(name, intro);
    setName("");
    setIntro("");
  }

  return (
    <details className="admin-card" open={!hasCategories}>
      <summary className="admin-card-summary">Add a category</summary>
      <div className="admin-form-grid">
        <label className="admin-field">
          <span className="admin-label">Name *</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </label>
        <label className="admin-field admin-field-wide">
          <span className="admin-label">Intro line (optional, shown above the menu)</span>
          <input value={intro} onChange={(e) => setIntro(e.target.value)} maxLength={300} />
        </label>
        {localError ? (
          <p className="admin-error" role="alert">
            {localError}
          </p>
        ) : null}
        <div className="admin-row">
          <button
            type="button"
            className="admin-button"
            disabled={busy}
            onClick={() => void submit()}
          >
            {busy ? "Adding…" : "Add category"}
          </button>
        </div>
      </div>
    </details>
  );
}

function AddSectionForm({
  busy,
  hasSections,
  onAdd,
}: Readonly<{
  busy: boolean;
  hasSections: boolean;
  onAdd: (title: string, note: string) => Promise<void>;
}>): React.JSX.Element {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");

  async function submit(): Promise<void> {
    await onAdd(title, note);
    setTitle("");
    setNote("");
  }

  return (
    <details className="admin-card" open={!hasSections}>
      <summary className="admin-card-summary">Add a section to this category</summary>
      <div className="admin-form-grid">
        <label className="admin-field">
          <span className="admin-label">Title (blank = unlabelled group)</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
        </label>
        <label className="admin-field admin-field-wide">
          <span className="admin-label">Note (optional, small print under the title)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
        </label>
        <div className="admin-row">
          <button
            type="button"
            className="admin-button"
            disabled={busy}
            onClick={() => void submit()}
          >
            {busy ? "Adding…" : "Add section"}
          </button>
        </div>
      </div>
    </details>
  );
}

function AddItemForm({
  section,
  busy,
  onAdd,
}: Readonly<{
  section: MenuSectionRow;
  busy: boolean;
  onAdd: (section: MenuSectionRow, name: string, price: string) => Promise<void>;
}>): React.JSX.Element {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    if (name.trim().length === 0) {
      setLocalError("Give the dish or drink a name.");
      return;
    }
    setLocalError(null);
    await onAdd(section, name, price);
    setName("");
    setPrice("");
  }

  return (
    <div className="admin-form-grid admin-add-inline">
      <label className="admin-field">
        <span className="admin-label">New item in “{section.title ?? "this section"}” *</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
      </label>
      <label className="admin-field">
        <span className="admin-label">Price (RWF, optional)</span>
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          value={price}
          onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))}
        />
      </label>
      {localError ? (
        <p className="admin-error" role="alert">
          {localError}
        </p>
      ) : null}
      <div className="admin-row">
        <button
          type="button"
          className="admin-button admin-button-quiet"
          disabled={busy}
          onClick={() => void submit()}
        >
          {busy ? "Adding…" : "Add item"}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Item row                                                                   */
/* -------------------------------------------------------------------------- */

type ItemRowProps = Readonly<{
  item: MenuItemRow;
  isBusy: boolean;
  onSave: (patch: Partial<MenuItemRow>) => void;
}>;

function ItemRow({ item, isBusy, onSave }: ItemRowProps): React.JSX.Element {
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [price, setPrice] = useState(item.price === null ? "" : String(item.price));
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isDirty =
    name !== item.name ||
    description !== (item.description ?? "") ||
    price !== (item.price === null ? "" : String(item.price));

  /**
   * A dish photo goes to the `menu` storage bucket and the row keeps both the
   * public URL (what the site renders) and the object path (what a delete
   * would need). The file itself is stored exactly as uploaded — a WebP stays
   * a WebP.
   */
  async function uploadPhoto(file: File): Promise<void> {
    setPhotoError(null);
    const type = contentTypeFor(file);
    if (!type || !IMAGE_TYPES.includes(type)) {
      setPhotoError("Please choose a JPG, PNG, WebP or AVIF image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setPhotoError(`That file is ${formatBytes(file.size)}. The limit is 10 MB.`);
      return;
    }
    try {
      const supabase = createSupabaseBrowserClient();
      const path = buildObjectPath("dishes", file);
      const { publicUrl } = await uploadFile(supabase, {
        bucket: "menu",
        file,
        path,
        onProgress: setProgress,
      });
      onSave({ image_url: publicUrl, image_path: path });
    } catch (caught) {
      setPhotoError(caught instanceof Error ? caught.message : "The upload failed.");
    } finally {
      setProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <li className="admin-list-item admin-list-item-row">
      {item.image_url ? (
        <SiteImage
          optimized={false}
          className="admin-thumb admin-thumb-small"
          src={item.image_url}
          alt={item.name}
        />
      ) : null}

      <div className="admin-item-grid">
        <label className="admin-field">
          <span className="admin-label">Name</span>
          <input
            className="admin-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label className="admin-field">
          <span className="admin-label">Price (RWF)</span>
          <input
            className="admin-input"
            // inputMode numeric brings up the number pad on a phone without
            // type="number"'s spinner arrows and scroll-wheel accidents.
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder={item.variants.length > 0 ? "Priced by size" : "0"}
            value={price}
            onChange={(event) => setPrice(event.target.value.replace(/[^\d]/g, ""))}
          />
        </label>

        <label className="admin-field admin-field-wide">
          <span className="admin-label">Description</span>
          <input
            className="admin-input"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        <label className="admin-field admin-field-wide">
          <span className="admin-label">Photo</span>
          <input
            ref={fileInputRef}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            disabled={isBusy || progress !== null}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadPhoto(file);
            }}
          />
          {progress ? (
            <span className="admin-progress-label">
              Uploading… {formatBytes(progress.bytesUploaded)} /{" "}
              {formatBytes(progress.bytesTotal)}
            </span>
          ) : (
            <span className="admin-hint">JPG, PNG, WebP or AVIF, up to 10 MB.</span>
          )}
        </label>
      </div>

      {photoError ? (
        <p className="admin-error" role="alert">
          {photoError}
        </p>
      ) : null}

      {item.variants.length > 0 ? (
        <p className="admin-hint">
          Sizes:{" "}
          {item.variants
            .map((v) => `${v.label} — ${v.price?.toLocaleString("en-US") ?? "?"} RWF`)
            .join(", ")}
        </p>
      ) : null}

      <div className="admin-row">
        <label className="admin-check admin-check-inline">
          <input
            type="checkbox"
            checked={item.available}
            disabled={isBusy}
            onChange={(event) => onSave({ available: event.target.checked })}
          />
          <span>Available</span>
        </label>

        <button
          type="button"
          className="admin-button admin-button-quiet"
          disabled={isBusy || !isDirty}
          onClick={() =>
            onSave({
              name: name.trim(),
              description: description.trim() || null,
              price: price === "" ? null : Number.parseInt(price, 10),
            })
          }
        >
          {isBusy ? "Saving…" : isDirty ? "Save" : "Saved"}
        </button>
      </div>
    </li>
  );
}

/** "Restaurant & Bar" -> "restaurant-bar" — the slug column is unique. */
function slugFrom(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : `category-${Date.now().toString(36)}`;
}
