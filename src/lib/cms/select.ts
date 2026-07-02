// ────────────────────────────────────────────────────────────────────────────
// Selectors: normalize stored content, look residences up, and build the copy
// objects the public components consume. There are two copy builders:
//   • siteCopy()      — shared agency chrome (header, about, contact, footer)
//   • residenceCopy() — one residence's section strings (identical keys for all)
// Keeping both here means the public template barely changes as the model grows.
// ────────────────────────────────────────────────────────────────────────────
import { DEFAULT_CONTENT } from "./defaults";
import type { Content, L, Lang, Labels, Residence } from "./types";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Deep-merge stored (partial / outdated) content over the defaults. Objects
 * recurse; arrays and primitives replace wholesale; `undefined` keeps the
 * default. Lets the model gain fields without breaking saved data.
 */
export function deepMerge<T>(base: T, override: unknown): T {
  if (override === undefined || override === null) return base;
  if (isPlainObject(base) && isPlainObject(override)) {
    const out: Record<string, unknown> = { ...base };
    for (const key of Object.keys(override)) {
      out[key] = deepMerge((base as Record<string, unknown>)[key], override[key]);
    }
    return out as T;
  }
  return override as T;
}

/** Normalize any stored content into a complete, render-safe Content object. */
export function mergeContent(stored: unknown): Content {
  const merged = deepMerge(DEFAULT_CONTENT, stored);
  // Guarantee a usable residences list + a valid primary selection.
  if (!Array.isArray(merged.residences) || merged.residences.length === 0) {
    merged.residences = DEFAULT_CONTENT.residences;
  }
  if (!merged.residences.some((r) => r.id === merged.primaryResidenceId)) {
    merged.primaryResidenceId = merged.residences[0]?.id ?? "";
  }
  return merged;
}

/** Pluck a language out of a bilingual string. */
export function tx(value: L | undefined, lang: Lang): string {
  if (!value) return "";
  return value[lang] ?? value.fr ?? "";
}

/** URL-safe slug from arbitrary text. */
export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")
      .slice(0, 60) || "residence"
  );
}

export function getPrimaryResidence(content: Content): Residence {
  return (
    content.residences.find((r) => r.id === content.primaryResidenceId) ?? content.residences[0]
  );
}

export function getResidenceBySlug(content: Content, slug: string): Residence | undefined {
  return content.residences.find((r) => r.slug === slug || r.id === slug);
}

/** Fixed in-page anchor ids for the homepage one-pager nav. */
export const NAV_IDS = ["projet", "galerie", "prix", "emplacement", "contact"] as const;

/** Shared agency chrome — used by header, menu, about, contact, footer, grid. */
export function siteCopy(content: Content, lang: Lang) {
  const T = (v: L | undefined) => tx(v, lang);
  return {
    dir: lang === "ar" ? "rtl" : "ltr",
    nav: content.header.nav.map((n) => T(n)),
    navIds: NAV_IDS,
    navLinks: content.header.navLinks ?? [],

    residencesTitle: T(content.labels.residencesTitle),
    viewResidence: T(content.labels.viewResidence),

    s7title: T(content.about.title),
    s7p: T(content.about.p),
    s7stats: content.about.stats.map((s) => [T(s.n), T(s.l)] as [string, string]),

    s8title: T(content.contact.title),

    contactForm: {
      name: T(content.forms.name),
      email: T(content.forms.email),
      phone: T(content.forms.phone),
      msg: T(content.forms.msg),
      consent: T(content.forms.consent),
      send: T(content.forms.send),
      sent: T(content.forms.sent),
    },
    panel: {
      title: T(content.forms.panelTitle),
      apt: T(content.forms.panelApt),
      send: T(content.forms.panelSend),
      sent: T(content.forms.sent),
    },

    hours: T(content.contact.hoursLabel),
    hoursV: content.contact.hours.map((h) => T(h)),
    quick: T(content.contact.quick),
    follow: T(content.contact.follow),
    contact: T(content.contact.contactLabel),
    designed: T(content.contact.designed),
    footerProjects: T(content.contact.footerProjects),
  };
}

/** One residence's section strings — identical key-shape for every residence. */
export function residenceCopy(residence: Residence, labels: Labels, lang: Lang) {
  const T = (v: L | undefined) => tx(v, lang);
  return {
    name: T(residence.name),
    locationLabel: T(residence.locationLabel),
    deliveryYear: residence.deliveryYear,
    unitType: T(residence.unitType),
    statusLabel: T(labels.status[residence.status]),
    status: residence.status,

    heroEyebrow: T(residence.hero.eyebrow),
    heroTitle: [T(residence.hero.title1), T(residence.hero.title2)] as [string, string],
    heroSub: T(residence.hero.sub),
    heroCta: T(residence.hero.cta),
    scroll: T(labels.scroll),

    s1eye: T(labels.introEye),
    s1title: T(residence.intro.title),
    s1p1: T(residence.intro.p1),
    s1p2: T(residence.intro.p2),

    bannerLine: T(residence.banner.line),
    bannerMeta: residence.banner.meta.map((m) => [T(m.k), T(m.v)] as [string, string]),

    s2title: T(residence.highlight.title),
    s2p: T(residence.highlight.p),
    s2feat: T(residence.highlight.feat),
    s2featP: T(residence.highlight.featP),
    s2pills: residence.highlight.pills.map((p) => [T(p.a), T(p.b)] as [string, string]),

    s3eye: T(labels.galleryEye),
    s3title: T(labels.galleryTitle),
    s3video: T(residence.gallery.video.label),
    s3videoSub: T(residence.gallery.video.sub),

    s4eye: T(labels.pricingEye),
    s4title: T(labels.pricingTitle),
    s4cols: labels.cols.map((c) => T(c)),
    viewPlan: T(labels.viewPlan),
    askInfo: T(labels.askInfo),

    s6eye: T(labels.locationEye),
    s6title: T(labels.locationTitle),
    s6p: T(residence.location.p),
    s6near: residence.location.near.map((n) => T(n)),
  };
}

export type SiteCopy = ReturnType<typeof siteCopy>;
export type ResidenceCopy = ReturnType<typeof residenceCopy>;
