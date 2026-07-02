import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Toaster } from "@/components/ui/sonner";
import type { Content, Lang, Residence } from "@/lib/cms/types";
import { getPrimaryResidence, siteCopy, type SiteCopy } from "@/lib/cms/select";
import { createLeadFn, trackViewFn } from "@/lib/cms/api";
import type { TrackType } from "@/lib/cms/types";

import logoImg from "@/assets/logo-sakaneom.webp";
import aerialImg from "@/assets/aerial.jpg";
import interiorImg from "@/assets/interior.jpg";
import { IconFacebook, IconInstagram, IconMail, IconPhone, IconPin, IconWhatsApp } from "./icons";

// ── Context ───────────────────────────────────────────────────────────────────

type InfoTarget = { apt: string; residence?: string } | null;

type SiteCtx = {
  content: Content;
  lang: Lang;
  setLang: (l: Lang) => void;
  st: SiteCopy;
  openLightbox: (url: string) => void;
  openInfo: (apt: string, residence?: string) => void;
  contact: ReturnType<typeof buildContact>;
};

const Ctx = createContext<SiteCtx>(null as never);
export const useSite = () => useContext(Ctx);

function buildContact(content: Content) {
  const h = content.header;
  const digits = (h.phone || "").replace(/[^\d+]/g, "");
  return {
    phone: h.phone,
    tel: `tel:${digits}`,
    email: h.email,
    whatsapp: h.whatsapp,
    instagram: h.instagram,
    facebook: h.facebook,
    address1: h.addressLine1,
    address2: h.addressLine2,
  };
}

/**
 * Records a page view once per browser session per target (so refreshes don't
 * inflate counts). Client-only; failures are silent (analytics must never break
 * the page).
 */
