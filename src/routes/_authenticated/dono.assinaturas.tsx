import { createFileRoute } from "@tanstack/react-router";
import { ShopsTable } from "@/components/owner/ShopsTable";

export const Route = createFileRoute("/_authenticated/dono/assinaturas")({
  ssr: false,
  head: () => ({ meta: [{ title: "Assinaturas — Plataforma" }, { name: "robots", content: "noindex" }] }),
  component: DonoAssinaturas,
});

function DonoAssinaturas() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Assinaturas</h1>
      <ShopsTable mode="subs" />
    </div>
  );
}
