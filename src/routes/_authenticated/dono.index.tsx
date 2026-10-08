import { createFileRoute } from "@tanstack/react-router";
import { DonoRedirect } from "@/components/owner/DonoRedirect";

export const Route = createFileRoute("/_authenticated/dono/")({
  ssr: false,
  head: () => ({ meta: [{ title: "Painel do dono — BarberSaaS" }, { name: "robots", content: "noindex" }] }),
  component: () => <DonoRedirect />,
});