export function useTrackView(type: TrackType, slug?: string) {
  useEffect(() => {
    if (type === "residence" && !slug) return;
    const key = `sk_seen_${type}_${slug ?? ""}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* sessionStorage unavailable — track anyway */
    }
    trackViewFn({ data: { type, slug } }).catch(() => {});
  }, [type, slug]);
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(
      ".reveal, .clip-reveal, .tile-reveal, .zoom-reveal",
    );
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.15 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/**
 * Wraps a page with the shared site chrome (header, menu, footer, floats,
 * lightbox, info panel) and provides the site context. Page-specific content is
 * passed as children.
 */
export function SiteShell({ content, children }: { content: Content; children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("fr");
  const st = useMemo(() => siteCopy(content, lang), [content, lang]);
  const contact = useMemo(() => buildContact(content), [content]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [info, setInfo] = useState<InfoTarget>(null);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = st.dir;
  }, [lang, st.dir]);

  useEffect(() => {
    const on = () => {
      setScrolled(window.scrollY > window.innerHeight * 0.6);
      setShowTop(window.scrollY > window.innerHeight);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  // Close the image lightbox / overlay menu with Escape (keyboard accessibility).
  useEffect(() => {
    if (!lightbox && !menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setLightbox(null);
      setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, menuOpen]);

  useReveal();

  const value: SiteCtx = {
    content,
    lang,
    setLang,
    st,
    contact,
    openLightbox: setLightbox,
    openInfo: (apt, residence) => setInfo({ apt, residence }),
  };

  return (
    <Ctx.Provider value={value}>
      <div
        className="min-h-screen bg-paper text-ink"
        style={{ fontFamily: lang === "ar" ? "Tajawal, sans-serif" : "Inter, sans-serif" }}
      >
        <Header scrolled={scrolled} menuOpen={menuOpen} onMenu={() => setMenuOpen(true)} />
        <OverlayMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

        {children}

        <Footer />

        <ContactFloat />
        {showTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Top"
            className="fixed bottom-24 z-40 grid h-11 w-11 place-items-center rounded-full border bg-paper text-ink shadow-[0_10px_30px_-12px_rgba(28,24,19,.2)] transition hover:-translate-y-0.5"
            style={{ borderColor: "var(--gold)", insetInlineEnd: 26 }}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        )}

        {lightbox && (
          <div
            className="fixed inset-0 z-[60] grid place-items-center bg-ink/85 p-6"
            onClick={() => setLightbox(null)}
          >
            <img src={lightbox} alt="" className="max-h-[88vh] max-w-[92vw] object-contain" />
          </div>
        )}

        <InfoPanel target={info} onClose={() => setInfo(null)} />
        <Toaster richColors position="bottom-center" />
      </div>
    </Ctx.Provider>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

export function SocialLinks({
  variant = "ring",
  className = "",
}: {
  variant?: "ring" | "bare";
  className?: string;
}) {
  const { contact } = useSite();
  const socials = [
    { label: "Instagram", href: contact.instagram, Icon: IconInstagram },
    { label: "Facebook", href: contact.facebook, Icon: IconFacebook },
    { label: "WhatsApp", href: contact.whatsapp, Icon: IconWhatsApp },
  ].filter((s) => s.href);
  return (
    <div className={"flex items-center gap-3 " + className}>
      {socials.map(({ label, href, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={label}
          className={
            variant === "ring"
              ? "grid h-10 w-10 place-items-center rounded-full border text-ink/75 transition hover:-translate-y-0.5 hover:border-[color:var(--gold)] hover:text-gold"
              : "text-ink/70 transition hover:-translate-y-0.5 hover:text-gold"
          }
          style={variant === "ring" ? { borderColor: "var(--border)" } : undefined}
        >
          <Icon className="h-4 w-4" />
        </a>
      ))}
    </div>
  );
}

function Wordmark() {
  const { content, lang } = useSite();
  return (
    <div className="group flex items-center gap-3 sm:gap-4">
      <img
        src={content.header.logo || logoImg}
        alt=""
        className="relative h-14 w-auto drop-shadow-[0_6px_14px_rgba(185,116,47,0.25)] transition duration-500 ease-out group-hover:scale-105 group-hover:drop-shadow-[0_10px_24px_rgba(185,116,47,0.45)] sm:h-16 lg:h-[72px]"
      />
      <div className="leading-none">
        <div
          style={{
            fontFamily: "Marcellus, serif",
            letterSpacing: "0.34em",
            fontSize: "clamp(19px,2.7vw,26px)",
          }}
          className="gold-text"
        >
          {content.header.brand}
        </div>
        <div
          style={{
            fontFamily: "'Reem Kufi', sans-serif",
            letterSpacing: "0.12em",
            fontSize: "clamp(12px,1.6vw,15px)",
            marginTop: 4,
          }}
          className="text-stone"
        >
          {content.header.brandAr}
        </div>
      </div>
      <span className="sr-only">
        {lang === "fr" ? content.header.brand : content.header.brandAr}
      </span>
    </div>
  );
}

export function CornerFrame({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={"relative " + className}>
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-2 -left-2 h-5 w-5 border-t border-l"
        style={{ borderColor: "var(--gold)" }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -top-2 -right-2 h-5 w-5 border-t border-r"
        style={{ borderColor: "var(--gold)" }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-2 -left-2 h-5 w-5 border-b border-l"
        style={{ borderColor: "var(--gold)" }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-2 -right-2 h-5 w-5 border-b border-r"
        style={{ borderColor: "var(--gold)" }}
      />
    </div>
  );
}

function LangToggle() {
  const { lang, setLang } = useSite();
  return (
    <div className="mono flex items-center gap-1 text-xs">
      <button
        onClick={() => setLang("fr")}
        className={
          "px-2 py-1 transition " + (lang === "fr" ? "text-ink" : "text-ink/40 hover:text-ink")
        }
      >
        FR
      </button>
      <span className="text-ink/30">/</span>
      <button
        onClick={() => setLang("ar")}
        className={
          "px-2 py-1 transition " + (lang === "ar" ? "text-ink" : "text-ink/40 hover:text-ink")
        }
      >
        AR
      </button>
    </div>
  );
}

function Header({
  scrolled,
  menuOpen,
  onMenu,
}: {
  scrolled: boolean;
  menuOpen: boolean;
  onMenu: () => void;
}) {
  const { contact, lang } = useSite();
  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-all"
      style={{
        backgroundColor: scrolled
          ? "color-mix(in oklab, var(--paper) 80%, transparent)"
          : "transparent",
        backdropFilter: scrolled ? "blur(14px) saturate(140%)" : "none",
        borderBottom: scrolled
          ? "1px solid color-mix(in oklab, var(--gold) 35%, transparent)"
          : "1px solid transparent",
      }}
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:py-5">
        <Link to="/" className="shrink-0">
          <Wordmark />
        </Link>
        <div className="hidden items-center gap-6 lg:flex">
          <a
            href={`mailto:${contact.email}`}
            className="text-sm text-ink/70 transition hover:text-gold"
          >
            {contact.email}
          </a>
          <a href={contact.tel} className="mono text-sm text-ink/70 transition hover:text-gold">
            {contact.phone}
          </a>
          <div className="h-4 w-px bg-ink/15" />
          <SocialLinks variant="bare" />
          <div className="h-4 w-px bg-ink/15" />
          <LangToggle />
        </div>
        <MenuButton open={menuOpen} onClick={onMenu} label={lang === "ar" ? "القائمة" : "Menu"} />
      </div>
    </header>
  );
}

// Elegant animated menu trigger — refined gold-accented bars that react on hover
function MenuButton({
  open,
  onClick,
  label,
}: {
  open: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-expanded={open}
      aria-haspopup="dialog"
      className="menu-trigger group relative grid h-12 w-12 shrink-0 place-items-center rounded-full transition-transform duration-300 ease-out hover:scale-[1.05] active:scale-95"
    >
      {/* gold ring */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full border transition-colors duration-300 group-hover:border-[color:var(--gold)]"
        style={{ borderColor: "color-mix(in oklab, var(--gold) 45%, transparent)" }}
      />
      {/* soft gold wash on hover */}
      <span
        aria-hidden
        className="absolute inset-[3px] rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: "color-mix(in oklab, var(--gold) 16%, transparent)" }}
      />
      {/* three refined bars — middle one extends, all shift to gold on hover */}
      <span aria-hidden className="relative flex h-3 w-[22px] flex-col justify-between">
        <span className="h-px w-full bg-ink transition-all duration-300 ease-out group-hover:bg-gold" />
        <span className="ms-auto h-px w-3/5 bg-ink transition-all duration-300 ease-out group-hover:w-full group-hover:bg-gold" />
        <span className="h-px w-full bg-ink transition-all duration-300 ease-out group-hover:bg-gold" />
      </span>
    </button>
  );
}

function OverlayMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { st, contact, content, lang } = useSite();

  // Lock body scroll + close on Escape while the panel is open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // The flagship sections (gallery/prices/location) live on the primary
  // residence's detail page; "Le projet" and "Contact" target the homepage.
  const primary = getPrimaryResidence(content);
  const defaultHref = (id: string) =>
    id === "projet"
      ? "/#projet"
      : id === "contact"
        ? "/#contact"
        : `/residence/${primary.slug}#${id}`;
  // Editors can override any slot in the admin; an empty override keeps the default.
  const linkFor = (i: number) => st.navLinks[i]?.trim() || defaultHref(st.navIds[i]);
  const isExternal = (h: string) => /^https?:\/\//i.test(h);

  const stagger = (i: number) => ({ transitionDelay: open ? `${140 + i * 60}ms` : "0ms" });

  return (
    <div
      className="menu-overlay fixed inset-0 z-[60]"
      data-open={open}
      aria-hidden={!open}
      role="dialog"
      aria-modal="true"
    >
      {/* backdrop */}
      <div
        className="menu-backdrop absolute inset-0 bg-ink/45 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* panel — drops from the top on mobile (30% height), slides from the right on desktop */}
      <aside className="menu-panel absolute flex flex-col bg-paper shadow-[0_30px_120px_-24px_rgba(28,24,19,.55)]">
        {/* gold accent edge: bottom bar on mobile, leading-side bar on desktop */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px sm:hidden"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--gold) 20%, var(--gold) 80%, transparent)",
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute top-0 bottom-0 hidden w-px sm:block"
          style={{
            insetInlineStart: 0,
            background:
              "linear-gradient(180deg, transparent, var(--gold) 22%, var(--gold) 78%, transparent)",
          }}
        />

        {/* panel header */}
        <div className="flex shrink-0 items-center justify-between px-6 py-4 sm:px-9 sm:py-6">
          <span className="eyebrow">{lang === "ar" ? "القائمة" : "Menu"}</span>
          <div className="flex items-center gap-3 sm:gap-4">
            <LangToggle />
            <button
              onClick={onClose}
              aria-label={lang === "ar" ? "إغلاق" : "Close"}
              className="group grid h-10 w-10 place-items-center rounded-full border transition-colors duration-300 hover:border-[color:var(--gold)] sm:h-11 sm:w-11"
              style={{ borderColor: "color-mix(in oklab, var(--gold) 50%, transparent)" }}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 transition-transform duration-500 ease-out group-hover:rotate-90 group-hover:text-gold"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M5 5l14 14M19 5L5 19" />
              </svg>
            </button>
          </div>
        </div>

        {/* nav */}
        <nav className="flex flex-1 flex-col overflow-y-auto px-6 pb-5 sm:justify-center sm:px-9 sm:pb-0">
          <ul>
            {st.nav.map((label: string, i: number) => {
              const target = linkFor(i);
              const external = isExternal(target);
              return (
                <li key={i} className="menu-item" style={stagger(i)}>
                  <a
                    href={target}
                    onClick={onClose}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noreferrer" : undefined}
                    className="group flex items-baseline gap-3 border-b py-2.5 transition-colors duration-300 sm:gap-4 sm:py-4"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <span className="mono w-5 shrink-0 text-[10px] text-gold sm:w-6 sm:text-xs">
                      0{i + 1}
                    </span>
                    <span className="font-display text-xl leading-none tracking-tight text-ink transition-colors duration-300 group-hover:text-copper sm:text-[clamp(1.9rem,4vw,2.75rem)]">
                      {label}
                    </span>
                    <span
                      aria-hidden
                      className="ms-auto translate-x-[-6px] self-center text-gold opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                    >
                      →
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>

          {/* contact block — desktop only (keeps the compact mobile sheet clean) */}
          <div className="menu-item mt-10 hidden sm:block" style={stagger(st.nav.length)}>
            <div className="hairline w-20" />
            <div className="mono mt-6 flex flex-col gap-3 text-xs text-stone">
              <a
                href={contact.tel}
                className="inline-flex items-center gap-2 transition hover:text-gold"
              >
                <IconPhone className="h-3.5 w-3.5 text-gold" />
                {contact.phone}
              </a>
              <a
                href={`mailto:${contact.email}`}
                className="inline-flex items-center gap-2 transition hover:text-gold"
              >
                <IconMail className="h-3.5 w-3.5 text-gold" />
                {contact.email}
              </a>
            </div>
            <SocialLinks className="mt-6" />
          </div>
        </nav>
      </aside>
    </div>
  );
}

function ContactFloat() {
  const { contact } = useSite();
  if (!contact.whatsapp) return null;
  return (
    <a
      href={contact.whatsapp}
      target="_blank"
      rel="noreferrer"
      aria-label="WhatsApp"
      className="fixed bottom-6 z-40 grid h-14 w-14 place-items-center rounded-full text-ink shadow-[0_10px_30px_-6px_rgba(28,24,19,.25)] transition hover:-translate-y-0.5"
      style={{ background: "var(--gradient-gold)", insetInlineEnd: 24 }}
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 2.1.55 4.15 1.6 5.95L2 22l4.25-1.11a9.9 9.9 0 0 0 5.79 1.84h.01c5.46 0 9.91-4.45 9.91-9.91A9.86 9.86 0 0 0 12.04 2zm0 18.06c-1.74 0-3.45-.47-4.94-1.36l-.35-.21-2.52.66.67-2.46-.23-.38a8.16 8.16 0 1 1 15.21-4.4 8.18 8.18 0 0 1-7.84 8.15zm4.48-6.13c-.24-.12-1.45-.71-1.67-.8-.22-.08-.39-.12-.55.12-.16.24-.63.8-.78.96-.14.16-.29.18-.53.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.1-.1.24-.27.36-.4.12-.13.16-.22.24-.37.08-.15.04-.28-.02-.4-.06-.12-.55-1.33-.75-1.82-.2-.48-.4-.42-.55-.43h-.47c-.16 0-.42.06-.65.3s-.86.84-.86 2.05.88 2.38 1 2.55c.12.16 1.74 2.66 4.21 3.73.59.26 1.05.41 1.41.52.59.19 1.13.16 1.55.1.47-.07 1.45-.59 1.66-1.16.2-.57.2-1.05.14-1.16-.06-.1-.22-.16-.46-.28z" />
      </svg>
    </a>
  );
}

// ── Forms / lead capture ──────────────────────────────────────────────────────

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  textarea?: boolean;
  defaultValue?: string;
};

export function Field({
  label,
  name,
  type = "text",
  required,
  textarea,
  defaultValue,
}: FieldProps) {
  // Explicit id/htmlFor association (more robust than implicit nesting for AT),
  // plus native HTML5 validation (required + email/tel types) for inline errors.
  const id = useId();
  const fieldClass =
    "mt-2 block w-full border-0 border-b bg-transparent py-3 text-ink outline-none transition focus:border-[color:var(--gold)]";
  return (
    <div className="block">
      <label htmlFor={id} className="mono text-[10px] uppercase tracking-[0.22em] text-stone">
        {label}
        {required && " *"}
      </label>
      {textarea ? (
        <textarea
          id={id}
          name={name}
          rows={4}
          required={required}
          aria-required={required || undefined}
          defaultValue={defaultValue}
          className={`${fieldClass} resize-none`}
          style={{ borderColor: "var(--border)" }}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          required={required}
          aria-required={required || undefined}
          autoComplete={
            type === "email"
              ? "email"
              : type === "tel"
                ? "tel"
                : name === "name"
                  ? "name"
                  : undefined
          }
          defaultValue={defaultValue}
          className={fieldClass}
          style={{ borderColor: "var(--border)" }}
        />
      )}
    </div>
  );
}

async function submitLead(
  fd: FormData,
  extra: {
    source: "contact" | "info-panel";
    lang: Lang;
    residence?: string;
    apt?: string;
    elapsedMs?: number;
  },
) {
  await createLeadFn({
    data: {
      name: String(fd.get("name") || ""),
      email: String(fd.get("email") || ""),
      phone: String(fd.get("phone") || ""),
      apt: extra.apt ?? (fd.get("apt") ? String(fd.get("apt")) : undefined),
      residence: extra.residence,
      message: String(fd.get("msg") || ""),
      source: extra.source,
      lang: extra.lang,
      // Anti-spam signals (server drops bots silently).
      hp: fd.get("company") ? String(fd.get("company")) : undefined,
      elapsedMs: extra.elapsedMs,
    },
  });
}

/** Hidden honeypot input — real users never see or fill it; bots do. */
function Honeypot() {
  return (
    <input
      type="text"
      name="company"
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      className="hidden"
    />
  );
}

function InfoPanel({ target, onClose }: { target: InfoTarget; onClose: () => void }) {
  const { st, lang } = useSite();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const mountedAt = useRef(0);
  useEffect(() => {
    if (target) {
      setSent(false);
      mountedAt.current = Date.now();
    }
  }, [target]);
  if (!target) return null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await submitLead(fd, {
        source: "info-panel",
        lang,
        residence: target!.residence,
        apt: String(fd.get("apt") || target!.apt),
        elapsedMs: Date.now() - mountedAt.current,
      });
      setSent(true);
    } catch {
      toast.error(lang === "ar" ? "تعذّر الإرسال. حاول مجدداً." : "Échec de l'envoi. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[58]">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <aside
        className="absolute top-0 bottom-0 w-full max-w-md bg-paper p-8 shadow-[0_30px_80px_-20px_rgba(28,24,19,.3)] sm:p-10"
        style={{ insetInlineEnd: 0 }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="eyebrow">{st.panel.title}</div>
            <div className="mt-2 font-display text-2xl">
              {st.panel.apt} {target.apt}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full border"
            style={{ borderColor: "var(--gold)" }}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>
        </div>
        <div className="hairline mt-6 w-16" />
        {sent ? (
          <div
            className="mt-8 rounded-xl border p-6 text-ink"
            style={{ borderColor: "var(--gold)" }}
          >
            <div className="mono text-[10px] uppercase tracking-[0.22em] text-gold">✓</div>
            <p className="mt-3">{st.panel.sent}</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <Honeypot />
            <Field label={st.contactForm.name} name="name" required />
            <Field label={st.contactForm.email} name="email" type="email" required />
            <Field label={st.contactForm.phone} name="phone" type="tel" />
            <Field label={st.panel.apt} name="apt" defaultValue={target.apt} />
            <Field label={st.contactForm.msg} name="msg" textarea />
            <button
              disabled={busy}
              className="gold-fill mono mt-2 inline-flex w-full justify-center gap-3 rounded-full px-6 py-3.5 text-xs uppercase tracking-[0.22em] disabled:opacity-60"
            >
              {st.panel.send} →
            </button>
          </form>
        )}
      </aside>
    </div>
  );
}

// ── Agency + Contact + Footer + Grid ──────────────────────────────────────────

export function AgencyAbout() {
  const { st, content } = useSite();
  return (
    <section className="bg-paper py-24 sm:py-32 lg:py-40">
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:gap-16">
        <div className="clip-reveal order-2 lg:order-1">
          <CornerFrame>
            <img
              src={content.about.image || aerialImg}
              alt={st.s7title}
              loading="lazy"
              className="aspect-[5/4] w-full object-cover"
            />
          </CornerFrame>
        </div>
        <div className="reveal order-1 lg:order-2 lg:pt-8">
          <h2 className="font-display text-[clamp(2.65rem,5.8vw,4.75rem)] leading-[1.05] gold-text">
            {st.s7title}
          </h2>
          <div className="hairline mt-6 w-24" />
          <p className="mt-8 max-w-prose text-ink/80">{st.s7p}</p>
          <div className="mt-10 grid grid-cols-3 gap-4">
            {st.s7stats.map(([n, l]: [string, string], i: number) => (
              <div key={i}>
                <div className="font-display text-4xl sm:text-5xl gold-text">{n}</div>
                <div className="mono mt-2 text-[10px] uppercase tracking-[0.22em] text-stone">
                  {l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ContactSection({ residenceSlug }: { residenceSlug?: string }) {
  const { st, content, lang, contact } = useSite();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const mountedAt = useRef(Date.now());

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await submitLead(fd, {
        source: "contact",
        lang,
        residence: residenceSlug,
        elapsedMs: Date.now() - mountedAt.current,
      });
      setSent(true);
    } catch {
      toast.error(lang === "ar" ? "تعذّر الإرسال. حاول مجدداً." : "Échec de l'envoi. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="contact" className="bg-sand py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
        <h2 className="reveal max-w-3xl font-display text-[clamp(3rem,7vw,6rem)] leading-[1.02]">
          {st.s8title}
        </h2>
        <div className="hairline mt-8 w-24" />
        <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <form onSubmit={onSubmit} className="reveal space-y-5 lg:col-span-7">
            <Honeypot />
            {sent ? (
              <div
                className="rounded-xl border bg-paper p-8 text-ink"
                style={{ borderColor: "var(--gold)" }}
              >
                <div className="mono text-[10px] uppercase tracking-[0.22em] text-gold">
                  ✓ {st.contactForm.send}
                </div>
                <p className="mt-3 text-lg">{st.contactForm.sent}</p>
              </div>
            ) : (
              <>
                <Field label={st.contactForm.name} name="name" required />
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label={st.contactForm.email} name="email" type="email" required />
                  <Field label={st.contactForm.phone} name="phone" type="tel" />
                </div>
                <Field label={st.contactForm.msg} name="msg" textarea />
                <label className="mono flex items-start gap-3 text-xs text-stone">
                  <input type="checkbox" required className="mt-1 accent-[var(--gold)]" />
                  <span>
                    {st.contactForm.consent}{" "}
                    <Link to="/privacy" className="underline hover:text-gold">
                      {lang === "ar" ? "سياسة الخصوصية" : "Politique de confidentialité"}
                    </Link>
                  </span>
                </label>
                <button
                  disabled={busy}
                  className="gold-fill mono mt-2 inline-flex items-center gap-3 rounded-full px-7 py-3.5 text-xs uppercase tracking-[0.22em] shadow-[0_12px_30px_-12px_rgba(185,116,47,.5)] transition hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {st.contactForm.send} →
                </button>
              </>
            )}
          </form>

          <aside className="relative lg:col-span-5">
            <div
              className="relative overflow-hidden bg-paper p-8 sm:p-10"
              style={{ borderInlineStart: "3px solid var(--gold)" }}
            >
              <img
                src={content.about.image || interiorImg}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover opacity-10"
              />
              <div className="relative">
                <div className="eyebrow">{st.contact}</div>
                <div className="mt-8 space-y-5">
                  <a href={contact.tel} className="group/c flex items-center gap-4">
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full border text-gold transition group-hover/c:border-[color:var(--gold)] group-hover/c:bg-sand"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <IconPhone />
                    </span>
                    <span className="mono leading-tight">
                      <span className="block text-[10px] uppercase tracking-[0.22em] text-stone">
                        GSM
                      </span>
                      <span className="mt-0.5 block text-base text-ink transition group-hover/c:text-gold">
                        {contact.phone}
                      </span>
                    </span>
                  </a>
                  <a href={`mailto:${contact.email}`} className="group/c flex items-center gap-4">
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full border text-gold transition group-hover/c:border-[color:var(--gold)] group-hover/c:bg-sand"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <IconMail />
                    </span>
                    <span className="mono leading-tight">
                      <span className="block text-[10px] uppercase tracking-[0.22em] text-stone">
                        E-mail
                      </span>
                      <span className="mt-0.5 block text-base text-ink transition group-hover/c:text-gold">
                        {contact.email}
                      </span>
                    </span>
                  </a>
                  <div className="flex items-center gap-4">
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full border text-gold"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <IconPin />
                    </span>
                    <span className="mono leading-tight">
                      <span className="block text-[10px] uppercase tracking-[0.22em] text-stone">
                        Siège social
                      </span>
                      <span className="mt-0.5 block text-base text-ink">
                        {contact.address1}
                        <br />
                        {contact.address2}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="hairline mt-8 w-16" />
                <SocialLinks className="mt-6" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const { st, content, contact, lang } = useSite();
  return (
    <footer className="bg-sand pt-20 pb-10">
      <div className="hairline mx-auto max-w-[1280px]" />
      <div className="mx-auto mt-16 grid max-w-[1280px] grid-cols-1 gap-10 px-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
        <div>
          <div className="eyebrow">{st.hours}</div>
          <ul className="mono mt-5 space-y-2 text-sm text-ink/80">
            {st.hoursV.map((h: string, i: number) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="eyebrow">{st.quick}</div>
          <p className="mt-5 text-sm text-ink/80">{st.footerProjects}</p>
        </div>
        <div>
          <div className="eyebrow">{st.follow}</div>
          <SocialLinks className="mt-5" />
        </div>
        <div>
          <div className="eyebrow">{st.contact}</div>
          <ul className="mono mt-5 space-y-2.5 text-sm text-ink/80">
            <li>
              <a
                href={contact.tel}
                className="inline-flex items-center gap-2 transition hover:text-gold"
              >
                <IconPhone className="h-3.5 w-3.5 text-gold" />
                {contact.phone}
              </a>
            </li>
            <li>
              <a
                href={`mailto:${contact.email}`}
                className="inline-flex items-center gap-2 transition hover:text-gold"
              >
                <IconMail className="h-3.5 w-3.5 text-gold" />
                {contact.email}
              </a>
            </li>
            <li className="inline-flex items-center gap-2">
              <IconPin className="h-3.5 w-3.5 shrink-0 text-gold" />
              {contact.address1} — {contact.address2}
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-16 flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-5 sm:px-8">
        <img
          src={content.header.logo || logoImg}
          alt={content.header.brand}
          className="h-14 w-auto opacity-90"
        />
        <div className="mono flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] uppercase tracking-[0.22em] text-stone">
          <span>
            © 2026 {content.header.brand} — {st.designed}
          </span>
          <Link to="/privacy" className="transition hover:text-gold">
            {lang === "ar" ? "الخصوصية" : "Confidentialité"}
          </Link>
          <Link to="/terms" className="transition hover:text-gold">
            {lang === "ar" ? "الشروط" : "Conditions"}
          </Link>
        </div>
      </div>
    </footer>
  );
}

const STATUS_TINT: Record<string, string> = {
  "on-sale": "var(--gradient-gold)",
  "coming-soon": "#3B9BC9",
  delivered: "#8A8073",
  "sold-out": "#B4452F",
};

/** Grid of residence cards. `excludeId` omits the current residence on detail pages. */
export function ResidencesGrid({ excludeId, title }: { excludeId?: string; title?: string }) {
  const { content, st, lang } = useSite();
  const items = useMemo(() => {
    const list = content.residences.filter((r) => r.id !== excludeId);
    return list.sort(
      (a, b) =>
        Number(b.id === content.primaryResidenceId) - Number(a.id === content.primaryResidenceId),
    );
  }, [content.residences, content.primaryResidenceId, excludeId]);
  if (!items.length) return null;

  return (
    <section id="residences" className="bg-paper py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
        <div className="reveal mb-12 flex flex-wrap items-end justify-between gap-6">
          <h2 className="font-display text-[clamp(2.4rem,4.7vw,3.85rem)] leading-[1.05]">
            {title ?? st.residencesTitle}
          </h2>
          <div className="hairline w-40" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {items.map((r) => {
            const primary = r.id === content.primaryResidenceId;
            const name = lang === "ar" ? r.name.ar : r.name.fr;
            const loc = lang === "ar" ? r.locationLabel.ar : r.locationLabel.fr;
            const statusLabel =
              lang === "ar"
                ? content.labels.status[r.status].ar
                : content.labels.status[r.status].fr;
            return (
              <Link
                key={r.id}
                to="/residence/$slug"
                params={{ slug: r.slug }}
                className="group relative block aspect-[4/5] overflow-hidden"
              >
                <img
                  src={r.cardImage || r.hero.imageDesktop}
                  alt={name}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(180deg, transparent 40%, rgba(28,24,19,.55))",
                  }}
                />
                <span
                  className="mono absolute left-3 top-3 rounded-full px-3 py-1 text-[9px] uppercase tracking-[0.22em] text-ink"
                  style={{
                    background: STATUS_TINT[r.status] ?? "var(--gradient-gold)",
                    color: r.status === "on-sale" ? "#1C1813" : "#fff",
                  }}
                >
                  {primary ? `★ ${statusLabel}` : statusLabel}
                </span>
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <div className="mono text-[10px] uppercase tracking-[0.22em] text-paper/80">
                    {loc} · {r.deliveryYear}
                  </div>
                  <div className="mt-2 font-display text-2xl text-paper">{name}</div>
                  <div className="mono mt-3 inline-flex translate-y-2 items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-gold-lt opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                    {st.viewResidence} →
                  </div>
                </div>
                <span
                  aria-hidden
                  className="pointer-events-none absolute top-3 right-3 h-4 w-4 border-t border-r opacity-0 transition group-hover:opacity-100"
                  style={{ borderColor: "var(--gold-lt)" }}
                />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
