import { useEffect, useRef, useState } from "react";
import { Building2, Plus, Star, Trash2, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  RESIDENCE_STATUSES,
  type KV,
  type L,
  type Pill,
  type Residence,
  type ResidenceStatus,
} from "@/lib/cms/types";
import { slugify } from "@/lib/cms/select";
import { cn } from "@/lib/utils";
import { useAdmin } from "../context";
import { BilingualText, Card, Field, ImageField, PanelShell, SaveBar, TextField } from "../fields";
import { GalleryEditor, VideoEditor } from "../editors/gallery-editor";
import { PlansEditor, UnitsEditor } from "../editors/units-editor";
import { MarkerMapEditor } from "../editors/map-editor";

const emptyL: L = { fr: "", ar: "" };

const STATUS_LABEL: Record<ResidenceStatus, string> = {
  "on-sale": "On sale",
  "coming-soon": "Coming soon",
  delivered: "Delivered",
  "sold-out": "Sold out",
};

function clone<T>(v: T): T {
  try {
    return structuredClone(v);
  } catch {
    return JSON.parse(JSON.stringify(v));
  }
}

function blankResidence(): Residence {
  const id = crypto.randomUUID();
  return {
    id,
    slug: `residence-${id.slice(0, 6)}`,
    name: { fr: "Nouvelle résidence", ar: "إقامة جديدة" },
    status: "coming-soon",
    locationLabel: { fr: "", ar: "" },
    deliveryYear: "",
    unitType: { fr: "", ar: "" },
    cardImage: "",
    hero: {
      eyebrow: { fr: "", ar: "" },
      title1: { fr: "Nouvelle résidence", ar: "إقامة جديدة" },
      title2: { fr: "", ar: "" },
      sub: { fr: "", ar: "" },
      cta: { fr: "Voir la résidence", ar: "اكتشف الإقامة" },
      imageDesktop: "",
      imageMobile: "",
    },
    intro: {
      title: { fr: "Nouvelle résidence", ar: "إقامة جديدة" },
      p1: { fr: "", ar: "" },
      p2: { fr: "", ar: "" },
      image: "",
    },
    banner: { line: { fr: "", ar: "" }, meta: [], image: "" },
    highlight: {
      title: { fr: "", ar: "" },
      p: { fr: "", ar: "" },
      feat: { fr: "", ar: "" },
      featP: { fr: "", ar: "" },
      pills: [],
      image: "",
    },
    gallery: {
      images: [],
      video: {
        label: { fr: "Visite guidée en vidéo", ar: "جولة بالفيديو" },
        sub: { fr: "", ar: "" },
        src: "",
        poster: "",
      },
    },
    pricing: { plans: { "S+1": "", "S+2": "", "S+3": "", "S+4": "" }, units: [] },
    location: {
      p: { fr: "", ar: "" },
      near: [],
      center: { lat: 36.8, lng: 10.18 },
      zoom: 13,
      markers: [],
    },
  };
}

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

const statusSelectCls =
  "h-9 w-full rounded-control border bg-background px-2 text-sm text-foreground transition-[border-color,box-shadow] focus-visible:border-ring/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

