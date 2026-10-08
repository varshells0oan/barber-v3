import { createFileRoute } from "@tanstack/react-router";
import { ShopsTable } from "@/components/owner/ShopsTable";

export const Route = createFileRoute("/_authenticated/dono/barbearias")({
  ssr: false,
  head: () => ({ meta: [{ title: "Barbearias — Plataforma" }, { name: "robots", content: "noindex" }] }),
  component: DonoBarbearias,
});

function DonoBarbearias() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Barbearias</h1>
      <ShopsTable />
    </div>
  );
}
