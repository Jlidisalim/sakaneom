// ────────────────────────────────────────────────────────────────────────────
// Locale-aware formatting for the admin back-office (Espace Admin).
//
// The business runs in Tunisia: French (fr-FR) is the default locale and TND the
// default currency, with EUR configurable per project. These helpers are the
// single place that knows how money / dates / numbers are rendered, so the whole
// admin stays consistent (and a future Arabic/English locale only touches here).
// ────────────────────────────────────────────────────────────────────────────

export type Currency = "TND" | "EUR";

export const CURRENCIES: { value: Currency; label: string }[] = [
  { value: "TND", label: "Dinar tunisien (TND)" },
  { value: "EUR", label: "Euro (EUR)" },
];

export const DEFAULT_CURRENCY: Currency = "TND";

const LOCALE = "fr-FR";

// TND is conventionally written with 0 decimals in real-estate pricing here; we
// drop fraction digits for a clean "1 250 000 DT" reading. Intl renders TND with
// the "DT" symbol in fr-FR, EUR with "€".
const currencyFmt: Record<Currency, Intl.NumberFormat> = {
  TND: new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: "TND",
    maximumFractionDigits: 0,
  }),
  EUR: new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }),
};

/** Format a monetary amount, e.g. `formatCurrency(1250000)` → "1 250 000 DT". */
export function formatCurrency(amount: number, currency: Currency = DEFAULT_CURRENCY): string {
  if (!Number.isFinite(amount)) return "—";
  const fmt = currencyFmt[currency] ?? currencyFmt[DEFAULT_CURRENCY];
  return fmt.format(amount);
}

const numberFmt = new Intl.NumberFormat(LOCALE);

/** Plain grouped number, e.g. `formatNumber(1250000)` → "1 250 000". */
export function formatNumber(n: number, opts?: Intl.NumberFormatOptions): string {
  if (!Number.isFinite(n)) return "—";
  return opts ? new Intl.NumberFormat(LOCALE, opts).format(n) : numberFmt.format(n);
}

/** Surface area, e.g. `formatArea(120.5)` → "120,5 m²". */
export function formatArea(m2: number): string {
  if (!Number.isFinite(m2)) return "—";
  return `${new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 }).format(m2)} m²`;
}

/** Price per square metre, e.g. "3 200 DT/m²". */
export function formatPricePerM2(amount: number, currency: Currency = DEFAULT_CURRENCY): string {
  if (!Number.isFinite(amount)) return "—";
  return `${formatCurrency(Math.round(amount), currency)}/m²`;
}

/** A short percentage, e.g. `formatPercent(0.42)` → "42 %". */
export function formatPercent(ratio: number, fractionDigits = 0): string {
  if (!Number.isFinite(ratio)) return "—";
  return new Intl.NumberFormat(LOCALE, {
    style: "percent",
    maximumFractionDigits: fractionDigits,
  }).format(ratio);
}

const dateFmt = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateLongFmt = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function toDate(value: string | number | Date): Date | null {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** fr-FR short date, e.g. "29/06/2026". Safe on bad input (returns "—"). */
export function formatDate(value: string | number | Date): string {
  const d = toDate(value);
  return d ? dateFmt.format(d) : "—";
}

/** fr-FR long date, e.g. "29 juin 2026". */
export function formatDateLong(value: string | number | Date): string {
  const d = toDate(value);
  return d ? dateLongFmt.format(d) : "—";
}

/** fr-FR date + time, e.g. "29/06/2026 14:30". */
export function formatDateTime(value: string | number | Date): string {
  const d = toDate(value);
  return d ? dateTimeFmt.format(d) : "—";
}

/** ISO `YYYY-MM-DD` for `<input type="date">` values. Empty string on bad input. */
export function toDateInputValue(value: string | number | Date): string {
  const d = toDate(value);
  return d ? d.toISOString().slice(0, 10) : "";
}

/** True when an échéance/RDV date is strictly in the past (relative to `now`). */
export function isPast(value: string | number | Date, now: Date = new Date()): boolean {
  const d = toDate(value);
  return d ? d.getTime() < now.getTime() : false;
}

/** Whole days from `now` until `value` (negative = overdue). */
export function daysUntil(value: string | number | Date, now: Date = new Date()): number {
  const d = toDate(value);
  if (!d) return 0;
  return Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
}

/**
 * URL/reference-safe slug from an arbitrary label. Strips accents (Tunisian
 * content is accented French), lowercases, and collapses to hyphens.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritical marks
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
