// ────────────────────────────────────────────────────────────────────────────
// React-Query data layer for the remaining modules (Rendez-vous, Paramètres) +
// the agent directory. French toasts + forbidden/expired handling.
// ────────────────────────────────────────────────────────────────────────────
import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createRendezVousFn,
  deleteRendezVousFn,
  getSettingsFn,
  listAgentsFn,
  listRendezVousFn,
  updateRendezVousFn,
  updateSettingsFn,
} from "@/lib/promo/api";
import { errorMessageFr, isUnauthorizedError, notifyUnauthorized } from "../unauthorized";

export const QK = {
  rendezvous: ["admin", "rendezvous"] as const,
  agents: ["admin", "agents"] as const,
  settings: ["admin", "settings"] as const,
};

// ── Read hooks ────────────────────────────────────────────────────────────────

export const useRendezVous = () =>
  useQuery({ queryKey: QK.rendezvous, queryFn: () => listRendezVousFn(), staleTime: 10_000 });
export const useAgents = () =>
  useQuery({ queryKey: QK.agents, queryFn: () => listAgentsFn(), staleTime: 60_000 });
export const useSettings = () =>
  useQuery({ queryKey: QK.settings, queryFn: () => getSettingsFn(), staleTime: 60_000 });

// ── Shared mutation factory ───────────────────────────────────────────────────

function onMutError(err: unknown) {
  if (isUnauthorizedError(err)) {
    notifyUnauthorized();
    return;
  }
  toast.error(errorMessageFr(err, "L'opération a échoué. Réessayez."));
}

type FnData<A, R> = (opts: { data: A }) => Promise<R>;

export function useCrud<NewT, PatchT>(cfg: {
  key: QueryKey;
  createFn?: FnData<NewT, unknown>;
  updateFn?: FnData<{ id: string; patch: PatchT }, unknown>;
  deleteFn?: FnData<{ id: string }, { ok: boolean }>;
  msg?: { created?: string; updated?: string; deleted?: string };
}) {
  const qc = useQueryClient();
  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: cfg.key });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qc]);

  const create = useMutation({
    mutationFn: (data: NewT) => cfg.createFn!({ data }),
    onSuccess: () => {
      invalidate();
      toast.success(cfg.msg?.created ?? "Enregistré");
    },
    onError: onMutError,
  });

  const update = useMutation({
    mutationFn: (vars: { id: string; patch: PatchT }) => cfg.updateFn!({ data: vars }),
    onSuccess: () => {
      invalidate();
      toast.success(cfg.msg?.updated ?? "Modifié");
    },
    onError: onMutError,
  });

  const remove = useMutation({
    mutationFn: (id: string) => cfg.deleteFn!({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success(cfg.msg?.deleted ?? "Supprimé");
    },
    onError: onMutError,
  });

  return { create, update, remove, invalidate };
}

export const useRendezVousCrud = () =>
  useCrud({
    key: QK.rendezvous,
    createFn: createRendezVousFn,
    updateFn: updateRendezVousFn,
    deleteFn: deleteRendezVousFn,
    msg: { created: "Rendez-vous créé", updated: "Rendez-vous modifié", deleted: "Supprimé" },
  });

export { updateSettingsFn };
