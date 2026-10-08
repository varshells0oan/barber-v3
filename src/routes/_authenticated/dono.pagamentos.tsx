import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dono/pagamentos")({
  ssr: false,
  head: () => ({ meta: [{ title: "Pagamentos — Plataforma" }, { name: "robots", content: "noindex" }] }),
  component: DonoPagamentos,
});

function DonoPagamentos() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Pagamentos</h1>
      <p className="text-sm text-muted-foreground">Em breve: histórico de cobranças e repasses.</p>
    </div>
  );
}
