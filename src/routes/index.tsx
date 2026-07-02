import { createFileRoute } from "@tanstack/react-router";

import { getContentFn } from "@/lib/cms/api";
import { getPrimaryResidence } from "@/lib/cms/select";
import {
  AgencyAbout,
  ContactSection,
  ResidencesGrid,
  SiteShell,
  useTrackView,
} from "@/components/site/shell";
import { FeaturedResidence } from "@/components/site/residence-view";

import heroDesktop from "@/assets/hero-desktop.webp";

const SITE_URL = (import.meta.env.VITE_SITE_URL ?? "").replace(/\/+$/, "");

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SAKANEOM — Vivre l'exception" },
      {
        name: "description",
        content:
          "Promoteur immobilier de haut standing. Découvrez nos résidences d'exception — prix, plans, galerie et emplacement.",
      },
      { property: "og:title", content: "SAKANEOM — Résidences d'exception" },
      {
        property: "og:description",
        content: "Découvrez nos résidences de haut standing en Tunisie.",
      },
      { property: "og:image", content: heroDesktop },
      { property: "twitter:image", content: heroDesktop },
    ],
    links: SITE_URL ? [{ rel: "canonical", href: `${SITE_URL}/` }] : [],
  }),
  loader: async () => ({ content: await getContentFn() }),
  component: Page,
});

function Page() {
  const { content } = Route.useLoaderData();
  const primary = getPrimaryResidence(content);
  useTrackView("home");
  return (
    <SiteShell content={content}>
      <FeaturedResidence residence={primary} />
      <ResidencesGrid />
      <AgencyAbout />
      <ContactSection />
    </SiteShell>
  );
}
