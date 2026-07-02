import { useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";

import { LeafletMap } from "@/components/admin/leaflet-map";
import type { Residence, Unit } from "@/lib/cms/types";
import { UNIT_TYPES } from "@/lib/cms/types";
import { residenceCopy, type ResidenceCopy } from "@/lib/cms/select";
import { useSite } from "./shell";

import heroDesktop from "@/assets/hero-desktop.webp";
import exteriorImg from "@/assets/exterior.jpg";

/** Build the per-residence copy from the active language + shared labels. */
function useResidenceCopy(residence: Residence): ResidenceCopy {
  const { content, lang } = useSite();
  return useMemo(
    () => residenceCopy(residence, content.labels, lang),
    [residence, content.labels, lang],
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function ResidenceHero({
  residence,
  rt,
  cta,
}: {
  residence: Residence;
  rt: ResidenceCopy;
  cta: React.ReactNode;
}) {
  return (
    <section id="top" className="relative h-[100svh] min-h-[640px] w-full overflow-hidden">
      <div className="hero-frame absolute inset-0 overflow-hidden bg-[#1c1813]">
        <picture>
          <source
            media="(max-width: 767px)"
            srcSet={residence.hero.imageMobile || residence.hero.imageDesktop || heroDesktop}
          />
          <img
            src={residence.hero.imageDesktop || heroDesktop}
            alt={rt.name}
            className="hero-pan absolute inset-0 h-full w-full object-cover"
            fetchPriority="high"
          />
        </picture>
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 30%, transparent 45%, rgba(28,24,19,0.18) 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(247,245,241,0) 0%, rgba(247,245,241,0.15) 55%, rgba(247,245,241,0.85) 100%)",
        }}
      />
      {(
        [
          "top-6 left-6 border-t border-l",
          "top-6 right-6 border-t border-r",
          "bottom-32 left-6 border-b border-l",
          "bottom-32 right-6 border-b border-r",
        ] as const
      ).map((cls, i) => (
        <span
          key={i}
          aria-hidden
          className={`absolute h-6 w-6 ${cls}`}
          style={{ borderColor: "color-mix(in oklab, var(--gold) 65%, transparent)" }}
        />
      ))}
      <div className="relative mx-auto flex h-full max-w-[1440px] flex-col justify-end px-5 pb-28 sm:px-8 sm:pb-36">
        <div className="max-w-3xl">
          <div className="eyebrow reveal in flex items-center gap-3">
            <span className="inline-block h-px w-10" style={{ background: "var(--gold)" }} />
            {rt.heroEyebrow}
          </div>
          <h1 className="mt-5 font-display text-[clamp(3.25rem,9vw,7.75rem)] leading-[1] tracking-tight text-ink">
            <span className="block overflow-hidden">
              <span className="block" style={{ animation: "lov-reveal .9s .15s ease both" }}>
                {rt.heroTitle[0]}
              </span>
            </span>
            {rt.heroTitle[1] && (
              <span className="block overflow-hidden gold-text">
                <span className="block" style={{ animation: "lov-reveal .9s .35s ease both" }}>
                  {rt.heroTitle[1]}
                </span>
              </span>
            )}
          </h1>
          <p className="reveal mt-5 max-w-md text-lg text-ink/75 sm:text-xl">{rt.heroSub}</p>
          <div className="reveal mt-9 flex flex-wrap items-center gap-4">{cta}</div>
        </div>
      </div>
      <div className="mono absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.4em] text-stone">
        SCROLL
      </div>
    </section>
  );
}

