import { createContext, useCallback, useContext, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { Content, SectionKey } from "@/lib/cms/types";
import type { Role } from "@/lib/promo/permissions";
import { canWrite, hasCap, type Capability, type Resource } from "@/lib/promo/permissions";
import {
  getContentFn,
  resetContentFn,
  saveContentFn,
  saveSectionFn,
  uploadImageFn,
} from "@/lib/cms/api";
import { prepareImage } from "./image";
import { isUnauthorizedError, notifyUnauthorized } from "./unauthorized";

type AdminCtx = {
  content: Content;
  /** The signed-in user's role (undefined while loading). */
  role?: Role;
  /** The signed-in user's id (for ownership-scoped UI). */
  userId?: string;
  /** Whether the current role may write to a resource (button gating). */
  can: (resource: Resource) => boolean;
  /** Fine-grained capability check. */
  hasCap: (cap: Capability) => boolean;
  saving: boolean;
  /** Persist a single top-level section. */
  save: (section: SectionKey, value: Content[SectionKey]) => Promise<void>;
  /** Persist several top-level fields at once. */
  saveAll: (patch: Partial<Content>) => Promise<void>;
  /** Upload an image file, returns its public URL. */
  upload: (file: File, opts?: { maxDim?: number }) => Promise<string>;
  reset: () => Promise<void>;
  refetch: () => void;
};

const Ctx = createContext<AdminCtx | null>(null);

export const ADMIN_CONTENT_KEY = ["admin", "content"] as const;

export function useAdmin(): AdminCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdmin must be used inside <AdminProvider>");
  return ctx;
}

export function AdminProvider({
  initialContent,
  role,
  userId,
  children,
}: {
  initialContent: Content;
  role?: Role;
  userId?: string;
  children: React.ReactNode;
}) {
  const qc = useQueryClient();

  const { data: content } = useQuery({
    queryKey: ADMIN_CONTENT_KEY,
    queryFn: () => getContentFn(),
    initialData: initialContent,
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: (vars: { section: SectionKey; value: unknown }) => saveSectionFn({ data: vars }),
    onSuccess: (next) => qc.setQueryData(ADMIN_CONTENT_KEY, next),
  });

  const saveAllMutation = useMutation({
    mutationFn: (nextContent: Content) => saveContentFn({ data: { content: nextContent } }),
    onSuccess: (next) => qc.setQueryData(ADMIN_CONTENT_KEY, next),
  });

  const save = useCallback(
    async (section: SectionKey, value: Content[SectionKey]) => {
      await toast.promise(saveMutation.mutateAsync({ section, value }), {
        loading: "Saving…",
        success: "Saved",
        error: (e) =>
          isUnauthorizedError(e)
            ? "Session expired — sign in again"
            : `Save failed: ${e instanceof Error ? e.message : "error"}`,
      });
    },
    [saveMutation],
  );

  const saveAll = useCallback(
    async (patch: Partial<Content>) => {
      await toast.promise(saveAllMutation.mutateAsync({ ...content, ...patch }), {
        loading: "Saving…",
        success: "Saved",
        error: (e) =>
          isUnauthorizedError(e)
            ? "Session expired — sign in again"
            : `Save failed: ${e instanceof Error ? e.message : "error"}`,
      });
    },
    [saveAllMutation, content],
  );

  const upload = useCallback(async (file: File, opts?: { maxDim?: number }) => {
    try {
      const dataUrl = await prepareImage(file, opts);
      const { url } = await uploadImageFn({ data: { dataUrl } });
      return url;
    } catch (err) {
      // These are direct server-fn calls (not useMutation), so route expired
      // sessions to the re-login flow ourselves before rethrowing to the caller.
      if (isUnauthorizedError(err)) notifyUnauthorized();
      throw err;
    }
  }, []);

  const reset = useCallback(async () => {
    try {
      const next = await resetContentFn();
      qc.setQueryData(ADMIN_CONTENT_KEY, next);
      toast.success("Content reset to defaults");
    } catch (err) {
      if (isUnauthorizedError(err)) notifyUnauthorized();
      else toast.error("Reset failed. Try again.");
    }
  }, [qc]);

  const refetch = useCallback(() => {
    qc.invalidateQueries({ queryKey: ADMIN_CONTENT_KEY });
  }, [qc]);

  const value = useMemo<AdminCtx>(
    () => ({
      content,
      role,
      userId,
      can: (resource: Resource) => canWrite(role, resource),
      hasCap: (cap: Capability) => hasCap(role, cap),
      saving: saveMutation.isPending || saveAllMutation.isPending,
      save,
      saveAll,
      upload,
      reset,
      refetch,
    }),
    [
      content,
      role,
      userId,
      saveMutation.isPending,
      saveAllMutation.isPending,
      save,
      saveAll,
      upload,
      reset,
      refetch,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
