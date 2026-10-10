import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/barbeiro/$slug")({
  ssr: false,
  component: ShopGate,
});

const BLOCKED: Record<string, string> = {
  pending_approval: "Sua barbearia está aguardando aprovação. Você receberá acesso assim que for aprovada.",
  suspended: "O acesso desta barbearia está suspenso. Entre em contato com o suporte.",
  cancelled: "Esta conta foi cancelada ou o cadastro não foi aprovado.",
};

/** Verifica no servidor (função do banco) se o usuário tem acesso e se a conta está liberada. */
function ShopGate() {
  const { slug } = Route.useParams();
  const [state, setState] = useState<{ ok: boolean; msg?: string } | null>(null);

  useEffect(() => {
    setState(null);
    (async () => {
      const { data, error } = await supabase.rpc("my_shop_access", { _slug: slug });
      const row = (data as any[])?.[0];
      if (error || !row) return setState({ ok: false, msg: "Barbearia não encontrada." });
      if (!row.is_owner) return setState({ ok: false, msg: "Você não tem acesso a esta barbearia." });
      const { data: u } = await supabase.auth.getUser();
      const { data: sup } = await supabase.rpc("is_superadmin", { _user_id: u.user!.id });
      if (!sup && BLOCKED[row.subscription_status]) return setState({ ok: false, msg: BLOCKED[row.subscription_status] });
      setState({ ok: true });
    })();
  }, [slug]);

  if (!state) return <div className="dark grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">Verificando acesso…</div>;
  if (!state.ok) {
    return (
      <div className="dark grid min-h-screen place-items-center bg-background px-4 text-foreground">
        <div className="max-w-sm rounded-xl border border-border bg-card p-6 text-center">
          <h1 className="text-lg font-semibold">Acesso indisponível</h1>
          <p className="mt-2 text-sm text-muted-foreground">{state.msg}</p>
          <button
            onClick={async () => { await supabase.auth.signOut(); location.href = "/auth"; }}
            className="mt-5 rounded-md border border-border px-4 py-2.5 text-sm"
          >Sair</button>
          <Link to="/" className="mt-2 block text-xs text-muted-foreground">Início</Link>
        </div>
      </div>
    );
  }
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8"><Outlet /></main>
    </div>
  );
}
