import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dono/configuracoes")({
  ssr: false,
  head: () => ({ meta: [{ title: "Configurações — Plataforma" }, { name: "robots", content: "noindex" }] }),
  component: DonoConfiguracoes,
});

function DonoConfiguracoes() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Configurações da plataforma</h1>
      <p className="text-sm text-muted-foreground">Em breve: preferências gerais da plataforma.</p>
    </div>
  );
}
