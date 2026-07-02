// ────────────────────────────────────────────────────────────────────────────
// Persistence for the remaining operational entities (Rendez-vous, Settings).
// Same pattern as the leads block in store.ts: disk access via getStorage(),
// every mutation wrapped in the shared serialize() write-chain, ids/timestamps
// minted server-side.
// ────────────────────────────────────────────────────────────────────────────
import type { RendezVous, Settings } from "@/lib/promo/types";
import type { BlobKey } from "./storage";
import { getStorage } from "./storage";
import { serialize } from "./store";

// ── Generic array-collection CRUD ─────────────────────────────────────────────

type Persisted = { id: string; createdAt: string };

async function readArray<T>(key: BlobKey): Promise<T[]> {
  const v = await getStorage().readBlob<T[]>(key, []);
  return Array.isArray(v) ? v : [];
}

function makeCollection<T extends Persisted>(key: BlobKey) {
  return {
    list: () => readArray<T>(key),
    async get(id: string): Promise<T | null> {
      const all = await readArray<T>(key);
      return all.find((x) => x.id === id) ?? null;
    },
    add(input: Omit<T, "id" | "createdAt">): Promise<T> {
      return serialize(async () => {
        const all = await readArray<T>(key);
        const rec = {
          ...(input as object),
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        } as T;
        all.unshift(rec);
        await getStorage().writeBlob(key, all);
        return rec;
      });
    },
    update(id: string, patch: Partial<T>): Promise<T | null> {
      return serialize(async () => {
        const all = await readArray<T>(key);
        const idx = all.findIndex((x) => x.id === id);
        if (idx === -1) return null;
        const { id: _i, createdAt: _c, ...safe } = patch as Record<string, unknown>;
        all[idx] = { ...all[idx], ...(safe as Partial<T>) };
        await getStorage().writeBlob(key, all);
        return all[idx];
      });
    },
    remove(id: string): Promise<boolean> {
      return serialize(async () => {
        const all = await readArray<T>(key);
        const next = all.filter((x) => x.id !== id);
        if (next.length === all.length) return false;
        await getStorage().writeBlob(key, next);
        return true;
      });
    },
  };
}

export const rendezvous = makeCollection<RendezVous>("rendezvous");

// ── Settings (a singleton object blob, not an array) ──────────────────────────

const DEFAULT_SETTINGS: Settings = {
  companyName: "SAKANEOM",
  logo: "",
  email: "",
  phone: "",
  adresse: "",
  ville: "",
  defaultCurrency: "TND",
  matriculeFiscal: "",
};

export async function readSettings(): Promise<Settings> {
  const stored = await getStorage().readBlob<Partial<Settings> | null>("settings", null);
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}

export async function writeSettings(patch: Partial<Settings>): Promise<Settings> {
  return serialize(async () => {
    const current = await readSettings();
    const next = { ...current, ...patch };
    await getStorage().writeBlob("settings", next);
    return next;
  });
}
