// robots.txt + a dynamic sitemap. Residences are CMS-driven, so the sitemap is
// generated from the live content rather than shipped as a static file.
import { readContent } from "./store";

const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function robotsTxt(origin: string): string {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
}

export async function sitemapXml(origin: string): Promise<string> {
  const content = await readContent();
  // Use the content's updatedAt, but fall back to today for unsaved defaults
  // (whose updatedAt is the epoch) so crawlers don't see a 1970 timestamp.
  const d = content.updatedAt ? new Date(content.updatedAt) : null;
  const valid = d && !Number.isNaN(d.getTime()) && d.getFullYear() > 2000 ? d : new Date();
  const lastmod = valid.toISOString().slice(0, 10);
  const entries = [
    { loc: `${origin}/`, priority: "1.0" },
    ...content.residences.map((r) => ({
      loc: `${origin}/residence/${r.slug}`,
      priority: "0.8",
    })),
  ];
  const body = entries
    .map(
      (u) =>
        `  <url>\n    <loc>${xmlEscape(u.loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>${u.priority}</priority>\n  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}
