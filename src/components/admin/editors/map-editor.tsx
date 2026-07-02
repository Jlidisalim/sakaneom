import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { L, Marker, ResidenceLocation } from "@/lib/cms/types";
import { cn } from "@/lib/utils";
import { LeafletMap } from "../leaflet-map";
import { BilingualText, Card, Field } from "../fields";

const KINDS: { value: Marker["kind"]; label: string }[] = [
  { value: "residence", label: "Residence" },
  { value: "beach", label: "Beach" },
  { value: "school", label: "School" },
  { value: "shop", label: "Shop / Market" },
  { value: "transport", label: "Transport" },
  { value: "other", label: "Other" },
];

const selectCls =
  "h-9 w-full rounded-control border bg-background px-2 text-sm text-foreground transition-[border-color,box-shadow] focus-visible:border-ring/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

const emptyL: L = { fr: "", ar: "" };

/** Full location editor for a residence: map + markers + nearby + intro text. */
export function MarkerMapEditor({
  value,
  onChange,
}: {
  value: ResidenceLocation;
  onChange: (v: ResidenceLocation) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(value.markers[0]?.id ?? null);
  const setMarkers = (markers: Marker[]) => onChange({ ...value, markers });
  const patchMarker = (id: string, p: Partial<Marker>) =>
    setMarkers(value.markers.map((m) => (m.id === id ? { ...m, ...p } : m)));

  function addMarkerAt(lat: number, lng: number) {
    const m: Marker = {
      id: crypto.randomUUID(),
      name: "New marker",
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      kind: "residence",
    };
    setMarkers([...value.markers, m]);
    setSelectedId(m.id);
  }

  const selected = value.markers.find((m) => m.id === selectedId) ?? null;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="overflow-hidden rounded-surface border">
          <LeafletMap
            className="h-[420px] w-full"
            editable
            center={value.center}
            zoom={value.zoom}
            markers={value.markers}
            selectedId={selectedId}
            onMapClick={addMarkerAt}
            onMarkerMove={(id, lat, lng) =>
              patchMarker(id, { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) })
            }
            onSelect={setSelectedId}
            onViewChange={(center, zoom) => onChange({ ...value, center, zoom })}
          />
          <p className="border-t bg-card px-4 py-2 text-xs text-muted-foreground">
            Click an empty spot to add a marker; drag markers to adjust. The current view is saved
            as the default.
          </p>
        </div>

        <div className="space-y-4">
          <Card title="Markers" description={`${value.markers.length} placed`}>
            <div className="max-h-48 space-y-1.5 overflow-y-auto">
              {value.markers.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-control border px-3 py-2 text-left text-sm transition-colors",
                    m.id === selectedId ? "border-primary bg-primary/5" : "hover:bg-accent",
                  )}
                >
                  <span className="truncate">{m.name || "Untitled"}</span>
                  <span className="shrink-0 text-xs capitalize text-muted-foreground">
                    {m.kind}
                  </span>
                </button>
              ))}
              {!value.markers.length && (
                <p className="py-3 text-center text-sm text-muted-foreground">
                  Click the map to add a marker.
                </p>
              )}
            </div>
          </Card>

          {selected && (
            <Card title="Edit marker">
              <div className="space-y-3">
                <Field label="Name">
                  <Input
                    value={selected.name}
                    onChange={(e) => patchMarker(selected.id, { name: e.target.value })}
                  />
                </Field>
                <Field label="Type">
                  <select
                    className={selectCls}
                    value={selected.kind}
                    onChange={(e) =>
                      patchMarker(selected.id, { kind: e.target.value as Marker["kind"] })
                    }
                  >
                    {KINDS.map((k) => (
                      <option key={k.value} value={k.value}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Latitude">
                    <Input
                      type="number"
                      step="0.000001"
                      value={selected.lat}
                      onChange={(e) => patchMarker(selected.id, { lat: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Longitude">
                    <Input
                      type="number"
                      step="0.000001"
                      value={selected.lng}
                      onChange={(e) => patchMarker(selected.id, { lng: Number(e.target.value) })}
                    />
                  </Field>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={() => {
                    setMarkers(value.markers.filter((m) => m.id !== selected.id));
                    setSelectedId(null);
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Delete marker
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      <Card title="Location text & nearby places">
        <div className="space-y-4">
          <BilingualText
            label="Intro paragraph"
            value={value.p}
            onChange={(p) => onChange({ ...value, p })}
            area
          />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Nearby places</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onChange({ ...value, near: [...value.near, { ...emptyL }] })}
              >
                <Plus className="h-4 w-4" /> Add place
              </Button>
            </div>
            {value.near.map((n, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg border bg-background/40 p-3"
              >
                <div className="flex-1">
                  <BilingualText
                    value={n}
                    onChange={(v) =>
                      onChange({ ...value, near: value.near.map((x, j) => (j === i ? v : x)) })
                    }
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => onChange({ ...value, near: value.near.filter((_, j) => j !== i) })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