// ── Intro ─────────────────────────────────────────────────────────────────────
function ResidenceIntro({
  residence,
  rt,
  extraCta,
}: {
  residence: Residence;
  rt: ResidenceCopy;
  extraCta?: React.ReactNode;
}) {
  return (
    <section id="projet" className="bg-paper py-24 sm:py-32 lg:py-40">
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:gap-20">
        <div className="reveal">
          <div className="eyebrow">{rt.s1eye}</div>
          <h2 className="mt-5 font-display text-[clamp(2.65rem,5.8vw,4.75rem)] leading-[1.05]">
            {rt.s1title}
          </h2>
          <div className="mt-6 hairline w-24" />
          {rt.s1p1 && <p className="mt-8 max-w-prose text-ink/80">{rt.s1p1}</p>}
          {rt.s1p2 && <p className="mt-5 max-w-prose text-ink/80">{rt.s1p2}</p>}
          {extraCta && <div className="mt-10 flex flex-wrap items-center gap-6">{extraCta}</div>}
        </div>
        <div className="clip-reveal">
          <figure
            className="group relative overflow-hidden rounded-[1.4rem] border shadow-[0_44px_90px_-42px_rgba(28,24,19,.62)]"
            style={{ borderColor: "color-mix(in oklab, var(--gold) 32%, transparent)" }}
          >
            <div className="aspect-[4/5] w-full">
              <LeafletMap
                className="site-map h-full w-full"
                center={residence.location.center}
                zoom={residence.location.zoom}
                markers={residence.location.markers}
              />
            </div>

            {/* Hairline gold inner ring for a crisp, framed edge.
             * z-[1000] keeps these overlays above Leaflet's panes (tiles 200,
             * markers 600, controls 800), which would otherwise cover them. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 z-[1000] rounded-[1.4rem]"
              style={{
                boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--gold) 22%, transparent)",
              }}
            />

            {/* Coordinate readout — top corner */}
            <span className="mono pointer-events-none absolute end-4 top-4 z-[1000] rounded-full border border-white/15 bg-ink/40 px-3 py-1.5 text-[9px] tracking-[0.16em] text-paper/85 backdrop-blur-md">
              {residence.location.center.lat.toFixed(3)}°N ·{" "}
              {residence.location.center.lng.toFixed(3)}°E
            </span>

            {/* Soft scrim (below markers so pins stay crisp) + location label */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 z-[500] h-28 bg-gradient-to-t from-ink/55 via-ink/10 to-transparent"
            />
            <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 z-[1000] flex items-center gap-2.5 p-4 sm:p-5">
              <span className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-ink/40 px-4 py-2 backdrop-blur-md">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: "var(--gold)" }}
                />
                <span className="mono text-[10px] uppercase tracking-[0.24em] text-paper">
                  {rt.locationLabel}
                </span>
              </span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

// ── Banner ────────────────────────────────────────────────────────────────────
function ResidenceBanner({ residence, rt }: { residence: Residence; rt: ResidenceCopy }) {
  return (
    <section className="relative h-[60vh] min-h-[440px] w-full overflow-hidden">
      <img
        src={residence.banner.image || exteriorImg}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(247,245,241,.55), rgba(247,245,241,.15) 40%, rgba(247,245,241,.85))",
        }}
      />
      <div className="relative mx-auto flex h-full max-w-[1280px] flex-col items-center justify-center px-5 text-center">
        <h2 className="reveal font-display text-[clamp(2.1rem,5.2vw,4.15rem)] leading-tight text-ink">
          {rt.bannerLine}
        </h2>
        <div className="mono reveal mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[11px] uppercase tracking-[0.25em] text-stone">
          {rt.bannerMeta.map(([k, v], i) => (
            <span key={i} className="flex items-center gap-3">
              <span className="text-stone/70">{k}</span>
              <span className="text-ink">· {v}</span>
              {i < rt.bannerMeta.length - 1 && (
                <span className="inline-block h-3 w-px bg-stone/40" />
              )}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Gallery + video ────────────────────────────────────────────────────────────
function ResidenceGallery({ residence, rt }: { residence: Residence; rt: ResidenceCopy }) {
  const { openLightbox } = useSite();
  const items = residence.gallery.images;
  if (!items.length && !residence.gallery.video.src) return null;
  return (
    <section id="galerie" className="bg-paper py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
        <div className="reveal mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="eyebrow">{rt.s3eye}</div>
            <h2 className="mt-4 font-display text-[clamp(2.65rem,5.8vw,4.75rem)] leading-[1.05]">
              {rt.s3title}
            </h2>
          </div>
          <div className="hairline w-40" />
        </div>
        {items.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {items.map((img, i) => (
              <button
                key={img.id}
                onClick={() => openLightbox(img.url)}
                className={`tile-reveal group relative aspect-square overflow-hidden ${img.span ?? ""}`}
                style={{ transitionDelay: `${i * 90}ms` }}
              >
                <img
                  src={img.url}
                  alt={img.alt ?? ""}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-[900ms] ease-out group-hover:scale-[1.06]"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 grid place-items-center"
                >
                  <span className="grid h-12 w-12 scale-75 place-items-center rounded-full border border-white/70 text-white opacity-0 backdrop-blur-sm transition duration-500 group-hover:scale-100 group-hover:opacity-100">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    >
                      <path d="M21 21l-4.2-4.2M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM11 8.5v5M8.5 11h5" />
                    </svg>
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
        {residence.gallery.video.src && <VideoShowcase residence={residence} rt={rt} />}
      </div>
    </section>
  );
}

function VideoShowcase({ residence, rt }: { residence: Residence; rt: ResidenceCopy }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const start = () => ref.current?.play().catch(() => {});
  return (
    <div className="zoom-reveal mx-auto mt-20 max-w-4xl text-center sm:mt-28">
      <div className="eyebrow text-center">{rt.s3video}</div>
      {rt.s3videoSub && (
        <p className="mx-auto mt-3 max-w-md text-sm text-ink/70">{rt.s3videoSub}</p>
      )}
      <div className="hairline mx-auto mt-6 w-16" />
      <div
        className="group relative mt-8 overflow-hidden rounded-[1.25rem] border shadow-[0_40px_80px_-32px_rgba(28,24,19,.5)]"
        style={{ borderColor: "color-mix(in oklab, var(--gold) 35%, transparent)" }}
      >
        <video
          ref={ref}
          className="aspect-video w-full bg-ink object-cover"
          poster={residence.gallery.video.poster || exteriorImg}
          playsInline
          preload="none"
          controls={playing}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        >
          <source src={residence.gallery.video.src} type="video/mp4" />
        </video>
        {!playing && (
          <button
            onClick={start}
            aria-label={rt.s3video}
            className="absolute inset-0 grid place-items-center bg-ink/25 transition duration-500 group-hover:bg-ink/15"
          >
            <span className="relative grid h-20 w-20 place-items-center">
              <span
                aria-hidden
                className="play-pulse absolute inset-0 rounded-full"
                style={{ background: "var(--gradient-gold)" }}
              />
              <span
                className="relative grid h-20 w-20 place-items-center rounded-full shadow-[0_14px_34px_-10px_rgba(185,116,47,.8)] transition duration-500 group-hover:scale-105"
                style={{ background: "var(--gradient-gold)" }}
              >
                <svg viewBox="0 0 24 24" className="ms-1 h-8 w-8 text-ink" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Prices & plans ─────────────────────────────────────────────────────────────
const STATUS_DOT: Record<string, string> = { reserved: "#D49A52", sold: "#B4452F" };

function ResidencePrix({ residence, rt }: { residence: Residence; rt: ResidenceCopy }) {
  const { openLightbox, openInfo } = useSite();
  const units = residence.pricing.units;
  const groups = useMemo(() => UNIT_TYPES.filter((g) => units.some((u) => u.type === g)), [units]);
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    groups.length ? { [groups[0]]: true } : {},
  );
  const planFor = (u: Unit) => u.plan || residence.pricing.plans[u.type] || "";
  if (!units.length) return null;

  return (
    <section id="prix" className="bg-sand py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
        <div className="reveal mb-12">
          <div className="eyebrow">{rt.s4eye}</div>
          <h2 className="mt-4 font-display text-[clamp(2.65rem,5.8vw,4.75rem)] leading-[1.05]">
            {rt.s4title}
          </h2>
          <div className="hairline mt-6 w-24" />
        </div>
        <div className="space-y-4">
          {groups.map((g) => {
            const grpUnits = units.filter((u) => u.type === g);
            const isOpen = open[g];
            return (
              <div
                key={g}
                className="overflow-hidden rounded-2xl border bg-paper"
                style={{ borderColor: "color-mix(in oklab, var(--gold) 35%, transparent)" }}
              >
                <button
                  onClick={() => setOpen((o) => ({ ...o, [g]: !o[g] }))}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-start"
                >
                  <div className="flex items-center gap-5">
                    <span className="mono text-xs tracking-[0.2em] text-stone">TYPE</span>
                    <span className="font-display text-2xl">{g}</span>
                    <span className="mono text-xs text-stone">· {grpUnits.length} unités</span>
                  </div>
                  <span
                    aria-hidden
                    className="grid h-8 w-8 place-items-center rounded-full"
                    style={{ background: "var(--gradient-gold)" }}
                  >
                    <span className="text-ink">{isOpen ? "−" : "+"}</span>
                  </span>
                </button>
                {isOpen && (
                  <div
                    className="border-t"
                    style={{ borderColor: "color-mix(in oklab, var(--gold) 25%, transparent)" }}
                  >
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="mono text-[10px] uppercase tracking-[0.18em] text-stone">
                            {rt.s4cols.map((c, i) => (
                              <th key={i} className="bg-sand px-4 py-3 text-start font-normal">
                                {c}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {grpUnits.map((u, i) => (
                            <tr
                              key={u.id}
                              className={
                                "group transition hover:bg-[color-mix(in_oklab,var(--gold-lt)_18%,transparent)] " +
                                (i % 2
                                  ? "bg-paper"
                                  : "bg-[color-mix(in_oklab,var(--sand)_40%,var(--paper))]")
                              }
                            >
                              <td className="mono px-4 py-4 text-ink">
                                {u.status && STATUS_DOT[u.status] && (
                                  <span
                                    className="me-2 inline-block h-2 w-2 rounded-full align-middle"
                                    style={{ background: STATUS_DOT[u.status] }}
                                    title={u.status}
                                  />
                                )}
                                {u.no}
                              </td>
                              <td className="px-4 py-4 text-ink/80">{u.etage}</td>
                              <td className="px-4 py-4 text-ink/80">{u.type}</td>
                              <td className="mono px-4 py-4 text-ink/80">{u.pieces}</td>
                              <td className="mono px-4 py-4 text-ink">{u.surface} m²</td>
                              <td className="mono px-4 py-4 text-ink/80">{u.terrasse} m²</td>
                              <td className="px-4 py-4">
                                {planFor(u) && (
                                  <button
                                    onClick={() => openLightbox(planFor(u))}
                                    className="mono rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-ink transition hover:bg-paper"
                                    style={{ borderColor: "var(--gold)" }}
                                  >
                                    {rt.viewPlan}
                                  </button>
                                )}
                              </td>
                              <td className="px-4 py-4">
                                <button
                                  onClick={() => openInfo(u.no, residence.slug)}
                                  className="gold-fill mono inline-flex rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.18em]"
                                >
                                  {rt.askInfo}
                                </button>
                              </td>
                              <td className="mono px-4 py-4 text-end font-medium text-ink">
                                {u.prix.toLocaleString("fr-FR")} DT
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="space-y-3 p-4 md:hidden">
                      {grpUnits.map((u) => (
                        <div
                          key={u.id}
                          className="rounded-xl border bg-paper p-4"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <div className="flex items-baseline justify-between">
                            <div className="mono text-sm text-ink">{u.no}</div>
                            <div className="mono text-base font-medium text-ink">
                              {u.prix.toLocaleString("fr-FR")} DT
                            </div>
                          </div>
                          <dl className="mono mt-3 grid grid-cols-2 gap-y-2 text-xs">
                            {[
                              [rt.s4cols[1], u.etage],
                              [rt.s4cols[2], u.type],
                              [rt.s4cols[3], u.pieces],
                              [rt.s4cols[4], `${u.surface} m²`],
                              [rt.s4cols[5], `${u.terrasse} m²`],
                            ].map(([k, v], i) => (
                              <div key={i} className="flex justify-between gap-2 pe-3">
                                <dt className="text-stone">{k}</dt>
                                <dd className="text-ink">{v}</dd>
                              </div>
                            ))}
                          </dl>
                          <div className="mt-4 flex gap-2">
                            {planFor(u) && (
                              <button
                                onClick={() => openLightbox(planFor(u))}
                                className="mono flex-1 rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.18em]"
                                style={{ borderColor: "var(--gold)" }}
                              >
                                {rt.viewPlan}
                              </button>
                            )}
                            <button
                              onClick={() => openInfo(u.no, residence.slug)}
                              className="gold-fill mono flex-1 rounded-full px-3 py-2 text-[10px] uppercase tracking-[0.18em]"
                            >
                              {rt.askInfo}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Composed views ─────────────────────────────────────────────────────────────

/** Full standardized residence template — used on the /residence/<slug> page. */
export function ResidenceView({ residence }: { residence: Residence }) {
  const rt = useResidenceCopy(residence);
  const cta = (
    <>
      <a
        href="#prix"
        className="gold-fill mono inline-flex items-center gap-3 rounded-full px-7 py-3.5 text-xs uppercase tracking-[0.2em] shadow-[0_12px_30px_-12px_rgba(185,116,47,.55)] transition hover:-translate-y-0.5"
      >
        {rt.heroCta}
        <span aria-hidden>→</span>
      </a>
      <a
        href="#galerie"
        className="mono inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-ink/70 transition hover:text-gold"
      >
        {rt.scroll} ↓
      </a>
    </>
  );
  return (
    <>
      <ResidenceHero residence={residence} rt={rt} cta={cta} />
      <ResidenceIntro residence={residence} rt={rt} />
      <ResidencePrix residence={residence} rt={rt} />
      <ResidenceBanner residence={residence} rt={rt} />
      <ResidenceGallery residence={residence} rt={rt} />
    </>
  );
}

/** Homepage feature for the primary residence — hero + intro (with map) + prix,
 * then a clear path into the full standardized detail page. */
export function FeaturedResidence({ residence }: { residence: Residence }) {
  const rt = useResidenceCopy(residence);
  const { st } = useSite();
  const toDetail = (
    <Link
      to="/residence/$slug"
      params={{ slug: residence.slug }}
      className="gold-fill mono inline-flex items-center gap-3 rounded-full px-7 py-3.5 text-xs uppercase tracking-[0.2em] shadow-[0_12px_30px_-12px_rgba(185,116,47,.55)] transition hover:-translate-y-0.5"
    >
      {st.viewResidence}
      <span aria-hidden>→</span>
    </Link>
  );
  const heroCta = (
    <>
      {toDetail}
      <a
        href="#projet"
        className="mono inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-ink/70 transition hover:text-gold"
      >
        {rt.scroll} ↓
      </a>
    </>
  );
  return (
    <>
      <ResidenceHero residence={residence} rt={rt} cta={heroCta} />
      <ResidenceIntro residence={residence} rt={rt} extraCta={toDetail} />
      <ResidencePrix residence={residence} rt={rt} />
    </>
  );
}
