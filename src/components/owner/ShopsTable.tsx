import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Shop = {
  id: string; name: string; slug: string; owner_name: string | null; owner_email: string | null;
  subscription_status: string; plan_id: string | null; subscription_started_at: string | null;
  subscription_ends_at: string | null; payment_provider: string | null; created_at: string;
};

const LABEL: Record<string, string> = {
  pending_approval: "Aguardando aprovação", active: "Ativa", suspended: "Suspensa", cancelled: "Cancelada", trial: "Teste",
};

export function useShops() {
  const [items, setItems] = useState<Shop[] | null>(null);
  const load = async () => {
    const { data, error } = await supabase.from("barbershops")
      .select("id,name,slug,owner_name,owner_email,subscription_status,plan_id,subscription_started_at,subscription_ends_at,payment_provider,created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as Shop[]) ?? []);
  };
  useEffect(() => { load(); }, []);
  return { items, load };
}

const d = (s: string | null) => (s ? new Date(s).toLocaleDateString("pt-BR") : "—");

export function ShopsTable({ mode }: { mode: "shops" | "subs" | "payments" }) {
  const { items, load } = useShops();
  const act = async (id: string, action: string) => {
    const rpcAction = action === "suspend" ? "block" : action;
    const { error } = await supabase.rpc("set_shop_account_status", { _id: id, _action: rpcAction });
    if (error) return toast.error(error.message);
    toast.success("Atualizado"); load();
  };
  if (!items) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!items.length) return <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Nenhuma barbearia cadastrada ainda.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-card text-left text-xs text-muted-foreground">
          <tr>
            <th className="p-3">Barbearia</th>
            {mode === "shops" && <th className="p-3">Responsável</th>}
            <th className="p-3">Status</th>
            {mode !== "shops" && <th className="p-3">Plano</th>}
            {mode === "subs" && <><th className="p-3">Início</th><th className="p-3">Vence</th></>}
            {mode === "payments" && <th className="p-3">Provedor</th>}
            {mode === "shops" && <th className="p-3">Ações</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((s) => (
            <tr key={s.id} className="border-t border-border">
              <td className="p-3"><div className="font-medium">{s.name}</div><div className="text-xs text-muted-foreground">/{s.slug}</div></td>
              {mode === "shops" && <td className="p-3">{s.owner_name ?? "—"}<div className="text-xs text-muted-foreground">{s.owner_email}</div></td>}
              <td className="p-3">{LABEL[s.subscription_status] ?? s.subscription_status}</td>
              {mode !== "shops" && <td className="p-3">{s.plan_id ?? "—"}</td>}
              {mode === "subs" && <><td className="p-3">{d(s.subscription_started_at)}</td><td className="p-3">{d(s.subscription_ends_at)}</td></>}
              {mode === "payments" && <td className="p-3">{s.payment_provider ?? "Não configurado"}</td>}
              {mode === "shops" && (
                <td className="space-x-2 whitespace-nowrap p-3">
                  <Link to="/superadmin/$id" params={{ id: s.id }} className="text-primary">Abrir</Link>
                  {s.subscription_status === "active"
                    ? <button onClick={() => act(s.id, "suspend")} className="text-muted-foreground hover:text-foreground">Suspender</button>
                    : s.subscription_status !== "pending_approval" && <button onClick={() => act(s.id, "reactivate")} className="text-muted-foreground hover:text-foreground">Reativar</button>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
