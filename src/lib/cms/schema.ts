// ────────────────────────────────────────────────────────────────────────────
// Zod schemas mirroring the CMS content model (types.ts). Used to validate admin
// saves server-side so a malformed payload can't corrupt the store. Object
// schemas use `.passthrough()` so forward-compatible fields aren't rejected; the
// goal is to catch gross shape/type corruption, not to be pedantic. mergeContent
// still normalizes/fills afterward.
// ────────────────────────────────────────────────────────────────────────────
import { z } from "zod";

import { RESIDENCE_STATUSES, UNIT_TYPES } from "./types";
import type { Content, SectionKey } from "./types";

const L = z.object({ fr: z.string(), ar: z.string() }).passthrough();
const KV = z.object({ k: L, v: L }).passthrough();
const Pill = z.object({ a: L, b: L }).passthrough();
const Stat = z.object({ n: L, l: L }).passthrough();

const Unit = z
  .object({
    id: z.string(),
    no: z.string(),
    etage: z.string(),
    type: z.enum(UNIT_TYPES),
    pieces: z.number(),
    surface: z.number(),
    terrasse: z.number(),
    prix: z.number(),
    plan: z.string().optional(),
    status: z.enum(["available", "reserved", "sold"]).optional(),
  })
  .passthrough();

const GalleryImage = z
  .object({
    id: z.string(),
    url: z.string(),
    span: z.string().optional(),
    alt: z.string().optional(),
  })
  .passthrough();

const VideoContent = z
  .object({ label: L, sub: L, src: z.string(), poster: z.string() })
  .passthrough();

const Marker = z
  .object({
    id: z.string(),
    name: z.string(),
    lat: z.number(),
    lng: z.number(),
    kind: z.enum(["residence", "beach", "school", "shop", "transport", "other"]),
  })
  .passthrough();

const Residence = z
  .object({
    id: z.string(),
    slug: z.string(),
    name: L,
    status: z.enum(RESIDENCE_STATUSES),
    locationLabel: L,
    deliveryYear: z.string(),
    unitType: L,
    cardImage: z.string(),
    hero: z
      .object({
        eyebrow: L,
        title1: L,
        title2: L,
        sub: L,
        cta: L,
        imageDesktop: z.string(),
        imageMobile: z.string(),
      })
      .passthrough(),
    intro: z.object({ title: L, p1: L, p2: L, image: z.string() }).passthrough(),
    banner: z.object({ line: L, meta: z.array(KV), image: z.string() }).passthrough(),
    highlight: z
      .object({ title: L, p: L, feat: L, featP: L, pills: z.array(Pill), image: z.string() })
      .passthrough(),
    gallery: z.object({ images: z.array(GalleryImage), video: VideoContent }).passthrough(),
    pricing: z
      .object({ plans: z.record(z.string(), z.string()), units: z.array(Unit) })
      .passthrough(),
    location: z
      .object({
        p: L,
        near: z.array(L),
        center: z.object({ lat: z.number(), lng: z.number() }).passthrough(),
        zoom: z.number(),
        markers: z.array(Marker),
      })
      .passthrough(),
  })
  .passthrough();

const HeaderContent = z
  .object({
    brand: z.string(),
    brandAr: z.string(),
    logo: z.string(),
    email: z.string(),
    phone: z.string(),
    whatsapp: z.string(),
    instagram: z.string(),
    facebook: z.string(),
    addressLine1: z.string(),
    addressLine2: z.string(),
    nav: z.array(L),
    navLinks: z.array(z.string()),
  })
  .passthrough();

const AboutContent = z
  .object({ title: L, p: L, stats: z.array(Stat), image: z.string() })
  .passthrough();

const ContactContent = z
  .object({
    title: L,
    hoursLabel: L,
    hours: z.array(L),
    quick: L,
    follow: L,
    contactLabel: L,
    designed: L,
    footerProjects: L,
  })
  .passthrough();

const FormsContent = z
  .object({
    name: L,
    email: L,
    phone: L,
    msg: L,
    consent: L,
    send: L,
    sent: L,
    panelTitle: L,
    panelApt: L,
    panelSend: L,
  })
  .passthrough();

const Labels = z
  .object({
    introEye: L,
    galleryEye: L,
    galleryTitle: L,
    pricingEye: L,
    pricingTitle: L,
    cols: z.array(L),
    viewPlan: L,
    askInfo: L,
    locationEye: L,
    locationTitle: L,
    scroll: L,
    residencesTitle: L,
    viewResidence: L,
    status: z.record(z.string(), L),
  })
  .passthrough();

/** Per-top-level-section schemas (the `value` shape for saveSection). */
export const sectionSchemas = {
  header: HeaderContent,
  primaryResidenceId: z.string(),
  residences: z.array(Residence),
  labels: Labels,
  about: AboutContent,
  contact: ContactContent,
  forms: FormsContent,
} satisfies Record<SectionKey, z.ZodTypeAny>;

/** Full content schema (version/updatedAt are managed server-side, kept lenient). */
export const contentSchema = z
  .object({
    version: z.number().optional(),
    updatedAt: z.string().optional(),
    header: HeaderContent,
    primaryResidenceId: z.string(),
    residences: z.array(Residence),
    labels: Labels,
    about: AboutContent,
    contact: ContactContent,
    forms: FormsContent,
  })
  .passthrough();

/** Validate a single section's value; throws a clear error on a bad shape. */
export function validateSection(section: SectionKey, value: unknown): unknown {
  const schema = sectionSchemas[section];
  if (!schema) throw new Error(`Unknown content section: ${String(section)}`);
  return schema.parse(value);
}

/** Validate a full content payload. */
export function validateContent(value: unknown): Content {
  return contentSchema.parse(value) as Content;
}
