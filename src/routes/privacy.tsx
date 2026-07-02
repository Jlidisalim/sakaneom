import { createFileRoute } from "@tanstack/react-router";

import { getContentFn } from "@/lib/cms/api";
import { SiteShell } from "@/components/site/shell";
import { LegalPage } from "@/components/site/legal";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "SAKANEOM — Confidentialité" },
      { name: "description", content: "Politique de confidentialité de SAKANEOM." },
    ],
  }),
  loader: async () => ({ content: await getContentFn() }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { content } = Route.useLoaderData();
  return (
    <SiteShell content={content}>
      <LegalPage kind="privacy" />
    </SiteShell>
  );
}
