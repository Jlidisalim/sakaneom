// ────────────────────────────────────────────────────────────────────────────
// Server functions — the RPC surface between the browser and the data store.
// Public functions (content read, lead create) are open; everything that mutates
// site content or reads leads is gated behind requireAdmin().
//
// This file lives outside src/server/ on purpose: it is imported by client code,
// and TanStack Start's compiler turns each createServerFn() into a client→server
// RPC bridge, stripping the server-only imports (store/auth) from the client
// bundle. The actual server-only logic stays under src/server/.
// ────────────────────────────────────────────────────────────────────────────
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { Analytics, Content, Lead, SectionKey } from "@/lib/cms/types";
import {
  addLead,
  deleteLead as deleteLeadStore,
  patchContent,
  readAnalytics,
  readContent,
  readLeads,
  resetAnalytics,
  resetContent,
  saveUpload,
  updateLead as updateLeadStore,
  writeContent,
} from "@/server/store";
import { trackView } from "@/server/analytics";
import { currentAuth, login, logout, requireAdmin, requireCap, requireRole } from "@/server/auth";
import { rateLimit, type RateOptions } from "@/server/rate-limit";
import { clientIp } from "@/server/request";
import { validateContent, validateSection } from "@/lib/cms/schema";

/** Apply a rate limit for the current client; throws a 429-style error if over. */
function enforceRate(prefix: string, opts: RateOptions): void {
  const { ok, retryAfterSec } = rateLimit(`${prefix}:${clientIp()}`, opts, Date.now());
  if (!ok) throw new Error(`Too many requests — try again in ${retryAfterSec}s`);
}

// ── Public: content ──────────────────────────────────────────────────────────

export const getContentFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<Content> => readContent(),
);

// ── Public: lead capture (the "Request Info" forms) ──────────────────────────

const leadInputSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(200),
  email: z.string().trim().email("Invalid email").max(200),
  phone: z.string().trim().max(60).optional().default(""),
  apt: z.string().trim().max(160).optional(),
  residence: z.string().trim().max(120).optional(),
  message: z.string().trim().max(5000).optional(),
  source: z.enum(["contact", "info-panel"]),
  lang: z.enum(["fr", "ar"]).optional(),
  // Anti-spam (not persisted): a honeypot field bots tend to fill, and ms elapsed
  // since the form mounted (humans take longer than a bot's instant submit).
  hp: z.string().max(200).optional(),
  elapsedMs: z.number().nonnegative().optional(),
});

const MIN_SUBMIT_MS = 1500;

export const createLeadFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => leadInputSchema.parse(data))
  .handler(async ({ data }): Promise<{ ok: true; id: string }> => {
    // Drop obvious bots silently (honeypot filled, or submitted impossibly fast)
    // so they don't learn they were caught — looks like success, stores nothing.
    if (
      (data.hp && data.hp.trim() !== "") ||
      (data.elapsedMs !== undefined && data.elapsedMs < MIN_SUBMIT_MS)
    ) {
      return { ok: true, id: "" };
    }
    // Cap genuine submissions per IP to blunt lead-spam floods.
    enforceRate("lead", { limit: 5, windowMs: 10 * 60_000, blockMs: 10 * 60_000 });

    const lead = await addLead({
      name: data.name,
      email: data.email,
      phone: data.phone ?? "",
      apt: data.apt,
      residence: data.residence,
      message: data.message,
      source: data.source,
      lang: data.lang,
    });
    return { ok: true, id: lead.id };
  });

// ── Auth ─────────────────────────────────────────────────────────────────────

export const checkAuthFn = createServerFn({ method: "GET" }).handler(async () => currentAuth());

export const loginFn = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; password: string }) => ({
    email: String(data?.email ?? ""),
    password: String(data?.password ?? ""),
  }))
  .handler(async ({ data }) => {
    // Throttle brute force: 5 attempts/min/IP, then a 5-minute lockout.
    enforceRate("login", { limit: 5, windowMs: 60_000, blockMs: 5 * 60_000 });
    return login(data.email, data.password);
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: true }> => {
    await logout();
    return { ok: true };
  },
);

// ── Admin: content mutations ──────────────────────────────────────────────────

// Editing the public marketing site is reserved to Super Admin / Directeur.
export const saveSectionFn = createServerFn({ method: "POST" })
  .inputValidator((data: { section: SectionKey; value: unknown }) => data)
  .handler(async ({ data }): Promise<Content> => {
    await requireRole("super_admin", "manager");
    // Reject a malformed section payload before it can corrupt the store.
    const value = validateSection(data.section, data.value);
    return patchContent(data.section, value);
  });

export const saveContentFn = createServerFn({ method: "POST" })
  .inputValidator((data: { content: Content }) => data)
  .handler(async ({ data }): Promise<Content> => {
    await requireRole("super_admin", "manager");
    return writeContent(validateContent(data.content));
  });

export const resetContentFn = createServerFn({ method: "POST" }).handler(
  async (): Promise<Content> => {
    await requireRole("super_admin", "manager");
    return resetContent();
  },
);

// ── Admin: image upload ────────────────────────────────────────────────────────

export const uploadImageFn = createServerFn({ method: "POST" })
  .inputValidator((data: { dataUrl: string }) => ({
    dataUrl: String(data?.dataUrl ?? ""),
  }))
  .handler(async ({ data }): Promise<{ url: string }> => {
    await requireAdmin();
    const url = await saveUpload(data.dataUrl);
    return { url };
  });

// ── Admin: leads ───────────────────────────────────────────────────────────────

export const listLeadsFn = createServerFn({ method: "GET" }).handler(async (): Promise<Lead[]> => {
  await requireCap("leads:read");
  return readLeads();
});

export const updateLeadFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; patch: Partial<Lead> }) => data)
  .handler(async ({ data }): Promise<Lead | null> => {
    await requireCap("leads:write");
    return updateLeadStore(data.id, data.patch);
  });

export const deleteLeadFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => ({ id: String(data?.id ?? "") }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await requireCap("leads:write");
    return { ok: await deleteLeadStore(data.id) };
  });

// ── Analytics ──────────────────────────────────────────────────────────────────

const trackInputSchema = z.object({
  type: z.enum(["home", "residence"]),
  slug: z.string().max(120).optional(),
});

/** Public: record a page view (home or a residence). Sets a visitor cookie. */
export const trackViewFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => trackInputSchema.parse(data))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    // Each view triggers a serialized file write; cap per IP so a flood can't
    // inflate counts or back up the write chain. Over-limit views are dropped
    // silently (analytics must never break or block the page).
    const { ok } = rateLimit(`track:${clientIp()}`, { limit: 60, windowMs: 60_000 }, Date.now());
    if (!ok) return { ok: true };
    await trackView(data.type, data.slug);
    return { ok: true };
  });

export const getAnalyticsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<Analytics> => {
    await requireAdmin();
    return readAnalytics();
  },
);

export const resetAnalyticsFn = createServerFn({ method: "POST" }).handler(
  async (): Promise<Analytics> => {
    await requireAdmin();
    return resetAnalytics();
  },
);
