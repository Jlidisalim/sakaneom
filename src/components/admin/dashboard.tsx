import { useState, type CSSProperties } from "react";
import {
  Building2,
  CalendarClock,
  ExternalLink,
  FileText,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelTop,
  RotateCcw,
  Settings as SettingsIcon,
  X,
} from "lucide-react";

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
import { cn } from "@/lib/utils";
import { canRead, ROLE_LABELS, type Role } from "@/lib/promo/permissions";
import { useAdmin } from "./context";

// Promotion modules (the remaining ones)
import { RendezVousPanel } from "./panels/rendezvous-panel";
import { ParametresPanel } from "./panels/parametres-panel";

// Public marketing site (CMS)
import { OverviewPanel } from "./panels/overview-panel";
import { AnalyticsPanel } from "./panels/analytics-panel";
import { HeaderPanel } from "./panels/header-panel";
import { ResidencesPanel } from "./panels/residences-panel";
import { ContentPanel } from "./panels/content-panel";
import { LeadsPanel } from "./panels/leads-panel";

export type SectionId =
  | "dashboard"
  | "rendezvous"
  | "parametres"
  // Public site (CMS). "analytics" is kept in the type (OverviewPanel links to it)
  // but is now surfaced INSIDE the Tableau de bord, so it has no own nav entry.
  | "analytics"
  | "header"
  | "residences"
  | "content"
  | "leads";

type NavItem = {
  id: SectionId;
  label: string;
  icon: React.ReactNode;
  /** Whether a given role may see this item. */
  visible: (role: Role | undefined) => boolean;
};

type NavGroup = { heading: string; items: NavItem[] };

const ic = "h-4 w-4";
const cmsRoles = (r: Role | undefined) => r === "super_admin" || r === "manager";

const NAV: NavGroup[] = [
  {
    heading: "Pilotage",
    items: [
      {
        id: "dashboard",
        label: "Tableau de bord",
        icon: <LayoutDashboard className={ic} />,
        visible: () => true,
      },
      {
        id: "rendezvous",
        label: "Rendez-vous",
        icon: <CalendarClock className={ic} />,
        visible: (r) => canRead(r, "rendezvous"),
      },
    ],
  },
  {
    heading: "Gestion",
    items: [
      {
        id: "parametres",
        label: "Paramètres",
        icon: <SettingsIcon className={ic} />,
        visible: (r) => canRead(r, "settings"),
      },
    ],
  },
  {
    heading: "Site web",
    items: [
      {
        id: "header",
        label: "En-tête & marque",
        icon: <PanelTop className={ic} />,
        visible: cmsRoles,
      },
      {
        id: "residences",
        label: "Résidences (site)",
        icon: <Building2 className={ic} />,
        visible: cmsRoles,
      },
      {
        id: "content",
        label: "Contenu & agence",
        icon: <FileText className={ic} />,
        visible: cmsRoles,
      },
      { id: "leads", label: "Demandes web", icon: <Inbox className={ic} />, visible: cmsRoles },
    ],
  },
];

export function Dashboard({ onLogout }: { onLogout: () => void }) {
  const { content, role, reset, can } = useAdmin();
  const [section, setSection] = useState<SectionId>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  const go = (id: SectionId) => {
    setSection(id);
    setMobileOpen(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  // Guard: if the current role can't see the active section, fall back to the
  // always-visible dashboard.
  const visibleGroups = NAV.map((g) => ({
    ...g,
    items: g.items.filter((it) => it.visible(role)),
  })).filter((g) => g.items.length);
  const allVisible = visibleGroups.flatMap((g) => g.items);
  const activeSection = allVisible.some((it) => it.id === section) ? section : "dashboard";

  return (
    <div
      className="admin-ui min-h-screen bg-background"
      style={{ "--admin-sidebar": "17rem" } as CSSProperties}
    >
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[17rem] flex-col border-r bg-card transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b px-5 py-4">
          <div className="leading-tight">
            <div className="font-display text-lg gold-text" style={{ letterSpacing: "0.2em" }}>
              {content.header.brand}
            </div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Espace Admin{role ? ` · ${ROLE_LABELS[role]}` : ""}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          {visibleGroups.map((group) => (
            <div key={group.heading} className="space-y-1">
              <div className="px-3 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                {group.heading}
              </div>
              {group.items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => go(n.id)}
                  className={cn(
                    "relative flex w-full items-center gap-3 rounded-control px-3 py-2 text-sm transition-colors",
                    "before:absolute before:left-0 before:top-1/2 before:h-5 before:-translate-y-1/2 before:rounded-full before:bg-primary before:transition-all before:duration-200",
                    activeSection === n.id
                      ? "bg-primary/10 font-medium text-foreground before:w-[3px]"
                      : "text-muted-foreground before:w-0 hover:bg-accent hover:text-foreground",
                  )}
                >
                  <span className={activeSection === n.id ? "text-primary" : "text-stone"}>
                    {n.icon}
                  </span>
                  {n.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="space-y-1 border-t p-3">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center gap-3 rounded-control px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" /> Voir le site
          </a>

          {can("settings") && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-control px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                  <RotateCcw className="h-4 w-4" /> Réinitialiser le contenu
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="admin-ui">
                <AlertDialogHeader>
                  <AlertDialogTitle>Réinitialiser tout le contenu du site ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cela restaure chaque section du site public à son contenu d'origine. Action
                    irréversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={() => reset()}>Réinitialiser</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-control px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Se déconnecter
          </button>
        </div>
      </aside>

      {/* mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="lg:pl-[17rem]">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
          <Button variant="outline" size="icon" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-display text-lg gold-text" style={{ letterSpacing: "0.2em" }}>
            {content.header.brand}
          </span>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {/* Tableau de bord = aperçu du site + statistiques, réunis. */}
          {activeSection === "dashboard" && (
            <div className="space-y-10">
              <OverviewPanel onNavigate={(id) => go(id === "analytics" ? "dashboard" : id)} />
              <AnalyticsPanel />
            </div>
          )}
          {activeSection === "rendezvous" && <RendezVousPanel />}
          {activeSection === "parametres" && <ParametresPanel />}

          {activeSection === "header" && <HeaderPanel />}
          {activeSection === "residences" && <ResidencesPanel />}
          {activeSection === "content" && <ContentPanel />}
          {activeSection === "leads" && <LeadsPanel />}
        </main>
      </div>
    </div>
  );
}
