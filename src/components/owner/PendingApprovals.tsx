import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/** Lista de cadastros aguardando aprovação (somente superadmin; RLS + RPC validam no banco). */
export function PendingApprovals() {
  const [items, setItems] = useState<any[]>([]);
  const load = () =>
    supabase
      .from("barbershops")
      .select("id,name,slug,owner_name,owner_email,owner_phone,created_at")
      .eq("subscription_status", "pending_approval")
      .order("created_at")
      .then(({ data }) => setItems(data ?? []));
  useEffect(() => { load(); }, []);

  const act = async (id: string, action: "approve" | "reject") => {
    const { error } = await supabase.rpc("set_shop_account_status", { _id: id, _action: action });
    if (error) return toast.error("Não foi possível atualizar");
    toast.success(action === "approve" ? "Barbearia aprovada" : "Cadastro recusado");
    load();
  };

  if (items.length === 0) return null;
  return (
    <section className="mb-6 rounded-2xl border border-primary/40 bg-card p-5">
      <h2 className="font-heading text-lg font-semibold">Aguardando aprovação ({items.length})</h2>
      <div className="mt-3 grid gap-2">
        {items.map((b) => (
          <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
            <div className="min-w-0 flex-1">
              <div className="font-medium">{b.name} <span className="text-xs text-muted-foreground">/{b.slug}</span></div>
              <div className="text-xs text-muted-foreground">{b.owner_name} · {b.owner_email} · {b.owner_phone}</div>
            </div>
            <button onClick={() => act(b.id, "approve")} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Aprovar</button>
            <button onClick={() => act(b.id, "reject")} className="rounded-md border border-destructive px-3 py-2 text-sm text-destructive">Recusar</button>
          </div>
        ))}
      </div>
    </section>
  );
}
