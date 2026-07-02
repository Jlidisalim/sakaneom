# SAKANEOM — Admin Dashboard

A self-contained CMS for the SAKANEOM real-estate site. It controls every
editable element of the public homepage and centralises incoming inquiries.

## Access

- Open **`/admin`** on the site.
- Sign in with the admin password.
- The password is set via the **`ADMIN_PASSWORD`** environment variable (see
  `.env.example`). In production the server refuses to start unless
  `ADMIN_PASSWORD` (≥12 chars) and `ADMIN_SESSION_SECRET` (≥32 chars) are set —
  there is no built-in default. A throwaway dev password applies **only** when
  `NODE_ENV` is not `production`.

## Residences (the core concept)

The site is organised around **residences**. Every residence follows the exact
same standardized structure and renders with the same layout:

- It has its own detail page at **`/residence/<slug>`** (hero → intro → banner →
  highlight → gallery → prices & plans → location map).
- You **designate one residence as "primary"** (the ★ in the Residences panel).
  That residence leads the homepage when the domain root is opened; the others
  appear in the "Discover our residences" grid, each linking to its detail page.

To change which residence shows first: open **Residences**, click the ★ next to
the residence you want, and **Save changes**.

## What you can manage

| Section              | Controls                                                                                                                                                                                                                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard**        | Headline KPIs (unique visitors, page views, new leads, residences, apartments), most-viewed / ignored residences, featured residence, quick links                                                                                                                             |
| **Analytics**        | Visitor & engagement metrics: unique visitors, page views, conversion rate, a per-residence performance ranking (views · leads · conversion), the most-viewed residence, residences **ignored by everyone** (0 views), and a 7-day views trend. Reset anytime.                |
| **Header & Brand**   | Logo, agency name (FR/AR), email, phone, address, social links, nav menu                                                                                                                                                                                                      |
| **Residences**       | Add / remove residences, **set the primary (★)**, and edit each one's full standardized content via tabs: Identity, Hero, Intro, Banner, Highlight, Gallery + video, Pricing (prices, availability, floor plans), Location (interactive marker map). All bilingual (FR + AR). |
| **Content & Agency** | Agency history / name / management, contact & footer text, and the shared section labels (kept identical across every residence).                                                                                                                                             |
| **Leads**            | Every "Request Info" inquiry (with the residence/apartment it's about): search, filter by status, change status, add private notes, export CSV, delete.                                                                                                                       |

Every change is saved server-side and reflected immediately on the public site
(both the homepage and the residence detail pages read from the same store via
their route loaders, so edits are SSR-rendered for all visitors).

## How it works

- **Content** lives in `data/content.json`, **leads** in `data/leads.json`,
  **analytics** in `data/analytics.json` (all gitignored).
- **Analytics** are privacy-light: a visitor is counted once via an httpOnly
  `sk_vid` cookie (no personal data), and a residence/home view is counted once
  per browser session (refreshes don't inflate counts). Tracking never blocks or
  breaks the page.
- **Uploaded images** are written to `public/uploads/` and served statically.
  Images are downscaled in the browser before upload to keep things fast.
- **Server functions** (`src/lib/cms/api.ts`) are the RPC bridge; the actual
  server-only logic is in `src/server/store.ts` (persistence) and
  `src/server/auth.ts` (session auth). Admin mutations are gated by
  `requireAdmin()`; lead capture and content reads are public.
- **Maps** use Leaflet (loaded from a CDN at runtime) with OpenStreetMap tiles —
  no API key required.

## Configuration (production)

Set these environment variables before deploying:

| Variable               | Purpose                                            | Default (dev only) |
| ---------------------- | -------------------------------------------------- | ------------------ |
| `ADMIN_PASSWORD`       | Login password for `/admin`                        | `sakaneom-admin`   |
| `ADMIN_SESSION_SECRET` | 32+ char secret used to encrypt the session cookie | a padded dev value |

> ⚠️ Always set both in production. The app prints a warning to the server
> console while the dev defaults are in use.

## Deployment note (edge / Workers targets)

Persistence uses the Node filesystem (`data/*.json` + `public/uploads/`), which
works in local dev and any Node host. On a filesystem-less target (e.g.
Cloudflare Workers) swap the implementation in `src/server/store.ts` for a
KV/R2/D1-backed one — the function signatures (`readContent`, `writeContent`,
`patchContent`, `readLeads`, `addLead`, `saveUpload`, …) stay the same, so
nothing else needs to change.
