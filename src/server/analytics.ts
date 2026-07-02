// ────────────────────────────────────────────────────────────────────────────
// Visitor tracking. A long-lived httpOnly cookie identifies a visitor so we can
// count unique visitors without storing personal data. Lives under src/server/
// so the cookie helpers stay out of the client bundle.
// ────────────────────────────────────────────────────────────────────────────
import { getCookie, setCookie } from "@tanstack/react-start/server";

import type { Analytics, TrackType } from "@/lib/cms/types";
import { recordView } from "./store";

const VISITOR_COOKIE = "sk_vid";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function trackView(type: TrackType, slug?: string): Promise<Analytics> {
  let newVisitor = false;
  if (!getCookie(VISITOR_COOKIE)) {
    newVisitor = true;
    setCookie(VISITOR_COOKIE, crypto.randomUUID(), {
      maxAge: ONE_YEAR,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }
  return recordView({ type, slug, newVisitor });
}
