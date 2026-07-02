import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Inbox, Loader2, Mail, Phone, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Lead, LeadStatus } from "@/lib/cms/types";
import { cn } from "@/lib/utils";
import { deleteLeadFn, listLeadsFn, updateLeadFn } from "@/lib/cms/api";
import { Card, Field, PanelShell } from "../fields";
import { isUnauthorizedError } from "../unauthorized";

const LEADS_KEY = ["admin", "leads"] as const;

// Status as a quiet dot + label rather than a filled chip — calmer per row,
// and it scales to more statuses without a wall of colour.
const STATUS_META: Record<LeadStatus, { label: string; dot: string }> = {
  new: { label: "New", dot: "bg-primary" },
  contacted: { label: "Contacted", dot: "bg-sky-500" },
  closed: { label: "Closed", dot: "bg-stone" },
};

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function toCSV(leads: Lead[]): string {
  const headers = [
    "Date",
    "Name",
    "Email",
    "Phone",
    "Residence",
    "Apartment",
    "Source",
    "Status",
    "Message",
    "Notes",
  ];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = leads.map((l) =>
    [
      fmtDate(l.createdAt),
      l.name,
      l.email,
      l.phone,
      l.residence,
      l.apt,
      l.source,
      l.status,
      l.message,
      l.notes,
    ]
      .map(esc)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\r\n");
}

export function LeadsPanel() {
  const qc = useQueryClient();
  const { data: leads = [], isLoading } = useQuery({
    queryKey: LEADS_KEY,
    queryFn: () => listLeadsFn(),
    staleTime: 10_000,
  });

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | LeadStatus>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const updateMut = useMutation({
    mutationFn: (vars: { id: string; patch: Partial<Lead> }) => updateLeadFn({ data: vars }),
    onSuccess: (lead) => {
      if (lead) {
        qc.setQueryData<Lead[]>(LEADS_KEY, (prev) =>
          (prev ?? []).map((l) => (l.id === lead.id ? lead : l)),
        );
      }
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteLeadFn({ data: { id } }),
    onSuccess: (_res, id) => {
      qc.setQueryData<Lead[]>(LEADS_KEY, (prev) => (prev ?? []).filter((l) => l.id !== id));
      toast.success("Lead deleted");
    },
  });

  const counts = useMemo(() => {
    return {
      total: leads.length,
      new: leads.filter((l) => l.status === "new").length,
      contacted: leads.filter((l) => l.status === "contacted").length,
      closed: leads.filter((l) => l.status === "closed").length,
    };
  }, [leads]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (!q) return true;
      return [l.name, l.email, l.phone, l.apt, l.message].some((v) =>
        (v ?? "").toLowerCase().includes(q),
      );
    });
  }, [leads, query, statusFilter]);

  const open = leads.find((l) => l.id === openId) ?? null;

  function exportCsv() {
    const blob = new Blob([toCSV(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sakaneom-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const setStatus = (id: string, status: LeadStatus) => updateMut.mutate({ id, patch: { status } });

  return (
    <PanelShell
      title="Leads"
      description="Every “Request Info” inquiry from the website, in one place."
      icon={<Inbox className="h-5 w-5" />}
    >
      {/* stat cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { k: "total", label: "Total", n: counts.total },
          { k: "new", label: "New", n: counts.new },
          { k: "contacted", label: "Contacted", n: counts.contacted },
          { k: "closed", label: "Closed", n: counts.closed },
        ].map((c) => (
          <button
            key={c.k}
            onClick={() => setStatusFilter(c.k === "total" ? "all" : (c.k as LeadStatus))}
            className={cn(
              "rounded-surface border bg-card p-4 text-left transition-colors hover:border-primary/50",
              (statusFilter === c.k || (c.k === "total" && statusFilter === "all")) &&
                "border-primary/60 ring-1 ring-primary/30",
            )}
          >
            <div className="font-display text-3xl text-foreground">{c.n}</div>
            <div className="text-xs text-muted-foreground">{c.label}</div>
          </button>
        ))}
      </div>

      <Card className="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative flex-1 min-w-48">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, phone…"
              className="pl-8"
            />
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>

        {isLoading ? (
          <div className="grid place-items-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !filtered.length ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No leads found.</p>
        ) : (
          <div className="divide-y">
            {filtered.map((l) => {
              const sm = STATUS_META[l.status];
              return (
                <div
                  key={l.id}
                  className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-accent/50"
                  onClick={() => setOpenId(l.id)}
                >
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <span className={cn("size-1.5 rounded-full", sm.dot)} />
                    {sm.label}
                  </span>
                  <div className="min-w-40 flex-1">
                    <div className="font-medium text-foreground">{l.name}</div>
                    <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {l.email}
                      </span>
                      {l.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {l.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  {l.apt && (
                    <span className="rounded-control bg-secondary px-2 py-1 text-xs text-foreground">
                      {l.apt}
                    </span>
                  )}
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {fmtDate(l.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* detail dialog */}
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-w-lg">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>{open.name}</DialogTitle>
                <DialogDescription>
                  {fmtDate(open.createdAt)} · via{" "}
                  {open.source === "info-panel" ? "apartment request" : "contact form"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <a
                    className="rounded-control border p-3 text-sm transition-colors hover:border-primary"
                    href={`mailto:${open.email}`}
                  >
                    <div className="text-xs text-muted-foreground">Email</div>
                    <div className="truncate text-foreground">{open.email}</div>
                  </a>
                  <a
                    className="rounded-control border p-3 text-sm transition-colors hover:border-primary"
                    href={`tel:${open.phone}`}
                  >
                    <div className="text-xs text-muted-foreground">Phone</div>
                    <div className="truncate text-foreground">{open.phone || "—"}</div>
                  </a>
                </div>
                {(open.apt || open.residence) && (
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    {open.residence && (
                      <span>
                        <span className="text-muted-foreground">Residence: </span>
                        <a
                          href={`/residence/${open.residence}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          {open.residence}
                        </a>
                      </span>
                    )}
                    {open.apt && (
                      <span>
                        <span className="text-muted-foreground">Apartment: </span>
                        <span className="text-foreground">{open.apt}</span>
                      </span>
                    )}
                  </div>
                )}
                {open.message && (
                  <div className="rounded-control bg-muted p-3 text-sm text-foreground">
                    {open.message}
                  </div>
                )}

                <Field label="Status">
                  <div className="inline-flex gap-1 rounded-control border bg-secondary/40 p-1">
                    {(Object.keys(STATUS_META) as LeadStatus[]).map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatus(open.id, st)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-[6px] px-3 py-1 text-xs font-medium transition-colors",
                          open.status === st
                            ? "bg-card text-foreground shadow-[0_1px_2px_rgba(28,24,19,0.08)]"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <span className={cn("size-1.5 rounded-full", STATUS_META[st].dot)} />
                        {STATUS_META[st].label}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Internal notes">
                  <Textarea
                    defaultValue={open.notes ?? ""}
                    rows={3}
                    placeholder="Private notes — not shown on the website"
                    onBlur={(e) => {
                      const next = e.target.value;
                      if (next === (open.notes ?? "")) return;
                      // Only confirm once the server actually persisted it.
                      updateMut.mutate(
                        { id: open.id, patch: { notes: next } },
                        {
                          onSuccess: (lead) =>
                            lead
                              ? toast.success("Notes saved")
                              : toast.error("Couldn't save — lead not found"),
                          onError: (err) => {
                            if (!isUnauthorizedError(err))
                              toast.error("Couldn't save notes. Try again.");
                          },
                        },
                      );
                    }}
                  />
                </Field>

                <div className="flex justify-between pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    disabled={deleteMut.isPending}
                    onClick={() => {
                      // Keep the dialog open until the server confirms; surface
                      // failures instead of silently "succeeding".
                      deleteMut.mutate(open.id, {
                        onSuccess: () => setOpenId(null),
                        onError: (err) => {
                          if (!isUnauthorizedError(err)) toast.error("Couldn't delete. Try again.");
                        },
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                  <Button size="sm" asChild>
                    <a href={`mailto:${open.email}`}>Reply by email</a>
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PanelShell>
  );
}
