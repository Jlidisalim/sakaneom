import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Loader2, RotateCcw, Save, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Content, L, SectionKey } from "@/lib/cms/types";
import { useAdmin } from "./context";

// ── Draft state hook ──────────────────────────────────────────────────────────

function clone<T>(v: T): T {
  try {
    return structuredClone(v);
  } catch {
    return JSON.parse(JSON.stringify(v));
  }
}

/**
 * Local editable copy of one content section. Resyncs from the server whenever
 * the underlying section changes externally (after a save elsewhere or a reset).
 */
export function useSection<K extends SectionKey>(key: K) {
  const { content, save, saving } = useAdmin();
  const remote = content[key];
  const remoteStr = JSON.stringify(remote);

  const [draft, setDraft] = useState<Content[K]>(() => clone(remote));
  const lastRemote = useRef(remoteStr);

  useEffect(() => {
    if (lastRemote.current !== remoteStr) {
      lastRemote.current = remoteStr;
      setDraft(clone(remote));
    }
  }, [remoteStr, remote]);

  const dirty = JSON.stringify(draft) !== remoteStr;

  return {
    draft,
    setDraft,
    /** Patch top-level keys of the section draft. */
    patch: (p: Partial<Content[K]>) =>
      setDraft((d) => ({ ...(d as object), ...(p as object) }) as Content[K]),
    dirty,
    saving,
    commit: () => save(key, draft),
    discard: () => setDraft(clone(remote)),
  };
}

// ── Layout primitives ─────────────────────────────────────────────────────────

export function PanelShell({
  title,
  description,
  children,
  icon,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="pb-28">
      <div className="mb-6 flex items-start gap-3">
        {icon && (
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-control border bg-card text-stone">
            {icon}
          </span>
        )}
        <div>
          <h1 className="font-display text-2xl leading-tight text-foreground">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

export function Card({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-surface border bg-card p-5 shadow-[0_1px_2px_rgba(28,24,19,0.04)] sm:p-6",
        className,
      )}
    >
      {(title || description) && (
        <header className="mb-4">
          {title && <h2 className="font-medium text-foreground">{title}</h2>}
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <Label className="text-xs font-medium text-foreground">{label}</Label>}
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ── Text inputs ────────────────────────────────────────────────────────────────

export function TextField({
  label,
  value,
  onChange,
  hint,
  placeholder,
  type = "text",
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

const arStyle = { fontFamily: "Tajawal, sans-serif" } as const;

/** Edit a bilingual {fr, ar} value with side-by-side FR / AR inputs. */
export function BilingualText({
  label,
  value,
  onChange,
  hint,
  area,
  rows = 3,
}: {
  label?: string;
  value: L;
  onChange: (v: L) => void;
  hint?: string;
  area?: boolean;
  rows?: number;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Français
          </span>
          {area ? (
            <Textarea
              rows={rows}
              value={value.fr}
              onChange={(e) => onChange({ ...value, fr: e.target.value })}
            />
          ) : (
            <Input value={value.fr} onChange={(e) => onChange({ ...value, fr: e.target.value })} />
          )}
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            العربية
          </span>
          {area ? (
            <Textarea
              dir="rtl"
              rows={rows}
              style={arStyle}
              value={value.ar}
              onChange={(e) => onChange({ ...value, ar: e.target.value })}
            />
          ) : (
            <Input
              dir="rtl"
              style={arStyle}
              value={value.ar}
              onChange={(e) => onChange({ ...value, ar: e.target.value })}
            />
          )}
        </div>
      </div>
    </Field>
  );
}

// ── Image upload field ──────────────────────────────────────────────────────────

export function ImageField({
  label,
  value,
  onChange,
  hint,
  aspect = "aspect-video",
  maxDim,
}: {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
  aspect?: string;
  maxDim?: number;
}) {
  const { upload } = useAdmin();
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(file?: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      const url = await upload(file, maxDim ? { maxDim } : undefined);
      onChange(url);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(`Upload failed: ${e instanceof Error ? e.message : "error"}`);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Field label={label} hint={hint}>
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "relative w-40 shrink-0 overflow-hidden rounded-control border bg-secondary",
            aspect,
          )}
        >
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-stone">
              <ImageIcon className="h-5 w-5" />
            </div>
          )}
          {busy && (
            <div className="absolute inset-0 grid place-items-center bg-background/70">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4" /> Upload
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
              <X className="h-4 w-4" /> Clear
            </Button>
          )}
        </div>
      </div>
    </Field>
  );
}

// ── Sticky save bar ──────────────────────────────────────────────────────────────

export function SaveBar({
  dirty,
  saving,
  onSave,
  onDiscard,
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur lg:left-[var(--admin-sidebar,17rem)]">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-5 py-3">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <span
            className={cn(
              "size-1.5 rounded-full transition-colors",
              dirty ? "bg-primary" : "bg-stone/40",
            )}
          />
          {dirty ? "You have unsaved changes" : "All changes saved"}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" disabled={!dirty || saving} onClick={onDiscard}>
            <RotateCcw className="h-4 w-4" /> Discard
          </Button>
          <Button size="sm" disabled={!dirty || saving} onClick={onSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
