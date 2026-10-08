import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DonoRedirect } from "@/components/owner/DonoRedirect";

export const Route = createFileRoute("/_authenticated/dono")({
  ssr: false,
  head: () => ({ meta: [{ title: "Painel da plataforma — BarberSaaS" }, { name: "robots", content: "noindex" }] }),
  component: DonoLayout,
});

const NAV = [
  { to: "/dono", label: "Visão geral" },
  { to: "/dono/aprovacoes", label: "Aprovações" },
  { to: "/dono/barbearias", label: "Barbearias" },
  { to: "/dono/assinaturas", label: "Assinaturas" },
  { to: "/dono/pagamentos", label: "Pagamentos" },
  { to: "/dono/configuracoes", label: "Configurações" },
] as const;

/** /dono é exclusivo do proprietário da plataforma (role superadmin). */
function DonoLayout() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return setOk(false);
      const { data } = await supabase.rpc("is_superadmin", { _user_id: u.user.id });
      setOk(!!data);
    })();
  }, []);
  if (ok === null) return <div className="dark grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">Verificando acesso…</div>;
  // Dono de barbearia (ou qualquer outro) nunca vê /dono: é levado ao próprio painel.
  if (!ok) return <DonoRedirect />;
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
          <span className="mr-4 font-semibold">Plataforma</span>
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: true }} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground" activeProps={{ className: "bg-secondary text-foreground" }}>
              {n.label}
            </Link>
          ))}
          <button onClick={async () => { await supabase.auth.signOut(); location.replace("/auth"); }} className="ml-auto text-sm text-muted-foreground hover:text-foreground">Sair</button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6"><Outlet /></main>
    </div>
  );
}
