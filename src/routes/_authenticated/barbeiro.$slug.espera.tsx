import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateBR, formatPhone } from "@/lib/format";
import { useBarbershopId } from "@/hooks/useBarbershopId";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/barbeiro/$slug/espera")({
  component: WaitlistPage,
});

const STATUS_LABELS: Record<string, string> = {
  aguardando: "Aguardando",
  contatado: "Contatado",
  agendado: "Agendado",
  cancelado: "Cancelado",
};

function WaitlistPage() {
  const { slug } = Route.useParams();
  const barbershopId = useBarbershopId(slug);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!barbershopId) return;
    const { data } = await supabase
      .from("waitlist_entries")
      .select("*")
      .eq("barbershop_id", barbershopId)
      .order("desired_date")
      .order("created_at");
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [barbershopId]);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("waitlist_entries").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold text-foreground">Lista de espera</h1>
      {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {!loading && items.length === 0 && (
        <p className="text-sm text-muted-foreground">Ninguém na lista de espera.</p>
      )}
      <div className="grid gap-2">
        {items.map((w) => (
          <div key={w.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{w.client_name}</div>
              <div className="text-xs text-muted-foreground">
                {formatPhone(w.client_phone)} · quer {formatDateBR(w.desired_date)}
              </div>
            </div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {STATUS_LABELS[w.status] ?? w.status}
            </span>
            {w.status === "aguardando" && (
              <div className="flex gap-1">
                <button
                  onClick={() => setStatus(w.id, "contatado")}
                  className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent/40"
                >
                  Contatar
                </button>
                <button
                  onClick={() => setStatus(w.id, "cancelado")}
                  className="rounded-md border border-border px-2 py-1 text-xs text-rose-500 hover:bg-rose-500/10"
                >
                  Remover
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
