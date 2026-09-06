"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AccommodationKind, AccommodationRow } from "@/lib/supabase/types";
import { buildObjectPath, uploadFile, type UploadProgress } from "@/lib/upload";

/**
 * Accommodation & camping manager (one component, two sections).
 *
 * Rooms and tents are the same shape of data — a place to sleep with photos,
 * capacity, amenities and a price — so both dashboard sections share this
 * manager and only differ in the `kind` they manage.
 *
 * Images go to the dedicated `stays` storage bucket. Nothing here can see or
 * edit unpublished rows belonging to someone else: RLS limits the public API
 * and this page only ever runs inside an authenticated admin session.
 */

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGES = 8;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

type Props = Readonly<{
  kind: AccommodationKind;
  initial: readonly AccommodationRow[];
  /** Noun used in labels: "room" or "camping option". */
  noun: string;
}>;

export default function AccommodationManager({
  kind,
  initial,
  noun,
}: Props): React.JSX.Element {
  const router = useRouter();
  const [rows, setRows] = useState<readonly AccommodationRow[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(id: string, patch: Partial<AccommodationRow>): Promise<void> {
    setBusyId(id);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase
        .from("accommodations")
        .update(patch)
        .eq("id", id);
      if (updateError) throw updateError;
      setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
      setStatus("Saved.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Saving failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string): Promise<void> {
    if (!window.confirm(`Delete this ${noun}? This cannot be undone.`)) return;
    setBusyId(id);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const row = rows.find((candidate) => candidate.id === id);

      /* Best-effort storage cleanup — the row is the source of truth, so a
         stray file is untidy, not broken. */
      if (row && row.images.length > 0) {
        const paths = row.images
          .filter((url) => url.includes("/stays/"))
          .map((url) => decodeURIComponent(url.split("/stays/")[1] ?? ""))
          .filter(Boolean);
        if (paths.length > 0) await supabase.storage.from("stays").remove(paths);
      }

      const { error: deleteError } = await supabase.from("accommodations").delete().eq("id", id);
      if (deleteError) throw deleteError;
      setRows((current) => current.filter((row) => row.id !== id));
      setStatus(`${noun[0]?.toUpperCase()}${noun.slice(1)} deleted.`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Deleting failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="admin-stack">
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

      <AddForm kind={kind} noun={noun} onCreated={(row) => {
        setRows((current) => [...current, row]);
        setStatus(`${noun[0]?.toUpperCase()}${noun.slice(1)} created${row.published ? " — it is live on the site" : " (not published yet)"}.`);
        router.refresh();
      }} busy={busyId === "new"} setBusy={(busy) => setBusyId(busy ? "new" : null)} setError={setError} nextSort={rows.reduce((max, row) => Math.max(max, row.sort_order), -1) + 1} />

      {rows.length === 0 ? (
        <p className="admin-muted">
          No {noun}s yet — add the first one above.
        </p>
      ) : (
        <ul className="admin-list">
          {rows.map((row) => (
            <li key={row.id} className="admin-list-item">
              <AccommodationCard
                row={row}
                busy={busyId === row.id}
                onSave={save}
                onDelete={remove}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Add form                                                                   */
/* -------------------------------------------------------------------------- */

function AddForm({
  kind,
  noun,
  busy,
  setBusy,
  setError,
  onCreated,
  nextSort,
}: Readonly<{
  kind: AccommodationKind;
  noun: string;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  setError: (message: string | null) => void;
  onCreated: (row: AccommodationRow) => void;
  nextSort: number;
}>): React.JSX.Element {
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState("");
  const [beds, setBeds] = useState("");
  const [amenities, setAmenities] = useState("");
  const [tentInfo, setTentInfo] = useState("");
  const [price, setPrice] = useState("");
  const [files, setFiles] = useState<readonly File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function pickFiles(list: FileList | null): void {
    if (!list) return;
    const chosen = Array.from(list).filter((file) => {
      if (!IMAGE_TYPES.includes(file.type)) {
        setError(`"${file.name}" is not a supported image (JPEG, PNG, WebP or AVIF).`);
        return false;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setError(`"${file.name}" is ${formatBytes(file.size)} — the limit is 10 MB.`);
        return false;
      }
      return true;
    });
    setError(null);
    setFiles(chosen.slice(0, MAX_IMAGES));
  }

  async function create(): Promise<void> {
    if (name.trim().length === 0) {
      setError("Give it a name.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();

      /* Upload images first so the row can carry their URLs. */
      const urls: string[] = [];
      for (const file of files) {
        const path = buildObjectPath(kind === "camping" ? "camping" : "rooms", file);
        const result = await uploadFile(supabase, { bucket: "stays", file, path });
        urls.push(result.publicUrl);
      }

      const { data: inserted, error: insertError } = await supabase
        .from("accommodations")
        .insert({
          kind,
          name: name.trim(),
          tagline: tagline.trim() || null,
          description: description.trim() || null,
          capacity: capacity.trim().length > 0 ? Number(capacity.trim()) : null,
          beds: beds.trim() || null,
          amenities: amenities
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          tent_info: kind === "camping" && tentInfo.trim().length > 0 ? tentInfo.trim() : null,
          price: price.trim().length > 0 ? Number(price.trim()) : null,
          images: urls,
          available: true,
          featured: false,
          published: false,
          sort_order: nextSort,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      setName("");
      setTagline("");
      setDescription("");
      setCapacity("");
      setBeds("");
      setAmenities("");
      setTentInfo("");
      setPrice("");
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onCreated(inserted);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Creating failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="admin-card" open={false}>
      <summary className="admin-card-summary">Add a {noun}</summary>
      <div className="admin-form-grid">
        <label className="admin-field">
          <span className="admin-label">Name *</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        </label>
        <label className="admin-field">
          <span className="admin-label">Tagline (one short line)</span>
          <input value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={160} />
        </label>
        <label className="admin-field admin-field-wide">
          <span className="admin-label">Description</span>
          <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label className="admin-field">
          <span className="admin-label">Capacity (guests)</span>
          <input
            type="number"
            min={1}
            max={30}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </label>
        <label className="admin-field">
          <span className="admin-label">Beds (e.g. “1 queen bed”)</span>
          <input value={beds} onChange={(e) => setBeds(e.target.value)} maxLength={120} />
        </label>
        {kind === "camping" ? (
          <label className="admin-field admin-field-wide">
            <span className="admin-label">Tent information (setup, provided gear — only what is true)</span>
            <input value={tentInfo} onChange={(e) => setTentInfo(e.target.value)} maxLength={200} />
          </label>
        ) : null}
        <label className="admin-field admin-field-wide">
          <span className="admin-label">Amenities (comma-separated, e.g. “Wi-Fi, Hot shower, Lake view”)</span>
          <input value={amenities} onChange={(e) => setAmenities(e.target.value)} maxLength={300} />
        </label>
        <label className="admin-field">
          <span className="admin-label">Price in RWF per night (optional)</span>
          <input
            type="number"
            min={0}
            step={100}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <label className="admin-field admin-field-wide">
          <span className="admin-label">Photos (up to {MAX_IMAGES}; first becomes the main photo)</span>
          <input
            ref={fileInputRef}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            multiple
            onChange={(e) => pickFiles(e.target.files)}
          />
          {files.length > 0 ? (
            <span className="admin-muted">
              {files.map((file) => file.name).join(", ")}
            </span>
          ) : null}
        </label>
        <div className="admin-row">
          <button type="button" className="admin-button" disabled={busy} onClick={() => void create()}>
            {busy ? "Creating…" : `Create ${noun} (unpublished)`}
          </button>
        </div>
      </div>
    </details>
  );
}

/* -------------------------------------------------------------------------- */
/* Edit card                                                                  */
/* -------------------------------------------------------------------------- */

function AccommodationCard({
  row,
  busy,
  onSave,
  onDelete,
}: Readonly<{
  row: AccommodationRow;
  busy: boolean;
  onSave: (id: string, patch: Partial<AccommodationRow>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}>): React.JSX.Element {
  const [name, setName] = useState(row.name);
  const [tagline, setTagline] = useState(row.tagline ?? "");
  const [description, setDescription] = useState(row.description ?? "");
  const [capacity, setCapacity] = useState(row.capacity === null ? "" : String(row.capacity));
  const [beds, setBeds] = useState(row.beds ?? "");
  const [amenities, setAmenities] = useState(row.amenities.join(", "));
  const [tentInfo, setTentInfo] = useState(row.tent_info ?? "");
  const [price, setPrice] = useState(row.price === null ? "" : String(row.price));
  const [newFile, setNewFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);

  const dirty =
    name !== row.name ||
    tagline !== (row.tagline ?? "") ||
    description !== (row.description ?? "") ||
    capacity !== (row.capacity === null ? "" : String(row.capacity)) ||
    beds !== (row.beds ?? "") ||
    amenities !== row.amenities.join(", ") ||
    tentInfo !== (row.tent_info ?? "") ||
    price !== (row.price === null ? "" : String(row.price)) ||
    newFile !== null;

  async function saveAll(): Promise<void> {
    setCardError(null);
    try {
      let images = row.images;

      if (newFile) {
        if (!IMAGE_TYPES.includes(newFile.type)) {
          setCardError("That file is not a supported image (JPEG, PNG, WebP or AVIF).");
          return;
        }
        if (newFile.size > MAX_IMAGE_BYTES) {
          setCardError("That image is over the 10 MB limit.");
          return;
        }
        const supabase = createSupabaseBrowserClient();
        const path = buildObjectPath(row.kind === "camping" ? "camping" : "rooms", newFile);
        const result = await uploadFile(supabase, {
          bucket: "stays",
          file: newFile,
          path,
          onProgress: setProgress,
        });
        images = [...row.images, result.publicUrl];
      }

      await onSave(row.id, {
        name: name.trim() || row.name,
        tagline: tagline.trim() || null,
        description: description.trim() || null,
        capacity: capacity.trim().length > 0 ? Number(capacity) : null,
        beds: beds.trim() || null,
        amenities: amenities
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        tent_info: row.kind === "camping" && tentInfo.trim().length > 0 ? tentInfo.trim() : null,
        price: price.trim().length > 0 ? Number(price) : null,
        images,
      });
      setNewFile(null);
      setProgress(null);
    } catch (caught) {
      setCardError(caught instanceof Error ? caught.message : "Saving failed.");
    }
  }

  async function removeImage(index: number): Promise<void> {
    const url = row.images[index];
    if (!url) return;
    await onSave(row.id, { images: row.images.filter((_, i) => i !== index) });
  }

  return (
    <div className="admin-card-body">
      <div className="admin-card-head">
        <div>
          <strong>{row.name}</strong>
          <span className="admin-muted"> · /{row.kind === "camping" ? "camping" : "stay"}/{row.slug}</span>
        </div>
        <div className="admin-row">
          <span className="admin-badge" data-status={row.published ? "confirmed" : "cancelled"}>
            {row.published ? "published" : "hidden"}
          </span>
          {row.featured ? <span className="admin-badge">featured</span> : null}
        </div>
      </div>

      {cardError ? (
        <p className="admin-error" role="alert">
          {cardError}
        </p>
      ) : null}

      <div className="admin-form-grid">
        <label className="admin-field">
          <span className="admin-label">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        </label>
        <label className="admin-field">
          <span className="admin-label">Tagline</span>
          <input value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={160} />
        </label>
        <label className="admin-field admin-field-wide">
          <span className="admin-label">Description</span>
          <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label className="admin-field">
          <span className="admin-label">Capacity</span>
          <input
            type="number"
            min={1}
            max={30}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </label>
        <label className="admin-field">
          <span className="admin-label">Beds</span>
          <input value={beds} onChange={(e) => setBeds(e.target.value)} maxLength={120} />
        </label>
        {row.kind === "camping" ? (
          <label className="admin-field admin-field-wide">
            <span className="admin-label">Tent information</span>
            <input value={tentInfo} onChange={(e) => setTentInfo(e.target.value)} maxLength={200} />
          </label>
        ) : null}
        <label className="admin-field admin-field-wide">
          <span className="admin-label">Amenities (comma-separated)</span>
          <input value={amenities} onChange={(e) => setAmenities(e.target.value)} maxLength={300} />
        </label>
        <label className="admin-field">
          <span className="admin-label">Price (RWF / night, blank = “on request”)</span>
          <input
            type="number"
            min={0}
            step={100}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>

        <div className="admin-field admin-field-wide">
          <span className="admin-label">Photos ({row.images.length})</span>
          {row.images.length > 0 ? (
            <ul className="admin-thumbs">
              {row.images.map((url, index) => (
                <li key={url}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`${row.name} photo ${index + 1}`} />
                  <button
                    type="button"
                    className="admin-button admin-button-quiet"
                    disabled={busy}
                    onClick={() => void removeImage(index)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-muted">No photos yet.</p>
          )}
          {row.images.length < MAX_IMAGES ? (
            <label className="admin-field">
              <span className="admin-label">Add another photo</span>
              <input
                type="file"
                accept={IMAGE_TYPES.join(",")}
                onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
              />
            </label>
          ) : null}
          {progress ? (
            <progress value={progress.ratio} max={1} className="admin-progress" />
          ) : null}
        </div>
      </div>

      <div className="admin-row">
        <button
          type="button"
          className="admin-button"
          disabled={busy || !dirty}
          onClick={() => void saveAll()}
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          className="admin-button admin-button-quiet"
          disabled={busy}
          onClick={() => void onSave(row.id, { published: !row.published })}
        >
          {row.published ? "Unpublish" : "Publish"}
        </button>
        <button
          type="button"
          className="admin-button admin-button-quiet"
          disabled={busy}
          onClick={() => void onSave(row.id, { featured: !row.featured })}
        >
          {row.featured ? "Remove from featured" : "Feature on homepage"}
        </button>
        <button
          type="button"
          className="admin-button admin-button-quiet"
          disabled={busy}
          onClick={() => void onSave(row.id, { available: !row.available })}
        >
          {row.available ? `Mark unavailable` : "Mark available"}
        </button>
        <button
          type="button"
          className="admin-button admin-button-danger"
          disabled={busy}
          onClick={() => void onDelete(row.id)}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
