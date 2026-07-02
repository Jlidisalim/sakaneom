// RENDEZ-VOUS / VISITES — calendrier + liste. Auto-suffisant : contact & objet en
// texte libre, agent assigné depuis l'annuaire des utilisateurs.
import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  User as UserIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  RDV_STATUS_LABELS,
  RDV_STATUSES,
  RDV_TYPE_LABELS,
  RDV_TYPES,
  type RendezVous,
} from "@/lib/promo/types";
import { newRendezVous } from "@/lib/promo/defaults";
import { formatDateTime } from "@/lib/format";
import { Card, PanelShell, TextField } from "../fields";
import { RdvStatusBadge } from "../status-badge";
import { DateField, FormDrawer, SelectField, TextareaField } from "../promo/form-fields";
import { useAgents, useRendezVous, useRendezVousCrud } from "../promo/hooks";
import { useAdmin } from "../context";

const TYPE_OPTIONS = RDV_TYPES.map((t) => ({ value: t, label: RDV_TYPE_LABELS[t] }));
const STATUS_OPTIONS = RDV_STATUSES.map((s) => ({ value: s, label: RDV_STATUS_LABELS[s] }));

type Draft = Omit<RendezVous, "id" | "createdAt">;

export function RendezVousPanel() {
  const { userId, can } = useAdmin();
  const writable = can("rendezvous");
  const { data: rdvs = [], isLoading } = useRendezVous();
  const { data: agents = [] } = useAgents();
  const { create, update, remove } = useRendezVousCrud();

  const agentName = useMemo(() => new Map(agents.map((a) => [a.id, a.nom])), [agents]);
  const agentOptions = agents.map((a) => ({ value: a.id, label: a.nom }));

  const [statusFilter, setStatusFilter] = useState<"all" | (typeof RDV_STATUSES)[number]>("all");
  const [agentFilter, setAgentFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(newRendezVous());
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const filtered = useMemo(() => {
    return rdvs.filter((r) => {
      if (statusFilter !== "all" && r.statut !== statusFilter) return false;
      if (agentFilter && r.agentId !== agentFilter) return false;
      return true;
    });
  }, [rdvs, statusFilter, agentFilter]);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const sorted = [...filtered].sort((a, b) => +new Date(a.date) - +new Date(b.date));
    return {
      upcoming: sorted.filter((r) => +new Date(r.date) >= now),
      past: sorted.filter((r) => +new Date(r.date) < now).reverse(),
    };
  }, [filtered]);

  function openCreate(dateIso?: string) {
    setEditId(null);
    setDraft({ ...newRendezVous(userId ?? ""), ...(dateIso ? { date: dateIso } : {}) });
    setOpen(true);
  }
  function openEdit(r: RendezVous) {
    setEditId(r.id);
    const { id: _i, createdAt: _c, ...rest } = r;
    setDraft(rest);
    setOpen(true);
  }
  function submit() {
    if (editId) {
      update.mutate({ id: editId, patch: draft }, { onSuccess: () => setOpen(false) });
    } else {
      create.mutate(draft, { onSuccess: () => setOpen(false) });
    }
  }

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));
  const saving = create.isPending || update.isPending;

  return (
    <PanelShell
      title="Rendez-vous"
      description="Visites, réunions et signatures — vue liste et calendrier."
      icon={<CalendarDays className="h-5 w-5" />}
    >
      <Tabs defaultValue="liste">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="liste">Liste</TabsTrigger>
            <TabsTrigger value="calendrier">Calendrier</TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-40">
              <SelectField
                value={statusFilter === "all" ? "" : statusFilter}
                onChange={(v) => setStatusFilter(v || "all")}
                placeholder="Tous les statuts"
                options={STATUS_OPTIONS}
              />
            </div>
            <div className="w-44">
              <SelectField
                value={agentFilter}
                onChange={(v) => setAgentFilter(v)}
                placeholder="Tous les agents"
                options={agentOptions}
              />
            </div>
            {writable && (
              <Button size="sm" onClick={() => openCreate()}>
                <Plus className="h-4 w-4" /> Nouveau
              </Button>
            )}
          </div>
        </div>

        {/* ── Liste ── */}
        <TabsContent value="liste">
          {isLoading ? (
            <div className="grid place-items-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : !filtered.length ? (
            <Card>
              <p className="py-10 text-center text-sm text-muted-foreground">Aucun rendez-vous.</p>
            </Card>
          ) : (
            <div className="space-y-6">
              <RdvList title="À venir" items={upcoming} agentName={agentName} onClick={openEdit} />
              {past.length > 0 && (
                <RdvList
                  title="Passés"
                  items={past}
                  agentName={agentName}
                  onClick={openEdit}
                  muted
                />
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Calendrier ── */}
        <TabsContent value="calendrier">
          <MonthCalendar
            year={month.y}
            month={month.m}
            items={filtered}
            onPrev={() => setMonth((m) => shiftMonth(m, -1))}
            onNext={() => setMonth((m) => shiftMonth(m, 1))}
            onDay={(iso) => writable && openCreate(iso)}
            onItem={openEdit}
          />
        </TabsContent>
      </Tabs>

      <FormDrawer
        open={open}
        onOpenChange={setOpen}
        title={editId ? "Modifier le rendez-vous" : "Nouveau rendez-vous"}
        onSubmit={submit}
        saving={saving}
        onDelete={
          editId && writable
            ? () => remove.mutate(editId, { onSuccess: () => setOpen(false) })
            : undefined
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Type"
            value={draft.type}
            onChange={(v) => patch({ type: v })}
            options={TYPE_OPTIONS}
          />
          <SelectField
            label="Statut"
            value={draft.statut}
            onChange={(v) => patch({ statut: v })}
            options={STATUS_OPTIONS}
          />
        </div>
        <DateField
          label="Date & heure"
          withTime
          value={draft.date}
          onChange={(v) => patch({ date: v })}
        />
        <SelectField
          label="Agent"
          value={draft.agentId}
          onChange={(v) => patch({ agentId: v })}
          placeholder="Non assigné"
          options={agentOptions}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Contact"
            value={draft.contact}
            onChange={(v) => patch({ contact: v })}
            placeholder="Nom du prospect / client"
          />
          <TextField
            label="Objet / lieu"
            value={draft.objet}
            onChange={(v) => patch({ objet: v })}
            placeholder="Projet, adresse…"
          />
        </div>
        <TextareaField
          label="Notes"
          value={draft.notes}
          onChange={(v) => patch({ notes: v })}
          rows={3}
        />
      </FormDrawer>
    </PanelShell>
  );
}

function RdvList({
  title,
  items,
  agentName,
  onClick,
  muted,
}: {
  title: string;
  items: RendezVous[];
  agentName: Map<string, string>;
  onClick: (r: RendezVous) => void;
  muted?: boolean;
}) {
  if (!items.length) return null;
  return (
    <div>
      <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
        {title}
      </div>
      <Card className="p-0">
        <div className={cn("divide-y", muted && "opacity-70")}>
          {items.map((r) => (
            <button
              key={r.id}
              onClick={() => onClick(r)}
              className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition hover:bg-accent/50"
            >
              <span className="min-w-36 text-sm text-foreground">{formatDateTime(r.date)}</span>
              <span className="text-xs text-muted-foreground">{RDV_TYPE_LABELS[r.type]}</span>
              <span className="min-w-32 flex-1 font-medium text-foreground">
                {r.contact || "—"}
                {r.objet && (
                  <span className="ml-2 font-normal text-muted-foreground">· {r.objet}</span>
                )}
              </span>
              {r.agentId && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <UserIcon className="h-3 w-3" />
                  {agentName.get(r.agentId) ?? "—"}
                </span>
              )}
              <RdvStatusBadge status={r.statut} />
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

function shiftMonth(m: { y: number; m: number }, delta: number) {
  const d = new Date(m.y, m.m + delta, 1);
  return { y: d.getFullYear(), m: d.getMonth() };
}

const MONTH_NAMES = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];
const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function MonthCalendar({
  year,
  month,
  items,
  onPrev,
  onNext,
  onDay,
  onItem,
}: {
  year: number;
  month: number;
  items: RendezVous[];
  onPrev: () => void;
  onNext: () => void;
  onDay: (iso: string) => void;
  onItem: (r: RendezVous) => void;
}) {
  const byDay = useMemo(() => {
    const map = new Map<string, RendezVous[]>();
    for (const r of items) {
      const key = new Date(r.date).toISOString().slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return map;
  }, [items]);

  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const dayIso = (day: number) => new Date(year, month, day, 9, 0).toISOString().slice(0, 16);

  return (
    <Card className="p-0">
      <div className="flex items-center justify-between border-b p-3">
        <Button variant="outline" size="icon" onClick={onPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-display text-lg text-foreground">
          {MONTH_NAMES[month]} {year}
        </span>
        <Button variant="outline" size="icon" onClick={onNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 border-b text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-2">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const iso10 = day ? new Date(year, month, day).toISOString().slice(0, 10) : "";
          const dayItems = day ? (byDay.get(iso10) ?? []) : [];
          return (
            <div
              key={i}
              className={cn(
                "min-h-24 border-b border-r p-1.5 text-xs last:border-r-0",
                !day && "bg-secondary/30",
              )}
              onClick={() => day && onDay(dayIso(day))}
              role={day ? "button" : undefined}
            >
              {day && <div className="mb-1 text-muted-foreground">{day}</div>}
              <div className="space-y-1">
                {dayItems.slice(0, 3).map((r) => (
                  <button
                    key={r.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onItem(r);
                    }}
                    className="block w-full truncate rounded-[4px] bg-primary/10 px-1 py-0.5 text-left text-[10px] text-foreground hover:bg-primary/20"
                  >
                    {new Date(r.date).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    {r.contact || RDV_TYPE_LABELS[r.type]}
                  </button>
                ))}
                {dayItems.length > 3 && (
                  <div className="px-1 text-[10px] text-muted-foreground">
                    +{dayItems.length - 3}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
