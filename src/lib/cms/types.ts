// ────────────────────────────────────────────────────────────────────────────
// CMS data model.
//
// The site is organised around RESIDENCES. Every residence follows the exact
// same standardized structure (`Residence`) and is rendered with the same
// layout/template — on its own detail page (/residence/<slug>) and, for the
// designated primary residence, on the homepage. `primaryResidenceId` selects
// which residence leads when the domain root is accessed.
//
// Agency-level content (header/brand, about, contact, shared labels, form
// strings) is global and shared across every residence.
// ────────────────────────────────────────────────────────────────────────────

export type Lang = "fr" | "ar";

/** A bilingual string. The site is FR/AR, so every piece of copy carries both. */
export type L = { fr: string; ar: string };

export type KV = { k: L; v: L };
export type Pill = { a: L; b: L };
export type Stat = { n: L; l: L };

export const UNIT_TYPES = ["S+1", "S+2", "S+3", "S+4"] as const;
export type UnitType = (typeof UNIT_TYPES)[number];

/** One apartment / lot in a residence's price & plans table. */
export type Unit = {
  id: string;
  no: string;
  etage: string;
  type: UnitType;
  pieces: number;
  surface: number;
  terrasse: number;
  prix: number;
  /** Override floor-plan image (URL). Empty → falls back to the type plan. */
  plan?: string;
  status?: "available" | "reserved" | "sold";
};

export type GalleryImage = {
  id: string;
  url: string;
  /** Optional tailwind span classes for the masonry layout. */
  span?: string;
  alt?: string;
};

export type VideoContent = {
  label: L;
  sub: L;
  src: string;
  poster: string;
};

/** A custom map marker for a residence / point of interest. */
export type Marker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: "residence" | "beach" | "school" | "shop" | "transport" | "other";
};

// ── Residence (the standardized entity) ───────────────────────────────────────

export const RESIDENCE_STATUSES = ["on-sale", "coming-soon", "delivered", "sold-out"] as const;
export type ResidenceStatus = (typeof RESIDENCE_STATUSES)[number];

export type ResidenceHero = {
  eyebrow: L;
  title1: L;
  title2: L;
  sub: L;
  cta: L;
  imageDesktop: string;
  imageMobile: string;
};

export type ResidenceIntro = {
  title: L;
  p1: L;
  p2: L;
  image: string;
};

export type ResidenceBanner = {
  line: L;
  meta: KV[];
  image: string;
};

export type ResidenceHighlight = {
  title: L;
  p: L;
  feat: L;
  featP: L;
  pills: Pill[];
  image: string;
};

export type ResidenceGallery = {
  images: GalleryImage[];
  video: VideoContent;
};

export type ResidencePricing = {
  plans: Record<UnitType, string>;
  units: Unit[];
};

export type ResidenceLocation = {
  p: L;
  near: L[];
  center: { lat: number; lng: number };
  zoom: number;
  markers: Marker[];
};

/**
 * A residence — the single standardized content+layout unit of the site.
 * Every residence carries this exact shape, so the public template and the
 * admin editor work identically for all of them.
 */
export type Residence = {
  id: string;
  /** URL slug for /residence/<slug>. */
  slug: string;
  name: L;
  status: ResidenceStatus;
  locationLabel: L;
  deliveryYear: string;
  unitType: L;
  /** Cover image used on residence cards in the grid. */
  cardImage: string;
  hero: ResidenceHero;
  intro: ResidenceIntro;
  banner: ResidenceBanner;
  highlight: ResidenceHighlight;
  gallery: ResidenceGallery;
  pricing: ResidencePricing;
  location: ResidenceLocation;
};

// ── Shared agency-level content ────────────────────────────────────────────────

export type HeaderContent = {
  brand: string;
  brandAr: string;
  logo: string;
  email: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
  addressLine1: string;
  addressLine2: string;
  /** Overlay-menu link labels (FR/AR), indexed in step with `navLinks`. */
  nav: L[];
  /**
   * Optional explicit destination for each menu link, indexed in step with `nav`.
   * An empty string keeps the built-in default target for that slot (the matching
   * section on the primary residence / homepage). Accepts in-page anchors, internal
   * paths, or full external URLs (opened in a new tab).
   */
  navLinks: string[];
};

export type AboutContent = {
  title: L;
  p: L;
  stats: Stat[];
  image: string;
};

export type ContactContent = {
  title: L;
  hoursLabel: L;
  hours: L[];
  quick: L;
  follow: L;
  contactLabel: L;
  designed: L;
  footerProjects: L;
};

export type FormsContent = {
  name: L;
  email: L;
  phone: L;
  msg: L;
  consent: L;
  send: L;
  sent: L;
  panelTitle: L;
  panelApt: L;
  panelSend: L;
};

/** Standardized section labels — identical across every residence. */
export type Labels = {
  introEye: L;
  galleryEye: L;
  galleryTitle: L;
  pricingEye: L;
  pricingTitle: L;
  cols: L[];
  viewPlan: L;
  askInfo: L;
  locationEye: L;
  locationTitle: L;
  scroll: L;
  /** "Discover our residences" grid heading + the per-card CTA. */
  residencesTitle: L;
  viewResidence: L;
  /** Labels for the residence status pill. */
  status: Record<ResidenceStatus, L>;
};

// ── Leads ───────────────────────────────────────────────────────────────────

export type LeadStatus = "new" | "contacted" | "closed";
export type LeadSource = "contact" | "info-panel";

export type Lead = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  phone: string;
  apt?: string;
  /** Which residence the inquiry is about (slug), when known. */
  residence?: string;
  message?: string;
  source: LeadSource;
  status: LeadStatus;
  notes?: string;
  lang?: Lang;
};

// ── Whole site ──────────────────────────────────────────────────────────────

export type Content = {
  version: number;
  updatedAt: string;
  header: HeaderContent;
  /** id of the residence shown first on the homepage (the domain root). */
  primaryResidenceId: string;
  residences: Residence[];
  labels: Labels;
  about: AboutContent;
  contact: ContactContent;
  forms: FormsContent;
};

/** Keys of the top-level editable sections (used for partial updates). */
export type SectionKey = Exclude<keyof Content, "version" | "updatedAt">;

// ── Analytics ─────────────────────────────────────────────────────────────────

export type TrackType = "home" | "residence";

/** Aggregated visitor analytics (stored separately from content). */
export type Analytics = {
  /** All tracked page views (home + residences). */
  totalViews: number;
  /** Distinct visitors (counted once when their visitor cookie is first minted). */
  uniqueVisitors: number;
  homeViews: number;
  /** Views per residence, keyed by slug. */
  residenceViews: Record<string, number>;
  /** Total views per day, "YYYY-MM-DD" → count (kept ~60 days). */
  daily: Record<string, number>;
  startedAt: string;
  updatedAt: string;
};
