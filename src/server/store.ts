// ────────────────────────────────────────────────────────────────────────────
// Server-side persistence. Content + leads + analytics live as JSON blobs and
// uploaded images as binary files, all behind the StorageAdapter seam (see
// storage.ts). The adapter is filesystem-backed today (a single long-lived Node
// host with a persistent disk); the domain logic below — merge/normalize,
// read-modify-write, the serialized write chain — is host-agnostic and stays put
// when the adapter is swapped for KV/R2/S3.
// ────────────────────────────────────────────────────────────────────────────
import { DEFAULT_CONTENT } from "@/lib/cms/defaults";
import { mergeContent } from "@/lib/cms/select";
import type { Analytics, Content, Lead, TrackType } from "@/lib/cms/types";
import { captureServerError } from "@/lib/monitoring";
import { getStorage } from "./storage";

// Serialize writes so concurrent admin saves can't interleave / clobber. Exported
// so the promotion back-office collections (src/server/promo-store.ts) share this
// ONE process-wide write chain — every blob mutation app-wide stays consistent.
let writeChain: Promise<unknown> = Promise.resolve();
export function serialize<T>(task: () => Promise<T>): Promise<T> {
  const run = writeChain.then(task, task);
  // Keep the chain alive past a failed write, but never SILENTLY: log it so a disk
  // failure (ENOSPC/EACCES) is visible in the logs / monitoring even for the
  // fire-and-forget writers (e.g. the analytics flush) that don't await `run`.
  writeChain = run.catch((err) => captureServerError(err, { source: "write-chain" }));
  return run;
}

// ── Content ─────────────────────────────────────────────────────────────────

export async function readContent(): Promise<Content> {
  const stored = await getStorage().readBlob<Partial<Content> | null>("content", null);
  return mergeContent(stored ?? DEFAULT_CONTENT);
}

export async function writeContent(next: Content): Promise<Content> {
  return serialize(async () => {
    const merged = mergeContent(next);
    merged.updatedAt = new Date().toISOString();
    merged.version = (merged.version ?? 1) + 0; // keep version; bumped by callers if needed
    await getStorage().writeBlob("content", merged);
    return merged;
  });
}

/** Replace a single top-level section and persist. */
export async function patchContent(section: string, value: unknown): Promise<Content> {
  return serialize(async () => {
    const current = await readContent();
    const next = mergeContent({ ...current, [section]: value });
    next.updatedAt = new Date().toISOString();
    await getStorage().writeBlob("content", next);
    return next;
  });
}

export async function resetContent(): Promise<Content> {
  return serialize(async () => {
    const fresh = mergeContent(DEFAULT_CONTENT);
    fresh.updatedAt = new Date().toISOString();
    await getStorage().writeBlob("content", fresh);
    return fresh;
  });
}

// ── Leads ─────────────────────────────────────────────────────────────────

export async function readLeads(): Promise<Lead[]> {
  const leads = await getStorage().readBlob<Lead[]>("leads", []);
  return Array.isArray(leads) ? leads : [];
}

export async function addLead(input: Omit<Lead, "id" | "createdAt" | "status">): Promise<Lead> {
  return serialize(async () => {
    const leads = await readLeads();
    const lead: Lead = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: "new",
    };
    leads.unshift(lead);
    await getStorage().writeBlob("leads", leads);
    return lead;
  });
}

export async function updateLead(id: string, patch: Partial<Lead>): Promise<Lead | null> {
  return serialize(async () => {
    const leads = await readLeads();
    const idx = leads.findIndex((l) => l.id === id);
    if (idx === -1) return null;
    const { id: _ignore, createdAt: _ignore2, ...safe } = patch;
    leads[idx] = { ...leads[idx], ...safe };
    await getStorage().writeBlob("leads", leads);
    return leads[idx];
  });
}

export async function deleteLead(id: string): Promise<boolean> {
  return serialize(async () => {
    const leads = await readLeads();
    const next = leads.filter((l) => l.id !== id);
    if (next.length === leads.length) return false;
    await getStorage().writeBlob("leads", next);
    return true;
  });
}

// ── Image uploads ───────────────────────────────────────────────────────────

/**
 * Detect the real image type from the file's magic bytes — we never trust the
 * client-supplied MIME. Returns the canonical extension, or null if the bytes
 * aren't a recognized raster image. Crucially this rejects SVG (which is text
 * and can carry <script>, an XSS vector when served same-origin).
 */
