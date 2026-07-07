import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl, formatDateBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/barbeiro/historico")({
  component: History,
});

function History() {
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase
      .from("appointments")
      .select("*")
      .eq("status", "atendido")
      .order("date", { ascending: false })
      .limit(100)
      .then(({ data }) => setItems(data ?? []));
  }, []);

  const filtered = items.filter((a) =>
    !q || a.client_name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div>
      <h1 className="text-xl font-semibold">Histórico</h1>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar cliente"
        className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <div className="mt-4 grid gap-2">
        {filtered.map((a) => (
          <div key={a.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{a.client_name}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDateBR(a.date)} · {a.time} · {a.service_name}
                </div>
              </div>
              <span className="font-medium text-emerald-600">{brl(a.price)}</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">Nada por aqui.</p>
        )}
      </div>
    </div>
  );
}
