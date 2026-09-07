"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

/**
 * File upload with automatic resumable handling.
 *
 * Supabase's standard upload sends the whole file in one request. For a hero
 * video over a Rwandan mobile connection that is the wrong shape: one dropped
 * packet at 95% and the entire 80 MB starts again. Supabase's guidance is to
 * use resumable (TUS) uploads above roughly 6 MB or on unreliable networks —
 * both of which describe this exact case.
 *
 * Resumable uploads are chunked and can pick up where they left off, so this
 * also gives real progress reporting instead of a spinner that lies.
 */

/** Above this, use the resumable protocol. Supabase's own recommendation. */
export const RESUMABLE_THRESHOLD_BYTES = 6 * 1024 * 1024;

export type UploadProgress = Readonly<{
  bytesUploaded: number;
  bytesTotal: number;
  /** 0 → 1. */
  ratio: number;
}>;

export type UploadResult = Readonly<{ path: string; publicUrl: string }>;

export type UploadOptions = Readonly<{
  bucket: "hero" | "menu" | "gallery" | "stays";
  file: File;
  /** Path inside the bucket. Include the extension. */
  path: string;
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
}>;

/**
 * MIME types this site uploads, by file extension.
 *
 * Used only to fill in a type when the browser did not supply one — nothing
 * here converts or re-encodes a file. A WebP is stored as a WebP, a JPG as a
 * JPG; the bytes the admin picked are the bytes that reach Storage.
 */
const EXTENSION_TYPES: Readonly<Record<string, string>> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

function extensionFromName(file: File): string {
  if (!file.name.includes(".")) return "";
  const candidate = file.name.slice(file.name.lastIndexOf(".") + 1).toLowerCase();
  return /^[a-z0-9]{1,5}$/.test(candidate) ? candidate : "";
}

/**
 * The MIME type to upload with.
 *
 * `file.type` is usually right but is not guaranteed — some Android browsers
 * and file pickers return an empty string. Without a type, Storage cannot
 * match the bucket's `allowed_mime_types` and rejects a perfectly valid image
 * (this is how a good WebP ends up "failing to upload"), so fall back to the
 * file's own extension.
 */
export function contentTypeFor(file: File): string | undefined {
  if (file.type.length > 0) return file.type;
  return EXTENSION_TYPES[extensionFromName(file)];
}

/**
 * Filenames are namespaced by time so a re-upload never fights the CDN cache.
 *
 * The extension is kept from the original file wherever it has one; when it
 * has none (a photo handed over by a share sheet, say) it is derived from the
 * MIME type so both the CDN's Content-Type and the bucket's allowed-type check
 * stay correct.
 */
export function buildObjectPath(prefix: string, file: File): string {
  const fromName = extensionFromName(file);
  const byType = Object.entries(EXTENSION_TYPES).find(
    ([, mime]) => mime === contentTypeFor(file),
  )?.[0];
  const extension = fromName || byType || "bin";
  const stamp = new Date().toISOString().replace(/[^\d]/g, "").slice(0, 14);
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}/${stamp}-${random}.${extension}`;
}

export async function uploadFile(
  supabase: SupabaseClient<Database>,
  { bucket, file, path, onProgress, signal }: UploadOptions,
): Promise<UploadResult> {
  if (file.size <= RESUMABLE_THRESHOLD_BYTES) {
    onProgress?.({ bytesUploaded: 0, bytesTotal: file.size, ratio: 0 });

    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: contentTypeFor(file),
    });
    if (error) throw error;

    onProgress?.({ bytesUploaded: file.size, bytesTotal: file.size, ratio: 1 });
  } else {
    await uploadResumable(supabase, { bucket, file, path, onProgress, signal });
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

/**
 * TUS upload against Supabase Storage's resumable endpoint.
 *
 * `tus-js-client` is loaded dynamically so its ~15 KB only reaches the browser
 * of someone who is actually uploading a large file — never a restaurant
 * guest reading the menu.
 */
async function uploadResumable(
  supabase: SupabaseClient<Database>,
  { bucket, file, path, onProgress, signal }: UploadOptions,
): Promise<void> {
  const [{ Upload }, sessionResult] = await Promise.all([
    import("tus-js-client"),
    supabase.auth.getSession(),
  ]);

  const accessToken = sessionResult.data.session?.access_token;
  if (!accessToken) throw new Error("Not signed in.");

  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  await new Promise<void>((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: `${projectUrl}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      headers: {
        authorization: `Bearer ${accessToken}`,
        "x-upsert": "false",
      },
      uploadDataDuringCreation: true,
      // Supabase requires exactly 6 MB chunks on this endpoint.
      chunkSize: 6 * 1024 * 1024,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: bucket,
        objectName: path,
        contentType: contentTypeFor(file) ?? "application/octet-stream",
        cacheControl: "31536000",
      },
      onError: reject,
      onProgress: (bytesUploaded, bytesTotal) => {
        onProgress?.({
          bytesUploaded,
          bytesTotal,
          ratio: bytesTotal > 0 ? bytesUploaded / bytesTotal : 0,
        });
      },
      onSuccess: () => resolve(),
    });

    signal?.addEventListener("abort", () => {
      void upload.abort();
      reject(new DOMException("Upload cancelled", "AbortError"));
    });

    // Resume a previous attempt for the same file if one is on record.
    void upload.findPreviousUploads().then((previous) => {
      if (previous.length > 0 && previous[0]) {
        upload.resumeFromPreviousUpload(previous[0]);
      }
      upload.start();
    });
  });
}