export function ResidencesPanel() {
  const { content, saveAll, saving } = useAdmin();

  const [residences, setResidences] = useState<Residence[]>(() => clone(content.residences));
  const [primary, setPrimary] = useState(content.primaryResidenceId);
  const [selId, setSelId] = useState<string>(content.residences[0]?.id ?? "");

  const remoteKey = JSON.stringify([content.residences, content.primaryResidenceId]);
  const lastRemote = useRef(remoteKey);
  useEffect(() => {
    if (lastRemote.current !== remoteKey) {
      lastRemote.current = remoteKey;
      setResidences(clone(content.residences));
      setPrimary(content.primaryResidenceId);
    }
  }, [remoteKey, content.residences, content.primaryResidenceId]);

  const dirty =
    JSON.stringify(residences) !== JSON.stringify(content.residences) ||
    primary !== content.primaryResidenceId;

  const selected = residences.find((r) => r.id === selId) ?? residences[0];
  const patch = (p: Partial<Residence>) =>
    setResidences((rs) => rs.map((r) => (r.id === selected.id ? { ...r, ...p } : r)));

  function addResidence() {
    const r = blankResidence();
    setResidences((rs) => [...rs, r]);
    setSelId(r.id);
  }
  function removeResidence(id: string) {
    const next = residences.filter((r) => r.id !== id);
    setResidences(next);
    if (selId === id) setSelId(next[0]?.id ?? "");
    if (primary === id) setPrimary(next[0]?.id ?? "");
  }

  return (
    <PanelShell
      title="Residences"
      description="Every residence follows the same standardized structure. Star one to show it first on the homepage."
      icon={<Building2 className="h-5 w-5" />}
    >
      <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
        {/* List + primary selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{residences.length} residences</span>
            <Button size="sm" onClick={addResidence}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          {residences.map((r) => {
            const isPrimary = primary === r.id;
            return (
              <div
                key={r.id}
                className={cn(
                  "rounded-lg border p-2 transition",
                  selId === r.id ? "border-primary bg-primary/5" : "hover:bg-accent/50",
                )}
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPrimary(r.id)}
                    title="Show first on homepage"
                    className={cn(
                      "shrink-0 rounded-control p-1.5 transition-colors",
                      isPrimary ? "text-primary" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Star className={cn("h-4 w-4", isPrimary && "fill-primary")} />
                  </button>
                  <button onClick={() => setSelId(r.id)} className="min-w-0 flex-1 text-left">
                    <div className="truncate text-sm font-medium text-foreground">
                      {r.name.fr || "Untitled"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {STATUS_LABEL[r.status]} · {r.pricing.units.length} units
                    </div>
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-destructive"
                        disabled={residences.length <= 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete “{r.name.fr}”?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the residence from the site once you save. This cannot be
                          undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => removeResidence(r.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
          <p className="px-1 pt-1 text-xs text-muted-foreground">
            <Star className="mr-1 inline h-3 w-3 fill-primary text-primary" /> = displayed first
            when the domain is opened.
          </p>
        </div>

        {/* Editor */}
        {selected && <ResidenceEditor key={selected.id} residence={selected} patch={patch} />}
      </div>

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={() => saveAll({ residences, primaryResidenceId: primary })}
        onDiscard={() => {
          setResidences(clone(content.residences));
          setPrimary(content.primaryResidenceId);
        }}
      />
    </PanelShell>
  );
}

