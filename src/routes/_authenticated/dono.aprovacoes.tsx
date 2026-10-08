import { createFileRoute } from "@tanstack/react-router";
import { PendingApprovals } from "@/components/owner/PendingApprovals";

export const Route = createFileRoute("/_authenticated/dono/aprovacoes")({
  ssr: false,
  head: () => ({ meta: [{ title: "Aprovações — Plataforma" }, { name: "robots", content: "noindex" }] }),
  component: DonoAprovacoes,
});

function DonoAprovacoes() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Aprovações pendentes</h1>
      <PendingApprovals />
    </div>
  );
}
