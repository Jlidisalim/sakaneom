// ────────────────────────────────────────────────────────────────────────────
// Roles & capabilities. PURE module (no React, no server imports) — the single
// source of truth shared by server-side `requireCap()` / `requireRole()`
// (src/server/auth.ts) and client-side gating (hide / disable write controls).
//
// Pared back with the rest of the promotion back-office (2026-06-29): the gated
// resources are now the modules that remain — leads (CMS web inquiries),
// rendez-vous, users (auth) and settings.
// ────────────────────────────────────────────────────────────────────────────

export const ROLES = ["super_admin", "manager", "commercial", "comptable", "lecture"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  manager: "Directeur / Manager",
  commercial: "Commercial",
  comptable: "Comptable",
  lecture: "Lecture seule",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  super_admin: "Accès total — utilisateurs, paramètres et site web.",
  manager: "Accès opérationnel complet et édition du site web.",
  commercial: "Ses propres rendez-vous et les demandes web.",
  comptable: "Consultation ; pas de modification du site.",
  lecture: "Consultation seule, aucune modification.",
};

export const RESOURCES = ["leads", "rendezvous", "users", "settings"] as const;
export type Resource = (typeof RESOURCES)[number];

export type Capability = `${Resource}:read` | `${Resource}:write`;

const ALL_READ = RESOURCES.map((r) => `${r}:read` as Capability);
const ALL_WRITE = RESOURCES.map((r) => `${r}:write` as Capability);

function caps(list: Capability[]): Set<Capability> {
  return new Set(list);
}

export const ROLE_CAPS: Record<Role, Set<Capability>> = {
  super_admin: caps([...ALL_READ, ...ALL_WRITE]),

  // Directeur/Manager — full operational read/write, but no user administration.
  manager: caps([...ALL_READ, "leads:write", "rendezvous:write"]),

  // Commercial — works its own rendez-vous + the web inquiries. Ownership-scoped
  // server-side for rendez-vous.
  commercial: caps([
    "leads:read",
    "leads:write",
    "rendezvous:read",
    "rendezvous:write",
    "settings:read",
  ]),

  // Comptable — read-only.
  comptable: caps([...ALL_READ]),

  // Lecture seule — read everything, change nothing.
  lecture: caps([...ALL_READ]),
};

export function hasCap(role: Role | undefined, cap: Capability): boolean {
  if (!role) return false;
  return ROLE_CAPS[role]?.has(cap) ?? false;
}

export function canWrite(role: Role | undefined, resource: Resource): boolean {
  return hasCap(role, `${resource}:write`);
}

export function canRead(role: Role | undefined, resource: Resource): boolean {
  return hasCap(role, `${resource}:read`);
}

/** Roles whose visible records are limited to those they are assigned to. */
export function isOwnerScoped(role: Role | undefined): boolean {
  return role === "commercial";
}
