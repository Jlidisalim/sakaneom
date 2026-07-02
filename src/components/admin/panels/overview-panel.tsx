import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Building2,
  Crown,
  ExternalLink,
  EyeOff,
  FileText,
  Home,
  Inbox,
  PanelTop,
  Tag,
  Users,
} from "lucide-react";

import type { SectionId } from "../dashboard";
import { getAnalyticsFn, listLeadsFn } from "@/lib/cms/api";
import { getPrimaryResidence } from "@/lib/cms/select";
import { useAdmin } from "../context";
import { Card, PanelShell } from "../fields";

export function OverviewPanel({ onNavigate }: { onNavigate: (id: SectionId) => void }) {
  const { content } = useAdmin();
  const { data: leads = [] } = useQuery({
    queryKey: ["admin", "leads"],
    queryFn: () => listLeadsFn(),
  });
  const { data: analytics } = useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: () => getAnalyticsFn(),
  });

  const newLeads = leads.filter((l) => l.status === "new").length;
  const primary = getPrimaryResidence(content);
  const totalUnits = content.residences.reduce((n, r) => n + r.pricing.units.length, 0);

  // Most viewed / ignored residences from analytics.
  const views = analytics?.residenceViews ?? {};
  const ranked = content.residences
    .map((r) => ({ name: r.name.fr, views: views[r.slug] ?? 0 }))
    .sort((a, b) => b.views - a.views);
  const mostViewed = ranked.find((r) => r.views > 0) ?? null;
  const ignoredCount = ranked.filter((r) => r.views === 0).length;

  const stats: {
    id: SectionId;
    label: string;
    value: string | number;
    icon: React.ReactNode;
    hint?: string;
  }[] = [
    {
      id: "analytics",
      label: "Unique visitors",
      value: analytics?.uniqueVisitors ?? 0,
      icon: <Users className="h-5 w-5" />,
    },
    {
      id: "analytics",
      label: "Page views",
      value: analytics?.totalViews ?? 0,
      icon: <ArrowUpRight className="h-5 w-5" />,
    },
    {
      id: "leads",
      label: "New leads",
      value: newLeads,
      icon: <Inbox className="h-5 w-5" />,
      hint: `${leads.length} total`,
    },
    {
      id: "residences",
      label: "Residences",
      value: content.residences.length,
      icon: <Building2 className="h-5 w-5" />,
    },
    { id: "residences", label: "Apartments", value: totalUnits, icon: <Tag className="h-5 w-5" /> },
  ];

  const sections: { id: SectionId; label: string; desc: string; icon: React.ReactNode }[] = [
    {
      id: "residences",
      label: "Residences",
      desc: "Edit & feature residences",
      icon: <Building2 className="h-5 w-5" />,
    },
    {
      id: "header",
      label: "Header & Brand",
      desc: "Logo, contacts, navigation",
      icon: <PanelTop className="h-5 w-5" />,
    },
    {
      id: "content",
      label: "Content & Agency",
      desc: "Agency, contact, labels",
      icon: <FileText className="h-5 w-5" />,
    },
    { id: "leads", label: "Leads", desc: "Inquiries", icon: <Inbox className="h-5 w-5" /> },
  ];

  return (
    <PanelShell
      title="Dashboard"
      description="Overview of your residences, visitors and incoming inquiries."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s, i) => (
          <button
            key={i}
            onClick={() => onNavigate(s.id)}
            className="group rounded-surface border bg-card p-4 text-left transition-colors hover:border-primary/50"
          >
            <div className="mb-2 flex items-center justify-between text-muted-foreground">
              {s.icon}
              <ArrowUpRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100" />
            </div>
            <div className="font-display text-3xl text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
            {s.hint && <div className="mt-0.5 text-[11px] text-muted-foreground/70">{s.hint}</div>}
          </button>
        ))}
      </div>

      {/* Engagement highlight */}
      <button
        onClick={() => onNavigate("analytics")}
        className="mt-3 flex w-full flex-wrap items-center gap-x-6 gap-y-2 rounded-surface border bg-card p-4 text-left transition-colors hover:border-primary/50"
      >
        <span className="inline-flex items-center gap-2 text-sm">
          <Crown className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">Most viewed:</span>
          <span className="font-medium text-foreground">
            {mostViewed ? `${mostViewed.name} (${mostViewed.views})` : "no views yet"}
          </span>
        </span>
        {ignoredCount > 0 && (
          <span className="inline-flex items-center gap-2 text-sm">
            <EyeOff className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Ignored:</span>
            <span className="font-medium text-foreground">
              {ignoredCount} residence{ignoredCount > 1 ? "s" : ""} with no views
            </span>
          </span>
        )}
        <span className="ml-auto text-xs text-primary">View analytics →</span>
      </button>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Card
          title="Featured residence"
          description="Shown first when the domain is opened."
          className="lg:col-span-1"
        >
          {primary ? (
            <button
              onClick={() => onNavigate("residences")}
              className="flex w-full items-center gap-3 text-left"
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-control bg-secondary">
                {(primary.cardImage || primary.hero.imageDesktop) && (
                  <img
                    src={primary.cardImage || primary.hero.imageDesktop}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div>
                <div className="font-medium text-foreground">{primary.name.fr}</div>
                <div className="text-xs text-muted-foreground">
                  {primary.locationLabel.fr} · {primary.deliveryYear}
                </div>
              </div>
            </button>
          ) : (
            <span className="text-sm text-muted-foreground">No residence yet.</span>
          )}
          <a
            href={primary ? `/residence/${primary.slug}` : "/"}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Home className="h-3.5 w-3.5" /> Open detail page
          </a>
        </Card>

        <Card title="Quick links" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
            {sections.map((s) => (
              <button
                key={s.label}
                onClick={() => onNavigate(s.id)}
                className="flex items-center gap-2.5 rounded-control border p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/40"
              >
                <span className="text-stone">{s.icon}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {s.label}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{s.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-5">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ExternalLink className="h-4 w-4" /> View live site
        </a>
      </div>
    </PanelShell>
  );
}
