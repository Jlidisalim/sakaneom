import { createFileRoute } from "@tanstack/react-router";

import { getContentFn } from "@/lib/cms/api";
import { SiteShell } from "@/components/site/shell";
import { LegalPage } from "@/components/site/legal";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "SAKANEOM — Conditions d'utilisation" },
      { name: "description", content: "Conditions d'utilisation du site SAKANEOM." },
    ],
  }),
  loader: async () => ({ content: await getContentFn() }),
  component: TermsPage,
});

function TermsPage() {
  const { content } = Route.useLoaderData();
  return (
    <SiteShell content={content}>
      <LegalPage kind="terms" />
    </SiteShell>
  );
}
