import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dono/assinaturas")({
  ssr: false,
  head: () => ({ meta: [{ title: "Assinaturas — Plataforma" }, { name: "robots", content: "noindex" }] }),
  component: DonoAssinaturas,
});

function DonoAssinaturas() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Assinaturas</h1>
      <p className="text-sm text-muted-foreground">Em breve: gestão de planos e assinaturas das barbearias.</p>
    </div>
  );
}
