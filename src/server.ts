import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { captureServerError } from "./lib/monitoring";
import { CONTENT_TYPE_BY_EXT, ensureStorageReady, getStorage } from "./server/storage";
import { assertAuthConfig } from "./server/auth";
import { robotsTxt, sitemapXml } from "./server/seo";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

const IS_PROD = process.env.NODE_ENV === "production";

// CSP tuned to what the app actually loads: SSR/Radix inject inline script+style
// (hence 'unsafe-inline' — tightening to nonces needs deeper TanStack Start
// integration, tracked as future hardening); Leaflet + its CSS come from unpkg;
// map tiles + admin-set image URLs are remote images; Google Fonts. Locks down
// framing, base-uri, objects and plugins.
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' https://fonts.gstatic.com data:",
  "connect-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

// Apply security headers in place — mutating (vs. rebuilding the Response) keeps
// multiple Set-Cookie headers (admin session, visitor id) intact. CSP/HSTS are
// production-only so they don't interfere with the Vite dev server / HMR.
function withSecurityHeaders(res: Response): Response {
  try {
    const h = res.headers;
    h.set("X-Content-Type-Options", "nosniff");
    h.set("X-Frame-Options", "DENY");
    h.set("Referrer-Policy", "strict-origin-when-cross-origin");
    h.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
    if (IS_PROD) {
      h.set("Content-Security-Policy", CSP);
      h.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
    }
  } catch {
    // Rare: an immutable-headers response — return it untouched rather than throw.
  }
  return res;
}

// Runtime-uploaded images live OUTSIDE the build's static assets (UPLOAD_DIR is a
// persistent dir on the host), so the static handler never sees them. Serve them
// here, straight from the storage adapter. Path traversal is rejected by the
// adapter; `nosniff` neutralizes content-type confusion on the served bytes.
async function serveUpload(pathname: string): Promise<Response | null> {
  const name = decodeURIComponent(pathname.slice("/uploads/".length));
  const file = await getStorage().readUpload(name);
  if (!file) return null;
  return new Response(file.bytes, {
    status: 200,
    headers: {
      "content-type": CONTENT_TYPE_BY_EXT[file.ext] ?? "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}

// Canonical origin for SEO files: prefer an explicit SITE_URL, else reconstruct
// from the proxy's forwarded headers (we sit behind nginx).
function siteOrigin(request: Request): string {
  const env = process.env.SITE_URL?.trim();
  if (env) return env.replace(/\/+$/, "");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  captureServerError(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`), {
    source: "ssr-h3-swallowed",
  });
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      // Fail fast (and loudly) on a misconfigured prod: refuse to serve with
      // default/weak admin credentials, and refuse if the data dir isn't writable
      // (better a clear error than silently dropping leads). Both are memoized.
      assertAuthConfig();
      await ensureStorageReady();

      const { pathname } = new URL(request.url);
      const isGet = request.method === "GET" || request.method === "HEAD";

      if (isGet && pathname.startsWith("/uploads/")) {
        const served = await serveUpload(pathname);
        if (served) return withSecurityHeaders(served);
      }

      if (isGet && pathname === "/robots.txt") {
        return withSecurityHeaders(
          new Response(robotsTxt(siteOrigin(request)), {
            headers: { "content-type": "text/plain; charset=utf-8" },
          }),
        );
      }

      if (isGet && pathname === "/sitemap.xml") {
        return withSecurityHeaders(
          new Response(await sitemapXml(siteOrigin(request)), {
            headers: { "content-type": "application/xml; charset=utf-8" },
          }),
        );
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withSecurityHeaders(await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      captureServerError(error, { source: "ssr-fetch", url: request.url });
      return withSecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
};
