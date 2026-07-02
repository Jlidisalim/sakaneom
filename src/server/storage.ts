// ────────────────────────────────────────────────────────────────────────────
// Storage adapter — the single seam between the data store and the host.
//
// The app persists three JSON "blobs" (content, leads, analytics) plus binary
// image uploads. Everything goes through a StorageAdapter so the rest of the app
// stays host-agnostic: today it's a filesystem adapter (a single long-lived Node
// instance with a persistent disk — e.g. an OVH VPS). Swapping in a KV/R2/S3
// adapter later means implementing this one interface and nothing else changes.
//
// ⚠️ SINGLE-INSTANCE: the filesystem adapter is durable but NOT multi-writer safe
// across processes. Run exactly ONE server instance (no PM2 cluster / replicas).
// Point DATA_DIR and UPLOAD_DIR at a persistent location OUTSIDE the deploy
// directory so redeploys/rsync never wipe leads, content or uploads. See
// docs/DEPLOY.md.
//
// node: built-ins are imported lazily so this module is never pulled into the
// client bundle.
// ────────────────────────────────────────────────────────────────────────────

export type BlobKey =
  | "content"
  | "leads"
  | "analytics"
  // ── Back-office collections ───────────────────────────────────────────────────
  | "rendezvous"
  | "users"
  | "settings";

export interface StorageAdapter {
  /** Read a JSON blob, returning `fallback` when absent/unreadable. */
  readBlob<T>(key: BlobKey, fallback: T): Promise<T>;
  /** Atomically persist a JSON blob (temp-write + rename — no half-written file). */
  writeBlob(key: BlobKey, value: unknown): Promise<void>;
  /** Persist raw image bytes; returns the public path (e.g. `/uploads/ab12.webp`). */
  saveUpload(bytes: Uint8Array, ext: string): Promise<string>;
  /** Read an uploaded file by its public basename, or null if missing/unsafe. */
  readUpload(name: string): Promise<{ bytes: ArrayBuffer; ext: string } | null>;
  /** Throw if storage isn't readable+writable (startup self-test). */
  probe(): Promise<void>;
  /** Human-readable description of where data lives (for logs). */
  describe(): string;
}

const BLOB_FILES: Record<BlobKey, string> = {
  content: "content.json",
  leads: "leads.json",
  analytics: "analytics.json",
  rendezvous: "rendezvous.json",
  users: "users.json",
  settings: "settings.json",
};

// Image extensions we will serve, mapped to their response Content-Type.
// SVG is intentionally excluded — it can carry <script> and would be an XSS
// vector when served same-origin. Uploads are validated by magic bytes anyway.
export const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

const IS_PROD = process.env.NODE_ENV === "production";

/**
 * In production, refuse to start unless DATA_DIR and UPLOAD_DIR are explicitly set.
 * The defaults resolve INSIDE the build/deploy dir (./data, ./public/uploads), which
 * a redeploy (rsync --delete / fresh clone / rebuilt .output) silently wipes — every
 * lead and uploaded image gone. Fail loud and early instead, mirroring the auth guard
 * in auth.ts. Point them at a persistent dir OUTSIDE the deploy folder (docs/DEPLOY.md).
 */
function assertStorageConfig(): void {
  if (!IS_PROD) return;
  const missing: string[] = [];
  if (!process.env.DATA_DIR?.trim()) missing.push("DATA_DIR");
  if (!process.env.UPLOAD_DIR?.trim()) missing.push("UPLOAD_DIR");
  if (missing.length) {
    throw new Error(
      `[storage] Refusing to start in production — ${missing.join(" and ")} must be set to a ` +
        `PERSISTENT directory OUTSIDE the deploy folder (see docs/DEPLOY.md). The defaults live ` +
        `inside the build dir and are wiped on every redeploy.`,
    );
  }
}

async function nodeMod() {
  const path = await import("node:path");
  const fs = await import("node:fs/promises");
  return { path, fs };
}

type PathMod = typeof import("node:path");

function resolveDataDir(path: PathMod): string {
  const env = process.env.DATA_DIR?.trim();
  return env ? path.resolve(env) : path.join(process.cwd(), "data");
}

function resolveUploadDir(path: PathMod): string {
  const env = process.env.UPLOAD_DIR?.trim();
  return env ? path.resolve(env) : path.join(process.cwd(), "public", "uploads");
}