function sniffImageExt(b: Buffer): string | null {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
    return "png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length >= 6 && b.toString("ascii", 0, 4) === "GIF8") return "gif";
  if (
    b.length >= 12 &&
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WEBP"
  )
    return "webp";
  if (b.length >= 12 && b.toString("ascii", 4, 8) === "ftyp") {
    const brand = b.toString("ascii", 8, 12);
    if (brand === "avif" || brand === "avis") return "avif";
  }
  return null;
}

/**
 * Persist a base64 data URL to the upload store and return its public path. The
 * stored extension is derived from the bytes (not the claimed MIME); anything
 * that isn't a real PNG/JPEG/WebP/GIF/AVIF is rejected. Images should be
 * downscaled client-side first to keep payloads small.
 */
export async function saveUpload(dataUrl: string): Promise<string> {
  const match = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error("Invalid data URL");
  const isBase64 = !!match[2];

  const buffer = isBase64
    ? Buffer.from(match[3], "base64")
    : Buffer.from(decodeURIComponent(match[3]), "utf8");

  const MAX_BYTES = 8 * 1024 * 1024; // 8 MB safety cap
  if (buffer.byteLength > MAX_BYTES) throw new Error("Image too large (max 8 MB)");

  const ext = sniffImageExt(buffer);
  if (!ext) throw new Error("Unsupported image — only PNG, JPEG, WebP, GIF or AVIF are allowed");

  return getStorage().saveUpload(buffer, ext);
}

// ── Analytics ───────────────────────────────────────────────────────────────

const DAILY_KEEP = 60; // days of trend retained

function emptyAnalytics(now: string): Analytics {
  return {
    totalViews: 0,
    uniqueVisitors: 0,
    homeViews: 0,
    residenceViews: {},
    daily: {},
    startedAt: now,
    updatedAt: now,
  };
}

// In-memory analytics, flushed to disk on a debounce. Each page view used to
// trigger a serialized file write; instead we mutate this cache synchronously and
// coalesce a burst of views into a single write (FLUSH_MS). A crash can lose at
// most the last few seconds of counts — acceptable for best-effort analytics.
let analyticsCache: Analytics | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_MS = 3000;

async function loadAnalytics(): Promise<Analytics> {
  if (analyticsCache) return analyticsCache;
  const stored = await getStorage().readBlob<Partial<Analytics> | null>("analytics", null);
  const base = emptyAnalytics("");
  analyticsCache = {
    ...base,
    ...(stored ?? {}),
    residenceViews: { ...(stored?.residenceViews ?? {}) },
    daily: { ...(stored?.daily ?? {}) },
  };
  return analyticsCache;
}

function cloneAnalytics(a: Analytics): Analytics {
  return { ...a, residenceViews: { ...a.residenceViews }, daily: { ...a.daily } };
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    const snapshot = analyticsCache;
    if (snapshot) void serialize(() => getStorage().writeBlob("analytics", snapshot));
  }, FLUSH_MS);
}

export async function readAnalytics(): Promise<Analytics> {
  // Return a copy so callers can't mutate the cache; reflects unflushed counts.
  return cloneAnalytics(await loadAnalytics());
}

/** Record a single page view; increments unique visitors when `newVisitor`. */
export async function recordView(opts: {
  type: TrackType;
  slug?: string;
  newVisitor: boolean;
}): Promise<Analytics> {
  const a = await loadAnalytics();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  if (!a.startedAt) a.startedAt = now.toISOString();

  a.totalViews += 1;
  if (opts.newVisitor) a.uniqueVisitors += 1;
  if (opts.type === "home") a.homeViews += 1;
  if (opts.type === "residence" && opts.slug) {
    a.residenceViews[opts.slug] = (a.residenceViews[opts.slug] ?? 0) + 1;
  }
  a.daily[today] = (a.daily[today] ?? 0) + 1;

  // Prune old daily entries.
  const keys = Object.keys(a.daily).sort();
  if (keys.length > DAILY_KEEP) {
    for (const k of keys.slice(0, keys.length - DAILY_KEEP)) delete a.daily[k];
  }

  a.updatedAt = now.toISOString();
  scheduleFlush();
  return cloneAnalytics(a);
}

export async function resetAnalytics(): Promise<Analytics> {
  return serialize(async () => {
    const fresh = emptyAnalytics(new Date().toISOString());
    analyticsCache = fresh; // keep the in-memory cache in step with the reset
    await getStorage().writeBlob("analytics", fresh);
    return cloneAnalytics(fresh);
  });
}
