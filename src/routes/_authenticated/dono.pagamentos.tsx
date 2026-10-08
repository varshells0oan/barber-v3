import { createFileRoute } from "@tanstack/react-router";
import { ShopsTable } from "@/components/owner/ShopsTable";

export const Route = createFileRoute("/_authenticated/dono/pagamentos")({
  ssr: false,
  head: () => ({ meta: [{ title: "Pagamentos — Plataforma" }, { name: "robots", content: "noindex" }] }),
  component: DonoPagamentos,
});

function DonoPagamentos() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Pagamentos</h1>
      <ShopsTable mode="payments" />
    </div>
  );
}
