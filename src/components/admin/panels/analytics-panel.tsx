import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Crown,
  ExternalLink,
  Eye,
  EyeOff,
  Inbox,
  Loader2,
  MousePointerClick,
  RotateCcw,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import type { Lead } from "@/lib/cms/types";
import { cn } from "@/lib/utils";
import { getAnalyticsFn, listLeadsFn, resetAnalyticsFn } from "@/lib/cms/api";
import { useAdmin } from "../context";
import { Card, PanelShell } from "../fields";

const ANALYTICS_KEY = ["admin", "analytics"] as const;

function last7Days(daily: Record<string, number>) {
  const out: { d: string; n: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ d: key, n: daily[key] ?? 0 });
  }
  return out;
}

function Kpi({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-surface border bg-card p-4">
      <div className="mb-2 text-stone">{icon}</div>
      <div className="font-display text-3xl text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground/70">{hint}</div>}
    </div>
  );
}

export function AnalyticsPanel() {
  const qc = useQueryClient();
  const { content } = useAdmin();
  const { data: analytics, isPending } = useQuery({
    queryKey: ANALYTICS_KEY,
    queryFn: () => getAnalyticsFn(),
  });
  const { data: leads = [] } = useQuery({
    queryKey: ["admin", "leads"],
    queryFn: () => listLeadsFn(),
  });

  const resetMut = useMutation({
    mutationFn: () => resetAnalyticsFn(),
    onSuccess: (fresh) => {
      qc.setQueryData(ANALYTICS_KEY, fresh);
      toast.success("Analytics reset");
    },
  });

  const rows = useMemo(() => {
    const views = analytics?.residenceViews ?? {};
    const leadsBy: Record<string, number> = {};
    for (const l of leads as Lead[])
      if (l.residence) leadsBy[l.residence] = (leadsBy[l.residence] ?? 0) + 1;
    return content.residences
      .map((r) => {
        const v = views[r.slug] ?? 0;
        const lc = leadsBy[r.slug] ?? 0;
        return {
          id: r.id,
          slug: r.slug,
          name: r.name.fr || "Untitled",
          primary: r.id === content.primaryResidenceId,
          views: v,
          leads: lc,
          conv: v ? lc / v : 0,
        };
      })
      .sort((a, b) => b.views - a.views || b.leads - a.leads);
  }, [analytics, leads, content.residences, content.primaryResidenceId]);

  if (isPending || !analytics) {
    return (
      <PanelShell
        title="Analytics"
        description="Visitor & residence engagement."
        icon={<BarChart3 className="h-5 w-5" />}
      >
        <div className="grid place-items-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </PanelShell>
    );
  }

  const residenceViewTotal = Object.values(analytics.residenceViews).reduce((n, v) => n + v, 0);
  const maxViews = Math.max(1, ...rows.map((r) => r.views));
  const newLeads = (leads as Lead[]).filter((l) => l.status === "new").length;
  const overallConv = residenceViewTotal
    ? (leads as Lead[]).filter((l) => l.residence).length / residenceViewTotal
    : 0;
  const mostViewed = rows.find((r) => r.views > 0) ?? null;
  const ignored = rows.filter((r) => r.views === 0);
  const trend = last7Days(analytics.daily);
  const maxTrend = Math.max(1, ...trend.map((t) => t.n));

  return (
    <PanelShell
      title="Analytics"
      description="Visitor & residence engagement — which residences get attention, and which are ignored."
      icon={<BarChart3 className="h-5 w-5" />}
    >
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi
          icon={<Users className="h-5 w-5" />}
          label="Unique visitors"
          value={analytics.uniqueVisitors}
        />
        <Kpi
          icon={<Eye className="h-5 w-5" />}
          label="Page views"
          value={analytics.totalViews}
          hint={`${analytics.homeViews} home`}
        />
        <Kpi
          icon={<MousePointerClick className="h-5 w-5" />}
          label="Residence views"
          value={residenceViewTotal}
        />
        <Kpi
          icon={<Inbox className="h-5 w-5" />}
          label="New leads"
          value={newLeads}
          hint={`${leads.length} total`}
        />
        <Kpi
          icon={<TrendingUp className="h-5 w-5" />}
          label="Conversion"
          value={`${(overallConv * 100).toFixed(1)}%`}
          hint="leads / residence views"
        />
      </div>

      {/* Highlights */}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Card>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-control bg-primary/10 text-primary">
              <Crown className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Most viewed residence</div>
              {mostViewed ? (
                <div className="truncate font-medium text-foreground">
                  {mostViewed.name}{" "}
                  <span className="text-muted-foreground">· {mostViewed.views} views</span>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No views yet</div>
              )}
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-control bg-muted text-stone">
              <EyeOff className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Ignored (no views yet)</div>
              <div className="truncate font-medium text-foreground">
                {ignored.length
                  ? ignored.map((r) => r.name).join(", ")
                  : "None — every residence has views 🎉"}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Residence performance */}
      <Card
        title="Residence performance"
        description="Views, leads and conversion per residence."
        className="mt-5"
      >
        <div className="space-y-2.5">
          {rows.map((r, i) => (
            <div key={r.id} className="flex items-center gap-3">
              <span className="w-5 shrink-0 text-right text-xs text-muted-foreground">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                    {i === 0 && r.views > 0 && <Crown className="h-3.5 w-3.5 text-primary" />}
                    {r.name}
                    {r.primary && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-primary">
                        Primary
                      </span>
                    )}
                    {r.views === 0 && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                        Ignored
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {r.views} views · {r.leads} leads · {(r.conv * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn("h-full rounded-full", r.views ? "bg-primary" : "bg-transparent")}
                    style={{ width: `${(r.views / maxViews) * 100}%` }}
                  />
                </div>
              </div>
              <a
                href={`/residence/${r.slug}`}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-muted-foreground transition hover:text-primary"
                title="Open page"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>
      </Card>

      {/* 7-day trend */}
      <Card title="Last 7 days" description="Total page views per day." className="mt-5">
        <div className="flex items-end justify-between gap-2" style={{ height: 120 }}>
          {trend.map((t) => (
            <div key={t.d} className="flex flex-1 flex-col items-center justify-end gap-1.5">
              <span className="text-[10px] text-muted-foreground">{t.n}</span>
              <div
                className="w-full rounded-t bg-primary/80"
                style={{ height: `${Math.max(4, (t.n / maxTrend) * 90)}px` }}
              />
              <span className="text-[10px] text-muted-foreground">{t.d.slice(5)}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-5 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Tracking since{" "}
          {analytics.startedAt ? new Date(analytics.startedAt).toLocaleDateString() : "—"}
        </span>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <RotateCcw className="h-4 w-4" /> Reset analytics
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset all analytics?</AlertDialogTitle>
              <AlertDialogDescription>
                This clears all visitor and view counts. Leads are not affected. This cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => resetMut.mutate()}>Reset</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PanelShell>
  );
}
