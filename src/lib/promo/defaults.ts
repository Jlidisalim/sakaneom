// Default factory for a new Rendez-vous (the creatable shape — server mints
// id/createdAt). Pure module, used by the form and the create handler.
import type { RendezVous } from "./types";

export type NewRendezVous = Omit<RendezVous, "id" | "createdAt">;

export function newRendezVous(agentId = ""): NewRendezVous {
  return {
    type: "visite",
    date: new Date().toISOString().slice(0, 16),
    agentId,
    contact: "",
    objet: "",
    statut: "planifie",
    notes: "",
  };
}
