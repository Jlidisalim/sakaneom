import { Link, createFileRoute, notFound } from "@tanstack/react-router";

import { getContentFn } from "@/lib/cms/api";
import { getResidenceBySlug } from "@/lib/cms/select";
import { ContactSection, ResidencesGrid, SiteShell, useTrackView } from "@/components/site/shell";
import { ResidenceView } from "@/components/site/residence-view";

const SITE_URL = (import.meta.env.VITE_SITE_URL ?? "").replace(/\/+$/, "");

export const Route = createFileRoute("/residence/$slug")({
  loader: async ({ params }) => {
    const content = await getContentFn();
    const residence = getResidenceBySlug(content, params.slug);
    if (!residence) throw notFound();
    return {
      content,
      residenceId: residence.id,
      slug: residence.slug,
      title: `${residence.name.fr} — ${content.header.brand}`,
      desc: residence.intro.p1.fr || residence.hero.sub.fr,
      ogImage: residence.hero.imageDesktop || residence.cardImage,
    };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: loaderData.title },
          { name: "description", content: loaderData.desc },
          { property: "og:title", content: loaderData.title },
          { property: "og:description", content: loaderData.desc },
          { property: "og:image", content: loaderData.ogImage },
        ]
      : [{ title: "SAKANEOM" }],
    links:
      loaderData && SITE_URL
        ? [{ rel: "canonical", href: `${SITE_URL}/residence/${loaderData.slug}` }]
        : [],
  }),
  component: ResidencePage,
  notFoundComponent: ResidenceNotFound,
});

function ResidencePage() {
  const { content, residenceId } = Route.useLoaderData();
  const residence = content.residences.find((r) => r.id === residenceId);
  useTrackView("residence", residence?.slug);
  if (!residence) return <ResidenceNotFound />;
  return (
    <SiteShell content={content}>
      <ResidenceView residence={residence} />
      <ResidencesGrid excludeId={residence.id} />
      <ContactSection residenceSlug={residence.slug} />
    </SiteShell>
  );
}

function ResidenceNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 text-center text-ink">
      <div className="font-display text-5xl gold-text" style={{ letterSpacing: "0.2em" }}>
        SAKANEOM
      </div>
      <p className="mt-6 text-lg text-ink/70">Cette résidence est introuvable.</p>
      <Link
        to="/"
        className="gold-fill mono mt-8 inline-flex rounded-full px-6 py-3 text-xs uppercase tracking-[0.22em]"
      >
        Retour à l'accueil →
      </Link>
    </div>
  );
}
