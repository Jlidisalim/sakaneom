import { FileText, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RESIDENCE_STATUSES, type L, type Stat } from "@/lib/cms/types";
import { BilingualText, Card, ImageField, PanelShell, SaveBar, useSection } from "../fields";

const emptyL: L = { fr: "", ar: "" };

function AddRemoveRow({ onRemove, children }: { onRemove: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-background/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-3">{children}</div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Agency — history / name / management ─────────────────────────────────────────
function AgencyEditor() {
  const s = useSection("about");
  const d = s.draft;
  const setStats = (stats: Stat[]) => s.patch({ stats });
  return (
    <>
      <Card
        title="Agency — history, name & track record"
        description="The company section near the bottom of every page."
      >
        <div className="space-y-4">
          <BilingualText
            label="Agency name / heading"
            value={d.title}
            onChange={(v) => s.patch({ title: v })}
          />
          <BilingualText
            label="History / about"
            value={d.p}
            onChange={(v) => s.patch({ p: v })}
            area
            rows={5}
          />
          <ImageField
            label="Agency image"
            value={d.image}
            onChange={(url) => s.patch({ image: url })}
            aspect="aspect-[5/4]"
          />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">
                Key figures (years, projects, clients…)
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStats([...d.stats, { n: { ...emptyL }, l: { ...emptyL } }])}
              >
                <Plus className="h-4 w-4" /> Add figure
              </Button>
            </div>
            {d.stats.map((st, i) => (
              <AddRemoveRow key={i} onRemove={() => setStats(d.stats.filter((_, j) => j !== i))}>
                <BilingualText
                  label="Number"
                  value={st.n}
                  onChange={(n) => setStats(d.stats.map((x, j) => (j === i ? { ...x, n } : x)))}
                />
                <BilingualText
                  label="Label"
                  value={st.l}
                  onChange={(l) => setStats(d.stats.map((x, j) => (j === i ? { ...x, l } : x)))}
                />
              </AddRemoveRow>
            ))}
          </div>
        </div>
      </Card>
      <SaveBar dirty={s.dirty} saving={s.saving} onSave={s.commit} onDiscard={s.discard} />
    </>
  );
}

// ── Contact & footer ─────────────────────────────────────────────────────────────
function ContactEditor() {
  const s = useSection("contact");
  const d = s.draft;
  const setHours = (hours: L[]) => s.patch({ hours });
  return (
    <>
      <Card title="Contact & footer" description="Headline, opening hours and footer labels.">
        <div className="space-y-4">
          <BilingualText
            label="Contact headline"
            value={d.title}
            onChange={(v) => s.patch({ title: v })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <BilingualText
              label="Hours label"
              value={d.hoursLabel}
              onChange={(v) => s.patch({ hoursLabel: v })}
            />
            <BilingualText
              label="“Follow us” label"
              value={d.follow}
              onChange={(v) => s.patch({ follow: v })}
            />
            <BilingualText
              label="“Quick links” label"
              value={d.quick}
              onChange={(v) => s.patch({ quick: v })}
            />
            <BilingualText
              label="“Contact” label"
              value={d.contactLabel}
              onChange={(v) => s.patch({ contactLabel: v })}
            />
            <BilingualText
              label="Footer links text"
              value={d.footerProjects}
              onChange={(v) => s.patch({ footerProjects: v })}
            />
            <BilingualText
              label="Designed-by credit"
              value={d.designed}
              onChange={(v) => s.patch({ designed: v })}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Opening hours lines</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHours([...d.hours, { ...emptyL }])}
              >
                <Plus className="h-4 w-4" /> Add line
              </Button>
            </div>
            {d.hours.map((h, i) => (
              <AddRemoveRow key={i} onRemove={() => setHours(d.hours.filter((_, j) => j !== i))}>
                <BilingualText
                  value={h}
                  onChange={(v) => setHours(d.hours.map((x, j) => (j === i ? v : x)))}
                />
              </AddRemoveRow>
            ))}
          </div>
        </div>
      </Card>
      <SaveBar dirty={s.dirty} saving={s.saving} onSave={s.commit} onDiscard={s.discard} />
    </>
  );
}

// ── Shared labels (identical section headings across all residences) ──────────────
function LabelsEditor() {
  const s = useSection("labels");
  const d = s.draft;
  return (
    <>
      <Card
        title="Section headings"
        description="Standardized labels shown on every residence — keeps the layout consistent."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <BilingualText
            label="Intro eyebrow"
            value={d.introEye}
            onChange={(v) => s.patch({ introEye: v })}
          />
          <BilingualText
            label="Gallery eyebrow"
            value={d.galleryEye}
            onChange={(v) => s.patch({ galleryEye: v })}
          />
          <BilingualText
            label="Gallery title"
            value={d.galleryTitle}
            onChange={(v) => s.patch({ galleryTitle: v })}
          />
          <BilingualText
            label="Pricing eyebrow"
            value={d.pricingEye}
            onChange={(v) => s.patch({ pricingEye: v })}
          />
          <BilingualText
            label="Pricing title"
            value={d.pricingTitle}
            onChange={(v) => s.patch({ pricingTitle: v })}
          />
          <BilingualText
            label="Location eyebrow"
            value={d.locationEye}
            onChange={(v) => s.patch({ locationEye: v })}
          />
          <BilingualText
            label="Location title"
            value={d.locationTitle}
            onChange={(v) => s.patch({ locationTitle: v })}
          />
          <BilingualText
            label="Scroll label"
            value={d.scroll}
            onChange={(v) => s.patch({ scroll: v })}
          />
          <BilingualText
            label="Residences grid title"
            value={d.residencesTitle}
            onChange={(v) => s.patch({ residencesTitle: v })}
          />
          <BilingualText
            label="“View residence” label"
            value={d.viewResidence}
            onChange={(v) => s.patch({ viewResidence: v })}
          />
          <BilingualText
            label="“View plan” button"
            value={d.viewPlan}
            onChange={(v) => s.patch({ viewPlan: v })}
          />
          <BilingualText
            label="“Request info” button"
            value={d.askInfo}
            onChange={(v) => s.patch({ askInfo: v })}
          />
        </div>
      </Card>

      <Card title="Price table columns" className="mt-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {d.cols.map((c, i) => (
            <BilingualText
              key={i}
              label={`Column ${i + 1}`}
              value={c}
              onChange={(v) => s.patch({ cols: d.cols.map((x, j) => (j === i ? v : x)) })}
            />
          ))}
        </div>
      </Card>

      <Card
        title="Status labels"
        description="The pill shown on each residence card."
        className="mt-5"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {RESIDENCE_STATUSES.map((st) => (
            <BilingualText
              key={st}
              label={st}
              value={d.status[st]}
              onChange={(v) => s.patch({ status: { ...d.status, [st]: v } })}
            />
          ))}
        </div>
      </Card>

      <SaveBar dirty={s.dirty} saving={s.saving} onSave={s.commit} onDiscard={s.discard} />
    </>
  );
}

export function ContentPanel() {
  return (
    <PanelShell
      title="Content"
      description="Agency history, name & management, contact details, and the shared section labels."
      icon={<FileText className="h-5 w-5" />}
    >
      <Tabs defaultValue="agency">
        <TabsList className="mb-5 flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="agency">Agency</TabsTrigger>
          <TabsTrigger value="contact">Contact & footer</TabsTrigger>
          <TabsTrigger value="labels">Section labels</TabsTrigger>
        </TabsList>
        <TabsContent value="agency">
          <AgencyEditor />
        </TabsContent>
        <TabsContent value="contact">
          <ContactEditor />
        </TabsContent>
        <TabsContent value="labels">
          <LabelsEditor />
        </TabsContent>
      </Tabs>
    </PanelShell>
  );
}