function ResidenceEditor({
  residence: r,
  patch,
}: {
  residence: Residence;
  patch: (p: Partial<Residence>) => void;
}) {
  return (
    <Tabs defaultValue="identity">
      <TabsList className="mb-4 flex h-auto flex-wrap justify-start gap-1">
        <TabsTrigger value="identity">Identity</TabsTrigger>
        <TabsTrigger value="hero">Hero</TabsTrigger>
        <TabsTrigger value="intro">Intro</TabsTrigger>
        <TabsTrigger value="banner">Banner</TabsTrigger>
        <TabsTrigger value="highlight">Highlight</TabsTrigger>
        <TabsTrigger value="gallery">Gallery</TabsTrigger>
        <TabsTrigger value="pricing">Pricing</TabsTrigger>
        <TabsTrigger value="location">Location</TabsTrigger>
      </TabsList>

      <TabsContent value="identity">
        <Card title="Identity">
          <div className="space-y-4">
            <BilingualText label="Name" value={r.name} onChange={(name) => patch({ name })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="URL slug" hint="Used in /residence/<slug>">
                <div className="flex gap-2">
                  <Input value={r.slug} onChange={(e) => patch({ slug: e.target.value })} />
                  <Button
                    variant="outline"
                    size="icon"
                    title="Generate from name"
                    onClick={() => patch({ slug: slugify(r.name.fr) })}
                  >
                    <Wand2 className="h-4 w-4" />
                  </Button>
                </div>
              </Field>
              <Field label="Status">
                <select
                  className={statusSelectCls}
                  value={r.status}
                  onChange={(e) => patch({ status: e.target.value as ResidenceStatus })}
                >
                  {RESIDENCE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <BilingualText
                label="Location label"
                value={r.locationLabel}
                onChange={(locationLabel) => patch({ locationLabel })}
              />
              <BilingualText
                label="Type (e.g. R+2)"
                value={r.unitType}
                onChange={(unitType) => patch({ unitType })}
              />
            </div>
            <TextField
              label="Delivery year"
              value={r.deliveryYear}
              onChange={(deliveryYear) => patch({ deliveryYear })}
            />
            <ImageField
              label="Card image (grid cover)"
              value={r.cardImage}
              onChange={(cardImage) => patch({ cardImage })}
              aspect="aspect-[4/5]"
            />
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="hero">
        <Card title="Hero" description="The full-screen opening for this residence.">
          <div className="space-y-4">
            <BilingualText
              label="Eyebrow"
              value={r.hero.eyebrow}
              onChange={(eyebrow) => patch({ hero: { ...r.hero, eyebrow } })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <BilingualText
                label="Title line 1"
                value={r.hero.title1}
                onChange={(title1) => patch({ hero: { ...r.hero, title1 } })}
              />
              <BilingualText
                label="Title line 2"
                value={r.hero.title2}
                onChange={(title2) => patch({ hero: { ...r.hero, title2 } })}
              />
            </div>
            <BilingualText
              label="Subtitle"
              value={r.hero.sub}
              onChange={(sub) => patch({ hero: { ...r.hero, sub } })}
              area
            />
            <BilingualText
              label="Button label"
              value={r.hero.cta}
              onChange={(cta) => patch({ hero: { ...r.hero, cta } })}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <ImageField
                label="Desktop image"
                value={r.hero.imageDesktop}
                onChange={(imageDesktop) => patch({ hero: { ...r.hero, imageDesktop } })}
                aspect="aspect-video"
              />
              <ImageField
                label="Mobile image"
                value={r.hero.imageMobile}
                onChange={(imageMobile) => patch({ hero: { ...r.hero, imageMobile } })}
                aspect="aspect-[3/4]"
              />
            </div>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="intro">
        <Card title="Intro (Section 01)">
          <div className="space-y-4">
            <BilingualText
              label="Title"
              value={r.intro.title}
              onChange={(title) => patch({ intro: { ...r.intro, title } })}
            />
            <BilingualText
              label="Paragraph 1"
              value={r.intro.p1}
              onChange={(p1) => patch({ intro: { ...r.intro, p1 } })}
              area
              rows={4}
            />
            <BilingualText
              label="Paragraph 2"
              value={r.intro.p2}
              onChange={(p2) => patch({ intro: { ...r.intro, p2 } })}
              area
              rows={4}
            />
            <ImageField
              label="Image"
              value={r.intro.image}
              onChange={(image) => patch({ intro: { ...r.intro, image } })}
              aspect="aspect-[4/5]"
            />
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="banner">
        <Card title="Banner strip">
          <div className="space-y-4">
            <BilingualText
              label="Headline"
              value={r.banner.line}
              onChange={(line) => patch({ banner: { ...r.banner, line } })}
            />
            <ImageField
              label="Background image"
              value={r.banner.image}
              onChange={(image) => patch({ banner: { ...r.banner, image } })}
              aspect="aspect-[16/7]"
            />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">Key facts</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    patch({
                      banner: {
                        ...r.banner,
                        meta: [...r.banner.meta, { k: { ...emptyL }, v: { ...emptyL } }],
                      },
                    })
                  }
                >
                  <Plus className="h-4 w-4" /> Add fact
                </Button>
              </div>
              {r.banner.meta.map((m: KV, i: number) => (
                <AddRemoveRow
                  key={i}
                  onRemove={() =>
                    patch({
                      banner: { ...r.banner, meta: r.banner.meta.filter((_, j) => j !== i) },
                    })
                  }
                >
                  <BilingualText
                    label="Label"
                    value={m.k}
                    onChange={(k) =>
                      patch({
                        banner: {
                          ...r.banner,
                          meta: r.banner.meta.map((x, j) => (j === i ? { ...x, k } : x)),
                        },
                      })
                    }
                  />
                  <BilingualText
                    label="Value"
                    value={m.v}
                    onChange={(v) =>
                      patch({
                        banner: {
                          ...r.banner,
                          meta: r.banner.meta.map((x, j) => (j === i ? { ...x, v } : x)),
                        },
                      })
                    }
                  />
                </AddRemoveRow>
              ))}
            </div>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="highlight">
        <Card title="Highlight (second section)">
          <div className="space-y-4">
            <BilingualText
              label="Title"
              value={r.highlight.title}
              onChange={(title) => patch({ highlight: { ...r.highlight, title } })}
            />
            <BilingualText
              label="Paragraph"
              value={r.highlight.p}
              onChange={(p) => patch({ highlight: { ...r.highlight, p } })}
              area
              rows={4}
            />
            <BilingualText
              label="Feature heading"
              value={r.highlight.feat}
              onChange={(feat) => patch({ highlight: { ...r.highlight, feat } })}
            />
            <BilingualText
              label="Feature paragraph"
              value={r.highlight.featP}
              onChange={(featP) => patch({ highlight: { ...r.highlight, featP } })}
              area
            />
            <ImageField
              label="Image"
              value={r.highlight.image}
              onChange={(image) => patch({ highlight: { ...r.highlight, image } })}
              aspect="aspect-[5/4]"
            />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">Proximity pills</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    patch({
                      highlight: {
                        ...r.highlight,
                        pills: [...r.highlight.pills, { a: { ...emptyL }, b: { ...emptyL } }],
                      },
                    })
                  }
                >
                  <Plus className="h-4 w-4" /> Add pill
                </Button>
              </div>
              {r.highlight.pills.map((p: Pill, i: number) => (
                <AddRemoveRow
                  key={i}
                  onRemove={() =>
                    patch({
                      highlight: {
                        ...r.highlight,
                        pills: r.highlight.pills.filter((_, j) => j !== i),
                      },
                    })
                  }
                >
                  <BilingualText
                    label="Time / value"
                    value={p.a}
                    onChange={(a) =>
                      patch({
                        highlight: {
                          ...r.highlight,
                          pills: r.highlight.pills.map((x, j) => (j === i ? { ...x, a } : x)),
                        },
                      })
                    }
                  />
                  <BilingualText
                    label="Place"
                    value={p.b}
                    onChange={(b) =>
                      patch({
                        highlight: {
                          ...r.highlight,
                          pills: r.highlight.pills.map((x, j) => (j === i ? { ...x, b } : x)),
                        },
                      })
                    }
                  />
                </AddRemoveRow>
              ))}
            </div>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="gallery">
        <Card title="Gallery">
          <GalleryEditor
            images={r.gallery.images}
            onChange={(images) => patch({ gallery: { ...r.gallery, images } })}
          />
        </Card>
        <Card title="Video tour" className="mt-5">
          <VideoEditor
            video={r.gallery.video}
            onChange={(video) => patch({ gallery: { ...r.gallery, video } })}
          />
        </Card>
      </TabsContent>

      <TabsContent value="pricing">
        <Card
          title="Default floor plans"
          description="Per unit-type. Each apartment can override its own plan."
        >
          <PlansEditor
            plans={r.pricing.plans}
            onChange={(plans) => patch({ pricing: { ...r.pricing, plans } })}
          />
        </Card>
        <Card title="Apartments" className="mt-5">
          <UnitsEditor
            units={r.pricing.units}
            onChange={(units) => patch({ pricing: { ...r.pricing, units } })}
          />
        </Card>
      </TabsContent>

      <TabsContent value="location">
        <MarkerMapEditor value={r.location} onChange={(location) => patch({ location })} />
      </TabsContent>
    </Tabs>
  );
}
