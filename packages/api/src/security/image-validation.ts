/**
 * Server-side image upload validation.
 *
 * The browser-supplied `File.type` (MIME) and `File.name` (extension)
 * are both attacker-controlled — a `.png` with a renamed `.exe` payload
 * would pass a naive `if (file.type === "image/png")` check and could
 * be served back from our public bucket with `Content-Type: image/png`
 * (XSS via stored polyglot, or simply abuse of free storage).
 *
 * This module decides what the file actually is by inspecting the
 * leading bytes ("magic numbers").  Only the formats whose signatures
 * we recognise here can be uploaded; everything else is rejected even
 * if the client claims `image/png`.
 *
 * Recognised formats:
 *   * PNG   — `89 50 4E 47 0D 0A 1A 0A`
 *   * JPEG  — `FF D8 FF`
 *   * WebP  — `52 49 46 46 ?? ?? ?? ?? 57 45 42 50`  (RIFF...WEBP)
 *
 * GIF, BMP, TIFF, SVG, PDF, ZIP, and exotics are deliberately not
 * supported — if you ever need to add one, expand the switch in
 * `detectImageMagicBytes` below.
 */

/** Canonical type codes we expose to callers. */
export type ImageKind = "png" | "jpeg" | "webp";

export interface ImageDetection {
  kind: ImageKind;
  /** Always the canonical MIME, never the client-supplied one. */
  mime: string;
  /** Always the canonical extension, never the client-supplied one. */
  ext: string;
}

const MIME_BY_KIND: Record<ImageKind, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

const EXT_BY_KIND: Record<ImageKind, string> = {
  png: "png",
  jpeg: "jpg",
  webp: "webp",
};

/**
 * Inspects up to the first 12 bytes of a file body and classifies it.
 *
 * Pass an `ArrayBuffer` (e.g. from `await file.arrayBuffer()`) or any
 * typed array.  Returns `null` if the bytes don't match any supported
 * format.
 */
export function detectImageMagicBytes(
  buffer: ArrayBuffer | Uint8Array,
): ImageDetection | null {
  const view = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    view.length >= 8 &&
    view[0] === 0x89 &&
    view[1] === 0x50 &&
    view[2] === 0x4e &&
    view[3] === 0x47 &&
    view[4] === 0x0d &&
    view[5] === 0x0a &&
    view[6] === 0x1a &&
    view[7] === 0x0a
  ) {
    return { kind: "png", mime: MIME_BY_KIND.png, ext: EXT_BY_KIND.png };
  }

  // JPEG: FF D8 FF (followed by various flavour bytes — all valid JPEG variants)
  if (
    view.length >= 3 &&
    view[0] === 0xff &&
    view[1] === 0xd8 &&
    view[2] === 0xff
  ) {
    return { kind: "jpeg", mime: MIME_BY_KIND.jpeg, ext: EXT_BY_KIND.jpeg };
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    view.length >= 12 &&
    view[0] === 0x52 && // R
    view[1] === 0x49 && // I
    view[2] === 0x46 && // F
    view[3] === 0x46 && // F
    view[8] === 0x57 && // W
    view[9] === 0x45 && // E
    view[10] === 0x42 && // B
    view[11] === 0x50 // P
  ) {
    return { kind: "webp", mime: MIME_BY_KIND.webp, ext: EXT_BY_KIND.webp };
  }

  return null;
}

/**
 * Result of `validateImageUpload`.  `ok=false` carries a stable
 * machine-readable `code` plus an Arabic + English message so callers
 * can render whichever fits their UI.
 */
export type ImageValidationResult =
  | {
      ok: true;
      detection: ImageDetection;
      buffer: ArrayBuffer;
    }
  | {
      ok: false;
      code:
        | "no_file"
        | "empty_file"
        | "too_large"
        | "unrecognised_format"
        | "format_not_allowed";
      messageAr: string;
      messageEn: string;
    };

export interface ValidateImageOptions {
  /** Hard cap on file size, in bytes. */
  maxBytes: number;
  /** Subset of formats this caller will accept (defaults to all three). */
  allowedKinds?: readonly ImageKind[];
}

/**
 * End-to-end image validator: size + magic bytes + caller-allowed kinds.
 *
 * Returns `{ ok: true, detection, buffer }` on success — the buffer is
 * the already-read body so the caller can pass it straight to storage
 * without re-reading the file.  On failure, `{ ok: false, code, … }`.
 *
 * This intentionally returns the canonical MIME/extension from the
 * detection result so callers never have a chance to put the
 * client-supplied values onto the storage object.
 */
export async function validateImageUpload(
  file: File,
  options: ValidateImageOptions,
): Promise<ImageValidationResult> {
  const allowed: readonly ImageKind[] = options.allowedKinds ?? [
    "png",
    "jpeg",
    "webp",
  ];

  if (!file) {
    return {
      ok: false,
      code: "no_file",
      messageAr: "لم يتم اختيار ملف.",
      messageEn: "No file selected.",
    };
  }
  if (file.size === 0) {
    return {
      ok: false,
      code: "empty_file",
      messageAr: "الملف فارغ.",
      messageEn: "File is empty.",
    };
  }
  if (file.size > options.maxBytes) {
    const mb = Math.round(options.maxBytes / 1024 / 1024);
    return {
      ok: false,
      code: "too_large",
      messageAr: `حجم الملف أكبر من ${mb} ميغابايت.`,
      messageEn: `File is larger than ${mb} MB.`,
    };
  }

  const buffer = await file.arrayBuffer();
  const detection = detectImageMagicBytes(buffer);
  if (!detection) {
    return {
      ok: false,
      code: "unrecognised_format",
      messageAr: "صيغة الملف غير مدعومة (PNG / JPG / WebP فقط).",
      messageEn: "Unsupported file format (PNG / JPG / WebP only).",
    };
  }
  if (!allowed.includes(detection.kind)) {
    return {
      ok: false,
      code: "format_not_allowed",
      messageAr: "صيغة الملف غير مسموحة لهذا المكان.",
      messageEn: "This format is not allowed here.",
    };
  }

  return { ok: true, detection, buffer };
}

/**
 * Build a storage object key that does not leak timing or sequencing
 * information.  Pattern: `{prefix}/{uuid}.{ext}`.
 *
 * The previous pattern used `Date.now()` which leaks the upload
 * ordering and (when combined with sequential uploads) makes it
 * trivial to enumerate other users' assets.  A v4 UUID has 122 bits
 * of randomness — collisions are not a concern.
 */
export function buildStorageKey(prefix: string, ext: string): string {
  // crypto.randomUUID is available in Node 18+ and the Edge runtime.
  const uuid = globalThis.crypto.randomUUID();
  const safePrefix = prefix.replace(/[^a-z0-9_\-/]/gi, "_");
  return `${safePrefix}/${uuid}.${ext}`;
}
