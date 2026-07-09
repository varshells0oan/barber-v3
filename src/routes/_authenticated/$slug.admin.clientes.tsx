import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl, cleanPhone, formatPhone } from "@/lib/format";
import { MessageCircle } from "lucide-react";
import { useBarbershopId } from "@/hooks/useBarbershopId";

export const Route = createFileRoute("/_authenticated/$slug/admin/clientes")({
  component: ClientsPage,
});

const STATUS_COLOR: Record<string, string> = {
  novo: "bg-blue-100 text-blue-800",
  recorrente: "bg-emerald-100 text-emerald-800",
  vip: "bg-cyan-100 text-cyan-800",
  inativo: "bg-slate-100 text-slate-700",
};

function ClientsPage() {
  const { slug } = Route.useParams();
  const barbershopId = useBarbershopId(slug);
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("todos");

  useEffect(() => {
    if (!barbershopId) return;
    supabase
      .from("clients")
      .select("*")
      .eq("barbershop_id", barbershopId)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => setItems(data ?? []));
  }, [barbershopId]);

  const filtered = items.filter((c) => {
    if (status !== "todos" && c.status !== status) return false;
    if (q && !`${c.name} ${c.phone}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Clientes</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome ou telefone"
          className="flex-1 min-w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="todos">Todos</option>
          <option value="novo">Novo</option>
          <option value="recorrente">Recorrente</option>
          <option value="vip">VIP</option>
          <option value="inativo">Inativo</option>
        </select>
      </div>

      <div className="mt-4 grid gap-3">
        {filtered.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[c.status]}`}>
                    {c.status}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">{formatPhone(c.phone)}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {c.visits} visitas · {brl(c.total_spent)} · Última: {c.last_visit ?? "—"}
                </div>
              </div>
              <a
                href={`https://wa.me/55${cleanPhone(c.phone)}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-emerald-100 p-2 text-emerald-700 hover:bg-emerald-200"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum cliente.</p>
        )}
      </div>
    </div>
  );
}
