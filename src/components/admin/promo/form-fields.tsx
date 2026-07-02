// Shared form primitives for the promotion panels — native selects (the
// units-editor convention), number/date/switch/currency inputs, a Sheet-based
// form drawer, and a delete confirmation. All French, all Quiet Gold styling.
import type { ReactNode } from "react";
import { Loader2, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Field } from "../fields";
import type { Currency } from "@/lib/format";

export const selectCls =
  "h-9 w-full rounded-control border bg-background px-2 text-sm text-foreground transition-[border-color,box-shadow] focus-visible:border-ring/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

export function NumberField({
  label,
  value,
  onChange,
  hint,
  placeholder,
  min,
  step,
  suffix,
}: {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  placeholder?: string;
  min?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={Number.isFinite(value) ? value : 0}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          className={suffix ? "pr-12" : undefined}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </Field>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
  placeholder,
}: {
  label?: string;
  value: T | "";
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  hint?: string;
  placeholder?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <select className={selectCls} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function DateField({
  label,
  value,
  onChange,
  hint,
  withTime,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  withTime?: boolean;
}) {
  return (
    <Field label={label} hint={hint}>
      <Input
        type={withTime ? "datetime-local" : "date"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function TextareaField({
  label,
  value,
  onChange,
  hint,
  rows = 3,
  placeholder,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <Textarea
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function SwitchField({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-control border bg-background px-3 py-2">
      <div>
        <div className="text-sm text-foreground">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function CurrencyField({
  label = "Devise",
  value,
  onChange,
}: {
  label?: string;
  value: Currency;
  onChange: (v: Currency) => void;
}) {
  return (
    <SelectField<Currency>
      label={label}
      value={value}
      onChange={onChange}
      options={[
        { value: "TND", label: "Dinar (TND)" },
        { value: "EUR", label: "Euro (EUR)" },
      ]}
    />
  );
}

/** A right-side form drawer (create/edit) with a sticky save/cancel footer. */
export function FormDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  saving,
  submitLabel = "Enregistrer",
  onDelete,
  side = "right",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  onSubmit: () => void;
  saving?: boolean;
  submitLabel?: string;
  onDelete?: () => void;
  side?: "right" | "left";
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className="admin-ui flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b p-5">
          <SheetTitle className="font-display text-xl">{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>

        <form
          className="flex-1 overflow-y-auto"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          id="drawer-form"
        >
          <div className="space-y-4 p-5">{children}</div>
        </form>

        <SheetFooter className="flex-row items-center justify-between gap-2 border-t p-4">
          {onDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" /> Supprimer
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" size="sm" form="drawer-form" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {submitLabel}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** A confirm-before-delete wrapper around an arbitrary trigger. */
export function ConfirmDelete({
  trigger,
  title = "Supprimer ?",
  description = "Cette action est irréversible.",
  onConfirm,
}: {
  trigger: ReactNode;
  title?: string;
  description?: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="admin-ui">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Supprimer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
