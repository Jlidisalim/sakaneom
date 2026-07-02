// ────────────────────────────────────────────────────────────────────────────
// Server functions for the remaining operational modules (Rendez-vous, Settings)
// plus a minimal agent directory. Same conventions as src/lib/cms/api.ts: every
// createServerFn() lives OUTSIDE src/server/, authorization enforced here.
//   • Commercial is OWNER-SCOPED on rendez-vous (sees / creates only its own).
// ────────────────────────────────────────────────────────────────────────────
import { createServerFn } from "@tanstack/react-start";

import { requireAuth, requireCap } from "@/server/auth";
import { rendezvous, readSettings, writeSettings } from "@/server/promo-store";
import * as usersStore from "@/server/users";
import { isOwnerScoped } from "./permissions";
import { newRendezVous } from "./defaults";
import { rendezVousInputSchema, settingsSchema } from "./schema";
import type { PublicUser, RendezVous, Settings } from "./types";

// ── Rendez-vous ───────────────────────────────────────────────────────────────

export const listRendezVousFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<RendezVous[]> => {
    const auth = await requireCap("rendezvous:read");
    const rows = await rendezvous.list();
    return isOwnerScoped(auth.role) ? rows.filter((r) => r.agentId === auth.userId) : rows;
  },
);

export const createRendezVousFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => rendezVousInputSchema.parse(d))
  .handler(async ({ data }): Promise<RendezVous> => {
    const auth = await requireCap("rendezvous:write");
    const full = { ...newRendezVous(), ...data } as ReturnType<typeof newRendezVous>;
    // Owner-scoped roles (commercial) may ONLY create their own rendez-vous: force
    // the assignee to the caller, ignoring any agentId they tried to supply (else a
    // commercial could plant a record under another agent — privilege escalation).
    if (isOwnerScoped(auth.role)) full.agentId = auth.userId;
    return rendezvous.add(full);
  });

export const updateRendezVousFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; patch: unknown }) => ({
    id: String(d?.id ?? ""),
    patch: rendezVousInputSchema.partial().parse(d?.patch),
  }))
  .handler(async ({ data }): Promise<RendezVous | null> => {
    const auth = await requireCap("rendezvous:write");
    // Owner-scoped roles may only touch records they own, and may never reassign
    // them to someone else. The list view hides others' records client-side, but
    // that is cosmetic — the real boundary is here, against direct fn calls.
    if (isOwnerScoped(auth.role)) {
      const existing = await rendezvous.get(data.id);
      if (!existing) return null;
      if (existing.agentId !== auth.userId) throw new Error("FORBIDDEN");
      delete (data.patch as Record<string, unknown>).agentId;
    }
    return rendezvous.update(data.id, data.patch as Partial<RendezVous>);
  });

export const deleteRendezVousFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: String(d?.id ?? "") }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const auth = await requireCap("rendezvous:write");
    // Same ownership boundary as update: a commercial cannot delete another
    // agent's rendez-vous by guessing its id.
    if (isOwnerScoped(auth.role)) {
      const existing = await rendezvous.get(data.id);
      if (!existing) return { ok: false };
      if (existing.agentId !== auth.userId) throw new Error("FORBIDDEN");
    }
    return { ok: await rendezvous.remove(data.id) };
  });

// ── Agents (minimal directory for the rendez-vous assignment dropdown) ────────

export const listAgentsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicUser[]> => {
    await requireAuth();
    return usersStore.listUsers();
  },
);

// ── Paramètres ────────────────────────────────────────────────────────────────

export const getSettingsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<Settings> => {
    await requireAuth();
    return readSettings();
  },
);

export const updateSettingsFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => settingsSchema.partial().parse(d))
  .handler(async ({ data }): Promise<Settings> => {
    await requireCap("settings:write");
    return writeSettings(data as Partial<Settings>);
  });
