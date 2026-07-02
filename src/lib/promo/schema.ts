// ────────────────────────────────────────────────────────────────────────────
// Zod schemas for the remaining operational entities (Rendez-vous, Settings).
// Object schemas use `.passthrough()` (forward-compatible). Server-managed fields
// (id/createdAt) are minted in the store and omitted from create input.
// ────────────────────────────────────────────────────────────────────────────
import { z } from "zod";

import { RDV_STATUSES, RDV_TYPES } from "./types";

const Currency = z.enum(["TND", "EUR"]);
const str = z.string();

// ── Rendez-vous ───────────────────────────────────────────────────────────────

export const rendezVousSchema = z
  .object({
    id: str,
    createdAt: str,
    type: z.enum(RDV_TYPES),
    date: str,
    agentId: str,
    contact: str,
    objet: str,
    statut: z.enum(RDV_STATUSES),
    notes: str,
  })
  .passthrough();

export const rendezVousInputSchema = rendezVousSchema
  .omit({ id: true, createdAt: true })
  .partial()
  .extend({ date: str.trim().min(1, "Date requise") })
  .passthrough();

// ── Paramètres ────────────────────────────────────────────────────────────────

export const settingsSchema = z
  .object({
    companyName: str,
    logo: str,
    email: str,
    phone: str,
    adresse: str,
    ville: str,
    defaultCurrency: Currency,
    matriculeFiscal: str,
  })
  .passthrough();
