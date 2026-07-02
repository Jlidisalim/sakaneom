import { createFileRoute } from "@tanstack/react-router";

import { AdminApp } from "@/components/admin/admin-app";
import { getContentFn } from "@/lib/cms/api";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "SAKANEOM — Administration" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: async () => ({ content: await getContentFn() }),
  component: AdminPage,
});

function AdminPage() {
  const { content } = Route.useLoaderData();
  return <AdminApp initialContent={content} />;
}
