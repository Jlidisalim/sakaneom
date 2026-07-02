import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UNIT_TYPES, type Unit, type UnitType } from "@/lib/cms/types";
import { Field, ImageField } from "../fields";

const STATUSES: { value: NonNullable<Unit["status"]>; label: string }[] = [
  { value: "available", label: "Available" },
  { value: "reserved", label: "Reserved" },
  { value: "sold", label: "Sold" },
];

const selectCls =
  "h-9 w-full rounded-control border bg-background px-2 text-sm text-foreground transition-[border-color,box-shadow] focus-visible:border-ring/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

export function PlansEditor({
  plans,
  onChange,
}: {
  plans: Record<UnitType, string>;
  onChange: (plans: Record<UnitType, string>) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {UNIT_TYPES.map((t) => (
        <ImageField
          key={t}
          label={`${t} plan`}
          value={plans[t] ?? ""}
          onChange={(url) => onChange({ ...plans, [t]: url })}
          aspect="aspect-square"
        />
      ))}
    </div>
  );
}

export function UnitsEditor({
  units,
  onChange,
}: {
  units: Unit[];
  onChange: (units: Unit[]) => void;
}) {
  const patchUnit = (i: number, p: Partial<Unit>) =>
    onChange(units.map((u, j) => (j === i ? { ...u, ...p } : u)));

  function addUnit() {
    onChange([
      ...units,
      {
        id: crypto.randomUUID(),
        no: "",
        etage: "",
        type: "S+1",
        pieces: 2,
        surface: 0,
        terrasse: 0,
        prix: 0,
        status: "available",
      },
    ]);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{units.length} apartments</span>
        <Button size="sm" onClick={addUnit}>
          <Plus className="h-4 w-4" /> Add apartment
        </Button>
      </div>
      <div className="space-y-3">
        {units.map((u, i) => (
          <div key={u.id} className="rounded-lg border bg-background/40 p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="N°">
                <Input value={u.no} onChange={(e) => patchUnit(i, { no: e.target.value })} />
              </Field>
              <Field label="Floor">
                <Input value={u.etage} onChange={(e) => patchUnit(i, { etage: e.target.value })} />
              </Field>
              <Field label="Type">
                <select
                  className={selectCls}
                  value={u.type}
                  onChange={(e) => patchUnit(i, { type: e.target.value as UnitType })}
                >
                  {UNIT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  className={selectCls}
                  value={u.status ?? "available"}
                  onChange={(e) => patchUnit(i, { status: e.target.value as Unit["status"] })}
                >
                  {STATUSES.map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Rooms">
                <Input
                  type="number"
                  value={u.pieces}
                  onChange={(e) => patchUnit(i, { pieces: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label="Surface (m²)">
                <Input
                  type="number"
                  value={u.surface}
                  onChange={(e) => patchUnit(i, { surface: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label="Terrace (m²)">
                <Input
                  type="number"
                  value={u.terrasse}
                  onChange={(e) => patchUnit(i, { terrasse: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label="Price (DT)">
                <Input
                  type="number"
                  value={u.prix}
                  onChange={(e) => patchUnit(i, { prix: Number(e.target.value) || 0 })}
                />
              </Field>
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <ImageField
                label="Custom floor plan (optional)"
                value={u.plan ?? ""}
                onChange={(url) => patchUnit(i, { plan: url })}
                aspect="aspect-square"
              />
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => onChange(units.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
            </div>
          </div>
        ))}
        {!units.length && (
          <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No apartments yet — click “Add apartment”.
          </p>
        )}
      </div>
    </div>
  );
}