function createFsAdapter(): StorageAdapter {
  return {
    async readBlob<T>(key: BlobKey, fallback: T): Promise<T> {
      const { path, fs } = await nodeMod();
      const file = path.join(resolveDataDir(path), BLOB_FILES[key]);
      try {
        const raw = await fs.readFile(file, "utf8");
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    },

    async writeBlob(key: BlobKey, value: unknown): Promise<void> {
      const { path, fs } = await nodeMod();
      const dir = resolveDataDir(path);
      await fs.mkdir(dir, { recursive: true });
      const file = path.join(dir, BLOB_FILES[key]);
      // Write to a unique temp file then rename — avoids a half-written JSON on crash.
      const tmp = `${file}.${process.pid}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
      await fs.rename(tmp, file);
    },

    async saveUpload(bytes: Uint8Array, ext: string): Promise<string> {
      const { path, fs } = await nodeMod();
      const dir = resolveUploadDir(path);
      await fs.mkdir(dir, { recursive: true });
      const name = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      await fs.writeFile(path.join(dir, name), bytes);
      return `/uploads/${name}`;
    },

    async readUpload(name: string): Promise<{ bytes: ArrayBuffer; ext: string } | null> {
      const { path, fs } = await nodeMod();
      // Only accept a bare basename of the shape we mint — defends against path
      // traversal (`../`, absolute paths, encoded separators).
      const base = path.basename(name);
      if (base !== name || !/^[a-z0-9][a-z0-9._-]*$/i.test(base)) return null;
      const ext = path.extname(base).slice(1).toLowerCase();
      if (!(ext in CONTENT_TYPE_BY_EXT)) return null;
      const dir = resolveUploadDir(path);
      const full = path.join(dir, base);
      if (!full.startsWith(dir + path.sep)) return null;
      try {
        const buf = await fs.readFile(full);
        // Copy into a standalone ArrayBuffer (a clean BodyInit, and detached from
        // any pooled Node Buffer backing store).
        const bytes = new ArrayBuffer(buf.byteLength);
        new Uint8Array(bytes).set(buf);
        return { bytes, ext };
      } catch {
        return null;
      }
    },

    async probe(): Promise<void> {
      const { path, fs } = await nodeMod();
      const dir = resolveDataDir(path);
      await fs.mkdir(dir, { recursive: true });
      // Sweep orphaned temp files left by a crash mid-write (writeBlob does
      // temp-write + rename, so the real JSON is never corrupt — only a stray
      // `*.tmp` can linger). Best-effort: never let cleanup block startup.
      try {
        for (const f of await fs.readdir(dir)) {
          if (f.endsWith(".tmp")) await fs.rm(path.join(dir, f), { force: true });
        }
      } catch {
        /* ignore — cleanup is non-critical */
      }
      const file = path.join(dir, ".probe");
      const token = crypto.randomUUID();
      await fs.writeFile(file, token, "utf8");
      const back = await fs.readFile(file, "utf8");
      await fs.rm(file, { force: true });
      if (back !== token) throw new Error("storage probe read-back mismatch");
    },

    describe(): string {
      // Show the ACTUAL resolved paths so the startup log makes it obvious whether
      // data lives outside the deploy dir (the whole point of DATA_DIR/UPLOAD_DIR).
      const cwd = process.cwd();
      const data = process.env.DATA_DIR?.trim() || `${cwd}/data`;
      const up = process.env.UPLOAD_DIR?.trim() || `${cwd}/public/uploads`;
      return `fs adapter — data:${data} uploads:${up}`;
    },
  };
}

let adapter: StorageAdapter | null = null;

/** The process-wide storage adapter (filesystem today). */
export function getStorage(): StorageAdapter {
  if (!adapter) adapter = createFsAdapter();
  return adapter;
}

let readyPromise: Promise<void> | null = null;

/**
 * Run the storage self-test once per process. Memoized on success; on failure
 * it clears so the next request retries (and surfaces the error loudly). Call
 * this from the server entry before handling requests so a non-writable data
 * dir fails fast instead of silently dropping leads.
 */
export function ensureStorageReady(): Promise<void> {
  // Validate config first (throws synchronously in a misconfigured prod) so a
  // redeploy-wiping default can never boot silently.
  assertStorageConfig();
  if (!readyPromise) {
    const store = getStorage();
    readyPromise = store.probe().then(
      () => {
        console.log(`[storage] ready — ${store.describe()}`);
      },
      (err: unknown) => {
        readyPromise = null;
        console.error(`[storage] NOT writable — ${store.describe()}`, err);
        throw err instanceof Error ? err : new Error(String(err));
      },
    );
  }
  return readyPromise;
}
