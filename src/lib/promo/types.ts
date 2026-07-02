// ────────────────────────────────────────────────────────────────────────────
// Operational types kept after the promotion back-office was pared back
// (2026-06-29): the per-user account model (auth), the Rendez-vous module, and
// app Settings. Plain French strings, persisted as their own JSON blobs.
// ────────────────────────────────────────────────────────────────────────────

import type { Currency } from "@/lib/format";

export type { Role } from "./permissions";

// ── Utilisateur / Agent ───────────────────────────────────────────────────────

/**
 * A back-office user (also an "agent"). `passwordHash` is SERVER-ONLY — server
 * functions strip it before returning a `PublicUser`.
 */
export type User = {
  id: string;
  createdAt: string;
  nom: string;
  email: string;
  phone: string;
  photo: string;
  role: import("./permissions").Role;
  active: boolean;
  passwordHash: string;
};

/** A user safe to expose to the client (no credential material). */
export type PublicUser = Omit<User, "passwordHash">;

// ── Rendez-vous / Visite ──────────────────────────────────────────────────────

export const RDV_TYPES = ["visite", "reunion", "signature"] as const;
export type RdvType = (typeof RDV_TYPES)[number];
export const RDV_TYPE_LABELS: Record<RdvType, string> = {
  visite: "Visite",
  reunion: "Réunion",
  signature: "Signature",
};

export const RDV_STATUSES = ["planifie", "confirme", "realise", "annule"] as const;
export type RdvStatus = (typeof RDV_STATUSES)[number];
export const RDV_STATUS_LABELS: Record<RdvStatus, string> = {
  planifie: "Planifié",
  confirme: "Confirmé",
  realise: "Réalisé",
  annule: "Annulé",
};

export type RendezVous = {
  id: string;
  createdAt: string;
  type: RdvType;
  /** Date + time (ISO). */
  date: string;
  /** Assigned agent (FK → User.id). */
  agentId: string;
  /** Free-text contact (prospect / client name). */
  contact: string;
  /** Free-text subject / location. */
  objet: string;
  statut: RdvStatus;
  notes: string;
};

// ── Paramètres (company/app settings — a singleton object blob) ────────────────

export type Settings = {
  companyName: string;
  logo: string;
  email: string;
  phone: string;
  adresse: string;
  ville: string;
  /** Default currency for the agency. */
  defaultCurrency: Currency;
  /** RIB / fiscal id (optional). */
  matriculeFiscal: string;
};
